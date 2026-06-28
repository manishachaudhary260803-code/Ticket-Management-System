import "dotenv/config"
import express from "express"
import cors from "cors"
import rateLimit from "express-rate-limit"
import { toNodeHandler } from "better-auth/node"
import { z } from "zod"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { eq } from "drizzle-orm"
import { auth } from "./auth"
import { db } from "./db"
import * as schema from "./db/schema"
import { user, session } from "./db/schema"
import { Role } from "./db/roles"

const secret = process.env.BETTER_AUTH_SECRET ?? ""
if (!secret || secret.includes("dev-secret") || secret.includes("change-this")) {
  console.error("FATAL: BETTER_AUTH_SECRET is not set to a production-safe value. Generate one with: openssl rand -base64 32")
  process.exit(1)
}

const app = express()
const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:5173"

app.use(
  cors({
    origin: CLIENT_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
)

const signInLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again later." },
})

app.use("/api/auth/sign-in", signInLimiter)

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(3, "Email must be at least 3 characters").email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["agent", "admin"]).default("agent"),
})

// Private auth instance for admin-driven user creation (mirrors seed.ts pattern)
const createUserAuth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      role: { type: "string", required: true, defaultValue: "agent", input: true },
    },
  },
})

app.post("/api/auth/admin/create-user", express.json(), async (req, res) => {
  const cookieHeader = req.headers.cookie ?? ""
  const token = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("better-auth.session_token="))
    ?.split("=")
    .slice(1)
    .join("=")

  if (!token) { res.status(401).json({ error: "Unauthorized" }); return }

  // Better Auth appends ".signature" to the cookie value; the DB stores only the token part
  const dbToken = token.split(".")[0]

  const [sess] = await db
    .select({ userId: session.userId, expiresAt: session.expiresAt })
    .from(session)
    .where(eq(session.token, dbToken))
    .limit(1)

  if (!sess || sess.expiresAt < new Date()) { res.status(401).json({ error: "Unauthorized" }); return }

  const [requestingUser] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, sess.userId))
    .limit(1)

  if (!requestingUser || requestingUser.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return }

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

// Better Auth handles its own body parsing — do not put express.json() before this
app.all("/api/auth/*", toNodeHandler(auth))

app.use(express.json())

const PORT = process.env.PORT ?? 3001
app.listen(PORT, () => {
  console.log(`Auth service running on http://localhost:${PORT}`)
})
