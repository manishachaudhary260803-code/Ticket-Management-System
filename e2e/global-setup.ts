import { execSync } from "child_process"
import os from "os"
import path from "path"
import { Client } from "pg"
import { TEST_ADMIN, TEST_AGENT } from "./test-credentials"

const ROOT = path.join(__dirname, "..")
const TEST_DB = "ticket_db_test"
const TEST_DB_URL = `postgresql:///${TEST_DB}?host=/var/run/postgresql`
const TEST_AUTH_SECRET = "e2e-test-only-secret-not-for-production"

export default async function globalSetup() {
  await ensureDatabase()
  runMigrations()
  await truncateTables()
  seedUsers()
}

async function ensureDatabase() {
  const client = new Client({ database: "postgres", host: "/var/run/postgresql" })
  await client.connect()
  const { rows } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [TEST_DB])
  if (rows.length === 0) {
    try {
      await client.query(`CREATE DATABASE ${TEST_DB}`)
      console.log(`[setup] Created test database: ${TEST_DB}`)
    } catch (err: any) {
      if (err.code === "42501") {
        const username = os.userInfo().username
        console.log(`[setup] No CREATEDB privilege — attempting: sudo -u postgres psql (enter your sudo password if prompted)`)
        execSync(
          `sudo -u postgres psql -h /var/run/postgresql -p 5432 -c "CREATE DATABASE ${TEST_DB} OWNER ${username}"`,
          { stdio: "inherit" }
        )
        console.log(`[setup] Created test database: ${TEST_DB}`)
      } else {
        throw err
      }
    }
  }
  await client.end()
}

function runMigrations() {
  execSync(`venv/bin/alembic upgrade head`, {
    cwd: path.join(ROOT, "server"),
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: "inherit",
  })
  console.log("[setup] Migrations applied")
}

async function truncateTables() {
  const client = new Client({ connectionString: TEST_DB_URL })
  await client.connect()
  // Truncate in dependency order; CASCADE handles any remaining FK references
  await client.query(`
    TRUNCATE TABLE verifications, accounts, sessions, tickets, users
    RESTART IDENTITY CASCADE
  `)
  await client.end()
  console.log("[setup] Tables truncated")
}

function seedUsers() {
  const sharedEnv = {
    ...process.env,
    DATABASE_URL: TEST_DB_URL,
    BETTER_AUTH_SECRET: TEST_AUTH_SECRET,
    BETTER_AUTH_URL: "http://localhost:3011",
    CLIENT_URL: "http://localhost:5174",
  }

  execSync("npm run seed", {
    cwd: path.join(ROOT, "auth"),
    env: {
      ...sharedEnv,
      SEED_ADMIN_EMAIL: TEST_ADMIN.email,
      SEED_ADMIN_PASSWORD: TEST_ADMIN.password,
      SEED_AGENT_EMAIL: TEST_AGENT.email,
      SEED_AGENT_PASSWORD: TEST_AGENT.password,
    },
    stdio: "inherit",
  })
  console.log("[setup] Test users seeded")
}
