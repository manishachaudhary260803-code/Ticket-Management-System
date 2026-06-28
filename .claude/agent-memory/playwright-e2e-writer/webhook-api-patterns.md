---
name: webhook-api-patterns
description: Patterns for testing server-to-server API endpoints (webhook) that use header-based auth, not user sessions
metadata:
  type: feedback
---

## Testing header-authenticated API endpoints

The webhook endpoint (`POST /api/webhooks/ticket`) uses `X-Webhook-Secret` header auth rather than user sessions. Use Playwright's standalone `request` fixture (not `page.request`) for these calls — it avoids spinning up a browser and does not carry session cookies.

```typescript
test("...", async ({ request }) => {
  const response = await request.post("http://localhost:3010/api/webhooks/ticket", {
    headers: { "X-Webhook-Secret": WEBHOOK_SECRET },
    data: { ... },
  })
  expect(response.status()).toBe(201)
})
```

Use the **full URL** (port 3010) — the `baseURL` in config points to the Vite client (5174), which proxies only authenticated requests; the webhook secret header is a server-to-server concern and should bypass the frontend.

## Mixing request and adminPage in one test (persistence check)

For tests that need both a raw API call AND an authenticated browser request, destructure both fixtures:

```typescript
test("...", async ({ request, adminPage }) => {
  // Webhook call (no session needed)
  const createRes = await request.post(WEBHOOK_URL, { headers: { ... }, data: { ... } })

  // Authenticated GET through Vite proxy — adminPage.request carries session cookie
  const listRes = await adminPage.request.get("/api/tickets")
})
```

`adminPage.request` inherits the browser cookie jar (including `better-auth.session_token`), so it works for protected endpoints accessed through the Vite proxy.

## Cleanup strategy for API-created tickets

Use a sentinel `from_email` (e.g. `webhook-test@e2e.local`) for all tickets created in webhook tests. Register an `afterEach` that deletes by that address:

```typescript
async function deleteWebhookTestTickets() {
  const db = new Client({ connectionString: TEST_DB_URL })
  await db.connect()
  await db.query("DELETE FROM tickets WHERE from_email = $1", [WEBHOOK_TEST_EMAIL])
  await db.end()
}

test.afterEach(async () => {
  await deleteWebhookTestTickets()
})
```

This prevents webhook-created tickets from polluting the "No tickets yet." assertions in `tickets.spec.ts`.

## Adding env vars to test server process

To pass environment variables to the FastAPI test server, add them to the `webServer` env block in `playwright.config.ts`:

```typescript
{
  command: `bash -c "source venv/bin/activate && python main.py"`,
  cwd: path.join(__dirname, "server"),
  env: {
    DATABASE_URL: TEST_DB_URL,
    CLIENT_URL: `http://localhost:${CLIENT_PORT}`,
    PORT: String(SERVER_PORT),
    WEBHOOK_SECRET: "test-webhook-secret-e2e",  // ← added here
  },
}
```

**Why:** The FastAPI process reads env vars at import time (`os.getenv` at module level in `webhooks.py`), so the value must be present when the server starts — it cannot be injected per-test.

## Enum values for ticket fields

- `TicketStatus`: `"open"` | `"in_progress"` | `"resolved"` (str enum, serializes to value string)
- `Priority`: `"low"` | `"medium"` | `"high"`
- `Category`: `"technical_it"` | `"billing_fees"` | `"other"`

All three are `str, enum.Enum` in Python, so Pydantic serializes them as plain strings in JSON responses.

Related: [[tickets-spec-patterns]]
