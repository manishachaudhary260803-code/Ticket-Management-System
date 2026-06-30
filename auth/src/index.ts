import "dotenv/config"
import express from "express"
import cors from "cors"
import rateLimit from "express-rate-limit"
import { toNodeHandler } from "better-auth/node"
import { auth } from "./auth"
import usersRouter from "./routers/users"
import polishRouter from "./routers/polish"

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

// Admin user management — must be registered before the Better Auth wildcard
app.use("/api/auth/admin/users", usersRouter)

// AI features — must be registered before the Better Auth wildcard
app.use("/api/auth/ai/polish-reply", express.json(), polishRouter)

// Better Auth handles its own body parsing — do not put express.json() before this
app.all("/api/auth/*", toNodeHandler(auth))

app.use(express.json())

const PORT = process.env.PORT ?? 3001
app.listen(PORT, () => {
  console.log(`Auth service running on http://localhost:${PORT}`)
})
