/**
 * Auth E2E tests — covers server-side login errors, successful sign-in,
 * session persistence, protected-route redirects, role-based access,
 * and sign-out.
 *
 * Client-side form validation (empty fields, invalid email format) is covered
 * by LoginPage component tests and does not belong here.
 *
 * NOTE: The root/server error paragraph is selected via
 * `p.text-sm.text-destructive` (the `bg-destructive/10` container).
 * Adding `data-testid="login-root-error"` to that element in LoginPage.tsx
 * would make the selector fully semantic and independent of Tailwind classes.
 */

import { test, expect } from "./fixtures"
import { TEST_ADMIN, TEST_AGENT } from "./test-credentials"

// ---------------------------------------------------------------------------
// Login — server-side errors (require real Better Auth service)
// ---------------------------------------------------------------------------

test.describe("Login — server-side errors", () => {
  test("correct email with wrong password shows server error message", async ({ page }) => {
    await page.goto("/login")

    await page.locator("#email").fill(TEST_ADMIN.email)
    await page.locator("#password").fill("WrongPassword123!")
    await page.getByRole("button", { name: "Sign in" }).click()

    // Root/server error is rendered as `p.text-sm.text-destructive` with
    // the `bg-destructive/10` background — distinct from field errors (`text-xs`).
    // Adding data-testid="login-root-error" to LoginPage.tsx would improve this.
    await expect(page.locator("p.text-sm.text-destructive")).toBeVisible()
    // No redirect — still on login page
    await expect(page).toHaveURL("/login")
  })

  test("non-existent email shows server error message", async ({ page }) => {
    await page.goto("/login")

    await page.locator("#email").fill("nobody@example.com")
    await page.locator("#password").fill("SomePassword123!")
    await page.getByRole("button", { name: "Sign in" }).click()

    await expect(page.locator("p.text-sm.text-destructive")).toBeVisible()
    await expect(page).toHaveURL("/login")
  })
})

// ---------------------------------------------------------------------------
// Successful login
// ---------------------------------------------------------------------------

test.describe("Successful login", () => {
  test("admin signs in → redirected to /, name shown, Users link visible", async ({ page }) => {
    await page.goto("/login")

    await page.locator("#email").fill(TEST_ADMIN.email)
    await page.locator("#password").fill(TEST_ADMIN.password)
    await page.getByRole("button", { name: "Sign in" }).click()
    await page.waitForURL("/")

    // Navbar shows the signed-in user's name
    await expect(page.getByText(TEST_ADMIN.name)).toBeVisible()
    // Admin-only Users link is present
    await expect(page.getByRole("link", { name: "Users" })).toBeVisible()
  })

  test("agent signs in → redirected to /, name shown, no Users link", async ({ page }) => {
    await page.goto("/login")

    await page.locator("#email").fill(TEST_AGENT.email)
    await page.locator("#password").fill(TEST_AGENT.password)
    await page.getByRole("button", { name: "Sign in" }).click()
    await page.waitForURL("/")

    await expect(page.getByText(TEST_AGENT.name)).toBeVisible()
    // Users link must NOT appear for a non-admin role
    await expect(page.getByRole("link", { name: "Users" })).not.toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Session persistence
// ---------------------------------------------------------------------------

test.describe("Session persistence", () => {
  test("session survives a full page reload", async ({ page }) => {
    await page.goto("/login")

    await page.locator("#email").fill(TEST_ADMIN.email)
    await page.locator("#password").fill(TEST_ADMIN.password)
    await page.getByRole("button", { name: "Sign in" }).click()
    await page.waitForURL("/")

    // Hard reload — cookie must survive
    await page.reload()

    // ProtectedRoute should keep us on / without redirecting to /login
    await expect(page).toHaveURL("/")
    await expect(page.getByText(TEST_ADMIN.name)).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Protected-route redirects (unauthenticated access)
// ---------------------------------------------------------------------------

test.describe("Protected route redirects", () => {
  test("unauthenticated user visiting / is redirected to /login", async ({ page }) => {
    await page.goto("/")
    await page.waitForURL("/login")
    await expect(page).toHaveURL("/login")
  })

  test("unauthenticated user visiting /users is redirected to /login", async ({ page }) => {
    await page.goto("/users")
    await page.waitForURL("/login")
    await expect(page).toHaveURL("/login")
  })
})

// ---------------------------------------------------------------------------
// Role-based access
// ---------------------------------------------------------------------------

test.describe("Role-based access", () => {
  test("agent navigating to /users is redirected to / (not /login)", async ({ agentPage }) => {
    // The agentPage fixture has already signed the agent in and landed on /.
    // AdminRoute should redirect a non-admin to / — not to /login.
    await agentPage.goto("/users")
    await agentPage.waitForURL("/")

    await expect(agentPage).toHaveURL("/")
    // Confirm we are on the home page, not the login page
    await expect(agentPage.getByRole("button", { name: "Sign out" })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Sign out
// ---------------------------------------------------------------------------

test.describe("Sign out", () => {
  test("signing out clears the session and subsequent navigation to / redirects to /login", async ({
    adminPage,
  }) => {
    // Verify we start authenticated
    await expect(adminPage).toHaveURL("/")
    await expect(adminPage.getByText(TEST_ADMIN.name)).toBeVisible()

    // Trigger sign-out via the navbar button
    await adminPage.getByRole("button", { name: "Sign out" }).click()
    await adminPage.waitForURL("/login")
    await expect(adminPage).toHaveURL("/login")

    // Confirm the session is truly gone — navigating to a protected route
    // must redirect back to /login rather than serving the page.
    await adminPage.goto("/")
    await adminPage.waitForURL("/login")
    await expect(adminPage).toHaveURL("/login")
  })
})
