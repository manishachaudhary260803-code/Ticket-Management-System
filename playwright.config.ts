import { defineConfig, devices } from "@playwright/test"
import path from "path"

const AUTH_PORT = 3011
const SERVER_PORT = 3010
const CLIENT_PORT = 5174

const TEST_DB_URL = "postgresql:///ticket_db_test?host=/var/run/postgresql"
const TEST_AUTH_SECRET = "e2e-test-only-secret-not-for-production"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    baseURL: `http://localhost:${CLIENT_PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",

  webServer: [
    {
      command: "npm run dev",
      cwd: path.join(__dirname, "auth"),
      port: AUTH_PORT,
      reuseExistingServer: !process.env.CI,
      env: {
        DATABASE_URL: TEST_DB_URL,
        BETTER_AUTH_SECRET: TEST_AUTH_SECRET,
        BETTER_AUTH_URL: `http://localhost:${AUTH_PORT}`,
        CLIENT_URL: `http://localhost:${CLIENT_PORT}`,
        PORT: String(AUTH_PORT),
      },
    },
    {
      command: `bash -c "source venv/bin/activate && python main.py"`,
      cwd: path.join(__dirname, "server"),
      port: SERVER_PORT,
      reuseExistingServer: !process.env.CI,
      env: {
        DATABASE_URL: TEST_DB_URL,
        CLIENT_URL: `http://localhost:${CLIENT_PORT}`,
        PORT: String(SERVER_PORT),
        WEBHOOK_SECRET: "test-webhook-secret-e2e",
      },
    },
    {
      command: "npm run dev -- --mode test",
      cwd: path.join(__dirname, "client"),
      port: CLIENT_PORT,
      reuseExistingServer: !process.env.CI,
    },
  ],
})
