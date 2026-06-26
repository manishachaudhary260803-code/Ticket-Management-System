import "dotenv/config"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { eq } from "drizzle-orm"
import { db } from "./db"
import * as schema from "./db/schema"
import { Role } from "./db/roles"
import { user } from "./db/schema"

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

async function seed() {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD

  if (!email || !password) {
    console.error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env")
    process.exit(1)
  }

  const existing = await db.select().from(user).where(eq(user.email, email)).limit(1)
  if (existing.length > 0) {
    console.log(`User ${email} already exists — skipping.`)
    process.exit(0)
  }

  await seedAuth.api.signUpEmail({
    body: { email, password, name: "Admin" },
  })

  await db.update(user).set({ role: Role.admin }).where(eq(user.email, email))

  console.log(`Admin user created: ${email}`)
  process.exit(0)
}

seed().catch((err) => {
  console.error("Seed failed:", err.message ?? err)
  process.exit(1)
})
