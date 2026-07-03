import "dotenv/config"
import { randomBytes } from "crypto"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { eq } from "drizzle-orm"
import { db } from "./db"
import * as schema from "./db/schema"
import { Role } from "./db/roles"
import { user } from "./db/schema"

// Well-known identifier for the AI agent account — referenced by server/ to
// auto-assign new tickets. Nobody is meant to log in as this account, so its
// password is a random string generated once at seed time and discarded.
export const AI_AGENT_EMAIL = "ai-agent@codewithme.internal"

// Separate auth instance with sign-up enabled — only used here for seeding
const seedAuth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      role: { type: "string", required: true, defaultValue: Role.agent, input: true },
    },
  },
})

async function seedUser(email: string, password: string, name: string, role: Role) {
  const existing = await db.select().from(user).where(eq(user.email, email)).limit(1)
  if (existing.length > 0) {
    console.log(`User ${email} already exists — skipping.`)
    return
  }
  if (password.length < 16) {
    console.error(`Password for ${email} must be at least 16 characters`)
    process.exit(1)
  }
  await seedAuth.api.signUpEmail({ body: { email, password, name } })
  await db.update(user).set({ role }).where(eq(user.email, email))
  console.log(`${role} user created: ${email}`)
}

async function seed() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL
  const adminPassword = process.env.SEED_ADMIN_PASSWORD

  if (!adminEmail || !adminPassword) {
    console.error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env")
    process.exit(1)
  }

  await seedUser(adminEmail, adminPassword, "Admin", Role.admin)

  const agentEmail = process.env.SEED_AGENT_EMAIL
  const agentPassword = process.env.SEED_AGENT_PASSWORD
  if (agentEmail && agentPassword) {
    await seedUser(agentEmail, agentPassword, "Agent", Role.agent)
  }

  await seedUser(AI_AGENT_EMAIL, randomBytes(24).toString("hex"), "AI", Role.agent)

  process.exit(0)
}

seed().catch((err) => {
  console.error("Seed failed:", err.message ?? err)
  process.exit(1)
})
