import express from "express"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { eq } from "drizzle-orm"
import { createUserSchema } from "@ticket/core"
import { db } from "../db"
import * as schema from "../db/schema"
import { user, session } from "../db/schema"
import { Role } from "../db/roles"

const router = express.Router()

// Private auth instance with sign-up enabled — only used for admin-driven user creation
const createUserAuth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      role: { type: "string", required: true, defaultValue: "agent", input: true },
    },
  },
})

async function requireAdmin(req: express.Request, res: express.Response): Promise<boolean> {
  const cookieHeader = req.headers.cookie ?? ""
  const token = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("better-auth.session_token="))
    ?.split("=")
    .slice(1)
    .join("=")

  if (!token) { res.status(401).json({ error: "Unauthorized" }); return false }

  // Better Auth appends ".signature" to the cookie value; the DB stores only the token part
  const dbToken = token.split(".")[0]

  const [sess] = await db
    .select({ userId: session.userId, expiresAt: session.expiresAt })
    .from(session)
    .where(eq(session.token, dbToken))
    .limit(1)

  if (!sess || sess.expiresAt < new Date()) { res.status(401).json({ error: "Unauthorized" }); return false }

  const [requestingUser] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, sess.userId))
    .limit(1)

  if (!requestingUser || requestingUser.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return false }

  return true
}

router.post("/", express.json(), async (req, res) => {
  if (!await requireAdmin(req, res)) return

  const parsed = createUserSchema.safeParse(req.body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input"
    res.status(400).json({ error: message }); return
  }
  const { name, email, password, role } = parsed.data

  const existing = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1)
  if (existing.length > 0) { res.status(409).json({ error: "A user with this email already exists" }); return }

  await createUserAuth.api.signUpEmail({ body: { email, password, name } })
  const finalRole = role === "admin" ? Role.admin : Role.agent
  await db.update(user).set({ role: finalRole }).where(eq(user.email, email))

  const [created] = await db.select().from(user).where(eq(user.email, email)).limit(1)
  res.status(201).json(created)
})

export default router
