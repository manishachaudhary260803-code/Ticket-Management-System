import "dotenv/config"
import express from "express"
import cors from "cors"
import { toNodeHandler } from "better-auth/node"
import { auth } from "./auth"

const app = express()
const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:5173"

app.use(
  cors({
    origin: CLIENT_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
)

// Better Auth handles its own body parsing — do not put express.json() before this
app.all("/api/auth/*", toNodeHandler(auth))

app.use(express.json())

const PORT = process.env.PORT ?? 3001
app.listen(PORT, () => {
  console.log(`Auth service running on http://localhost:${PORT}`)
})
