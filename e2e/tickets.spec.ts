/**
 * Tickets page — E2E tests.
 *
 * Only flows that require all three running services live here.
 * Component rendering, empty-state display, table structure, and row
 * data formatting are covered by TicketsPage component tests.
 */

import { test, expect } from "./fixtures"

// ---------------------------------------------------------------------------
// Auth gate — requires real session/routing (cannot be a component test)
// ---------------------------------------------------------------------------

test.describe("Tickets page — auth gate", () => {
  test("unauthenticated user visiting /tickets is redirected to /login", async ({ page }) => {
    await page.goto("/tickets")
    await page.waitForURL("/login")
    await expect(page).toHaveURL("/login")
  })
})
