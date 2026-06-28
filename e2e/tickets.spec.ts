/**
 * Tickets page — E2E tests covering the auth gate, role-based access,
 * empty state, and table data rendering.
 *
 * Ticket seeding
 * --------------
 * The IMAP poller does not run during tests (env vars are not set).
 * The "with data" describe block inserts one ticket directly via pg in
 * beforeAll and removes it in afterAll.  Global setup truncates the tickets
 * table at the start of every run, so all earlier blocks see an empty table.
 *
 * Selector strategy
 * -----------------
 * TicketsTable renders a plain <table> with no data-testid attributes.
 * All assertions use semantic selectors (getByRole, getByText) so the tests
 * remain resilient to Tailwind class changes.
 */

import { test, expect } from "./fixtures"
import { Client } from "pg"

const TEST_DB_URL = "postgresql:///ticket_db_test?host=/var/run/postgresql"

/**
 * Deterministic row used by the "with data" suite.
 * Inserted in beforeAll, deleted in afterAll.
 */
const SEED_TICKET = {
  id: "e2e-ticket-0001-0000-0000-000000000001",
  subject: "Cannot access my student account",
  body: "I have been trying to log in for three days but keep getting an error.",
  from_email: "alice@example.com",
  from_name: "Alice Student",
  status: "open",
  priority: "high",
  category: "technical_it",
}

// ---------------------------------------------------------------------------
// Auth gate
// ---------------------------------------------------------------------------

test.describe("Tickets page — auth gate", () => {
  test("unauthenticated user visiting /tickets is redirected to /login", async ({ page }) => {
    await page.goto("/tickets")
    await page.waitForURL("/login")
    await expect(page).toHaveURL("/login")
  })
})

// ---------------------------------------------------------------------------
// Navbar link
// ---------------------------------------------------------------------------

test.describe("Tickets page — Navbar link", () => {
  test("Tickets link is visible in the navbar for admin", async ({ adminPage }) => {
    await adminPage.goto("/")
    await expect(adminPage.getByRole("link", { name: "Tickets" })).toBeVisible()
  })

  test("Tickets link is visible in the navbar for agent", async ({ agentPage }) => {
    await agentPage.goto("/")
    await expect(agentPage.getByRole("link", { name: "Tickets" })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Empty state
// Global setup truncates the tickets table before each run, so these tests
// are guaranteed to see an empty list.
// ---------------------------------------------------------------------------

test.describe("Tickets page — empty state", () => {
  test("admin sees the table and 'No tickets yet.' when no tickets exist", async ({
    adminPage,
  }) => {
    await adminPage.goto("/tickets")

    // Page heading confirms we landed on the right page
    await expect(adminPage.getByRole("heading", { name: "Tickets" })).toBeVisible()

    // The table element is always rendered, even when empty
    await expect(adminPage.getByRole("table")).toBeVisible()

    // Empty-state message appears inside the table body
    await expect(adminPage.getByText("No tickets yet.")).toBeVisible()
  })

  test("agent sees the table and 'No tickets yet.' when no tickets exist", async ({
    agentPage,
  }) => {
    await agentPage.goto("/tickets")

    await expect(agentPage.getByRole("heading", { name: "Tickets" })).toBeVisible()
    await expect(agentPage.getByRole("table")).toBeVisible()
    await expect(agentPage.getByText("No tickets yet.")).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// With seeded ticket data
// ---------------------------------------------------------------------------

test.describe("Tickets page — with data", () => {
  test.beforeAll(async () => {
    const db = new Client({ connectionString: TEST_DB_URL })
    await db.connect()
    await db.query(
      `INSERT INTO tickets
         (id, subject, body, from_email, from_name, status, priority, category, created_at, updated_at)
       VALUES
         ($1, $2, $3, $4, $5, $6::ticketstatus, $7::priority, $8::category, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [
        SEED_TICKET.id,
        SEED_TICKET.subject,
        SEED_TICKET.body,
        SEED_TICKET.from_email,
        SEED_TICKET.from_name,
        SEED_TICKET.status,
        SEED_TICKET.priority,
        SEED_TICKET.category,
      ],
    )
    await db.end()
  })

  test.afterAll(async () => {
    const db = new Client({ connectionString: TEST_DB_URL })
    await db.connect()
    await db.query("DELETE FROM tickets WHERE id = $1", [SEED_TICKET.id])
    await db.end()
  })

  test("table renders all six column headers", async ({ adminPage }) => {
    await adminPage.goto("/tickets")

    const table = adminPage.getByRole("table")
    await expect(table).toBeVisible()

    for (const header of ["Subject", "From", "Status", "Priority", "Category", "Received"]) {
      await expect(table.getByText(header)).toBeVisible()
    }
  })

  test("ticket row displays subject, sender name, email, status badge, priority badge, and category label", async ({
    adminPage,
  }) => {
    await adminPage.goto("/tickets")

    // Subject column
    await expect(adminPage.getByText(SEED_TICKET.subject)).toBeVisible()

    // From column: from_name is the primary text; from_email appears below it
    await expect(adminPage.getByText(SEED_TICKET.from_name)).toBeVisible()
    await expect(adminPage.getByText(SEED_TICKET.from_email)).toBeVisible()

    // Status badge — "open" is rendered by status.replace("_", " ")
    await expect(adminPage.getByText("open", { exact: true })).toBeVisible()

    // Priority badge — "high" is rendered as-is
    await expect(adminPage.getByText("high", { exact: true })).toBeVisible()

    // Category label — "technical_it" maps to "Technical / IT"
    await expect(adminPage.getByText("Technical / IT")).toBeVisible()
  })

  test("agent can access /tickets and sees the same ticket data", async ({ agentPage }) => {
    await agentPage.goto("/tickets")

    await expect(agentPage.getByRole("table")).toBeVisible()
    await expect(agentPage.getByText(SEED_TICKET.subject)).toBeVisible()
    await expect(agentPage.getByText("open", { exact: true })).toBeVisible()
    await expect(agentPage.getByText("Technical / IT")).toBeVisible()
  })

  test("'No tickets yet.' is not visible when tickets exist", async ({ adminPage }) => {
    await adminPage.goto("/tickets")

    // Wait for real data to load first to rule out a timing race with the skeleton
    await expect(adminPage.getByText(SEED_TICKET.subject)).toBeVisible()
    await expect(adminPage.getByText("No tickets yet.")).not.toBeVisible()
  })
})
