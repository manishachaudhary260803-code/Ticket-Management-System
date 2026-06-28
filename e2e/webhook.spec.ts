/**
 * Webhook endpoint — E2E tests for POST /api/webhooks/ticket
 *
 * These are pure API tests. They use Playwright's `request` fixture to call
 * the FastAPI test server at port 3010 directly — no browser navigation.
 *
 * Auth model for this endpoint:
 *   - Callers prove identity via X-Webhook-Secret header, NOT user sessions.
 *   - The WEBHOOK_SECRET value "test-webhook-secret-e2e" is injected into the
 *     test FastAPI process via playwright.config.ts webServer env.
 *
 * Test 8 (persistence check) additionally uses `adminPage.request` to call
 * GET /api/tickets through the Vite proxy, which forwards the admin session
 * cookie so the protected list endpoint returns data.
 *
 * Cleanup strategy:
 *   All tests that create tickets use WEBHOOK_TEST_EMAIL as from_email.
 *   afterEach deletes every ticket with that address so subsequent test suites
 *   (e.g. tickets.spec.ts "No tickets yet." assertions) start with a clean slate.
 */

import { test, expect } from "./fixtures"
import { Client } from "pg"

const TEST_DB_URL = "postgresql:///ticket_db_test?host=/var/run/postgresql"

// Direct URL to the FastAPI test server — bypasses the Vite proxy intentionally,
// because webhooks are a server-to-server call and should not depend on the frontend.
const WEBHOOK_URL = "http://localhost:3010/api/webhooks/ticket"
const WEBHOOK_SECRET = "test-webhook-secret-e2e"

// Sentinel email used only by this spec so cleanup is safe and surgical.
const WEBHOOK_TEST_EMAIL = "webhook-test@e2e.local"

async function deleteWebhookTestTickets() {
  const db = new Client({ connectionString: TEST_DB_URL })
  await db.connect()
  await db.query("DELETE FROM tickets WHERE from_email = $1", [WEBHOOK_TEST_EMAIL])
  await db.end()
}

test.describe("POST /api/webhooks/ticket", () => {
  test.afterEach(async () => {
    await deleteWebhookTestTickets()
  })

  // ---------------------------------------------------------------------------
  // Happy paths
  // ---------------------------------------------------------------------------

  test("valid payload with all fields returns 201 and correct response shape", async ({
    request,
  }) => {
    const response = await request.post(WEBHOOK_URL, {
      headers: { "X-Webhook-Secret": WEBHOOK_SECRET },
      data: {
        subject: "Billing issue with my account",
        body: "I was charged twice for last month's tuition.",
        from_email: WEBHOOK_TEST_EMAIL,
        from_name: "Eve Student",
        priority: "high",
        category: "billing_fees",
      },
    })

    expect(response.status()).toBe(201)

    const body = await response.json()
    expect(typeof body.id).toBe("string")
    expect(body.id.length).toBeGreaterThan(0)
    expect(body.subject).toBe("Billing issue with my account")
    expect(body.status).toBe("open")
    expect(body.priority).toBe("high")
    expect(body.category).toBe("billing_fees")
    expect(body.from_email).toBe(WEBHOOK_TEST_EMAIL)
    expect(body.from_name).toBe("Eve Student")
  })

  test("valid payload with only required fields defaults priority to low and category to other", async ({
    request,
  }) => {
    const response = await request.post(WEBHOOK_URL, {
      headers: { "X-Webhook-Secret": WEBHOOK_SECRET },
      data: {
        subject: "General inquiry about enrollment",
        body: "I have a question about my course registration.",
        from_email: WEBHOOK_TEST_EMAIL,
        // from_name intentionally omitted
        // priority intentionally omitted — should default to "low"
        // category intentionally omitted — should default to "other"
      },
    })

    expect(response.status()).toBe(201)

    const body = await response.json()
    expect(body.subject).toBe("General inquiry about enrollment")
    expect(body.status).toBe("open")
    expect(body.priority).toBe("low")
    expect(body.category).toBe("other")
    expect(body.from_name).toBeNull()
  })

  // ---------------------------------------------------------------------------
  // Auth failures
  // ---------------------------------------------------------------------------

  test("wrong X-Webhook-Secret header returns 401", async ({ request }) => {
    const response = await request.post(WEBHOOK_URL, {
      headers: { "X-Webhook-Secret": "totally-wrong-secret" },
      data: {
        subject: "Should be rejected",
        body: "This request has an incorrect secret.",
        from_email: WEBHOOK_TEST_EMAIL,
      },
    })

    expect(response.status()).toBe(401)
  })

  test("missing X-Webhook-Secret header entirely returns 401", async ({ request }) => {
    const response = await request.post(WEBHOOK_URL, {
      // No X-Webhook-Secret header — header is absent, not just wrong
      data: {
        subject: "Should be rejected",
        body: "This request has no secret header at all.",
        from_email: WEBHOOK_TEST_EMAIL,
      },
    })

    expect(response.status()).toBe(401)
  })

  // ---------------------------------------------------------------------------
  // Validation failures (422)
  // ---------------------------------------------------------------------------

  test("blank subject (whitespace-only) returns 422", async ({ request }) => {
    const response = await request.post(WEBHOOK_URL, {
      headers: { "X-Webhook-Secret": WEBHOOK_SECRET },
      data: {
        subject: "   ",
        body: "Body text is fine.",
        from_email: WEBHOOK_TEST_EMAIL,
      },
    })

    expect(response.status()).toBe(422)
  })

  test("invalid from_email address returns 422", async ({ request }) => {
    const response = await request.post(WEBHOOK_URL, {
      headers: { "X-Webhook-Secret": WEBHOOK_SECRET },
      data: {
        subject: "Valid subject",
        body: "Valid body.",
        from_email: "not-a-valid-email",
      },
    })

    expect(response.status()).toBe(422)
  })

  test("unrecognised priority enum value returns 422", async ({ request }) => {
    const response = await request.post(WEBHOOK_URL, {
      headers: { "X-Webhook-Secret": WEBHOOK_SECRET },
      data: {
        subject: "Valid subject",
        body: "Valid body.",
        from_email: WEBHOOK_TEST_EMAIL,
        priority: "urgent", // not a valid Priority enum value
      },
    })

    expect(response.status()).toBe(422)
  })

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  test("created ticket is returned by GET /api/tickets for an authenticated admin", async ({
    request,
    adminPage,
  }) => {
    const subject = "Webhook persistence check — should appear in ticket list"

    // Step 1: create the ticket via webhook (direct API call, no browser)
    const createResponse = await request.post(WEBHOOK_URL, {
      headers: { "X-Webhook-Secret": WEBHOOK_SECRET },
      data: {
        subject,
        body: "Verifying that this ticket is persisted and visible via the list endpoint.",
        from_email: WEBHOOK_TEST_EMAIL,
        priority: "medium",
        category: "technical_it",
      },
    })
    expect(createResponse.status()).toBe(201)
    const created = await createResponse.json()
    expect(created.id).toBeTruthy()

    // Step 2: fetch the ticket list through the Vite proxy using the admin session.
    // adminPage.request inherits the browser's cookie jar, so the
    // better-auth.session_token cookie is sent and the protected endpoint responds.
    const listResponse = await adminPage.request.get("/api/tickets")
    expect(listResponse.status()).toBe(200)

    const tickets: Array<{ id: string; subject: string }> = await listResponse.json()
    const found = tickets.find((t) => t.id === created.id)
    expect(found).toBeDefined()
    expect(found!.subject).toBe(subject)
  })
})
