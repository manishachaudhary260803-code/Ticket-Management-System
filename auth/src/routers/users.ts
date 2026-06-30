import express from "express"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { eq, sql } from "drizzle-orm"
import { createUserSchema, editUserSchema } from "@ticket/core"
import { hashPassword } from "@better-auth/utils/password"
import { db } from "../db"
import * as schema from "../db/schema"
import { user, session, account } from "../db/schema"
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

  const { user: newUser } = await createUserAuth.api.signUpEmail({ body: { email, password, name } })
  const finalRole = role === "admin" ? Role.admin : Role.agent
  await db.update(user).set({ role: finalRole }).where(eq(user.id, newUser.id))

  const [created] = await db.select().from(user).where(eq(user.id, newUser.id)).limit(1)
  res.status(201).json(created)
})

router.patch("/:id", express.json(), async (req, res) => {
  if (!await requireAdmin(req, res)) return

  const { id } = req.params
  const parsed = editUserSchema.safeParse(req.body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input"
    res.status(400).json({ error: message }); return
  }
  const { name, email, password, role } = parsed.data

  const [target] = await db.select({ id: user.id }).from(user).where(eq(user.id, id)).limit(1)
  if (!target) { res.status(404).json({ error: "User not found" }); return }

  // Check email uniqueness only if it changed
  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1)
  if (existing && existing.id !== id) { res.status(409).json({ error: "A user with this email already exists" }); return }

  const finalRole = role === "admin" ? Role.admin : Role.agent
  await db.update(user).set({ name, email, role: finalRole, updatedAt: new Date() }).where(eq(user.id, id))

  if (password) {
    const hashed = await hashPassword(password)
    await db.update(account).set({ password: hashed }).where(eq(account.userId, id))
  }

  const [updated] = await db.select().from(user).where(eq(user.id, id)).limit(1)
  res.status(200).json(updated)
})

router.delete("/:id", async (req, res) => {
  if (!await requireAdmin(req, res)) return

  const { id } = req.params
  const [target] = await db
    .select({ id: user.id, role: user.role, deletedAt: user.deletedAt })
    .from(user)
    .where(eq(user.id, id))
    .limit(1)

  if (!target || target.deletedAt !== null) { res.status(404).json({ error: "User not found" }); return }
  if (target.role === "admin") { res.status(403).json({ error: "Admin users cannot be deleted" }); return }

  await db.update(user).set({ deletedAt: new Date() }).where(eq(user.id, id))
  await db.execute(sql`UPDATE tickets SET assignee_id = NULL WHERE assignee_id = ${id}`)
  res.status(200).json({ success: true })
})

export default router
