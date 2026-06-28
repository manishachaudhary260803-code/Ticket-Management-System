---
name: tickets-spec-patterns
description: Ticket seeding via direct pg INSERT (no create API), selector patterns for TicketsTable, and empty-state/data test ordering for e2e/tickets.spec.ts
metadata:
  type: project
---

## Direct DB seeding pattern (tickets have no create API)

Tickets are ingested only via IMAP — there is no `POST /api/tickets` endpoint.
For the "with data" tests, seed a ticket directly with `pg` inside `test.beforeAll`
scoped to a `test.describe` block, and clean it up in `test.afterAll`.

Key detail: the columns use PostgreSQL enum types, so cast the string parameters:

```sql
INSERT INTO tickets
  (id, subject, body, from_email, from_name, status, priority, category, created_at, updated_at)
VALUES
  ($1, $2, $3, $4, $5, $6::ticketstatus, $7::priority, $8::category, NOW(), NOW())
ON CONFLICT (id) DO NOTHING
```

Connection string used in spec (same as global-setup):
```ts
const TEST_DB_URL = "postgresql:///ticket_db_test?host=/var/run/postgresql"
import { Client } from "pg"
```

## Enum values

| Column   | Type          | Valid values                       |
|----------|---------------|------------------------------------|
| status   | ticketstatus  | open, in_progress, resolved        |
| priority | priority      | low, medium, high                  |
| category | category      | technical_it, billing_fees, other  |

## TicketsTable selectors

- `getByRole("table")` — single table on page, always present (even empty)
- `getByRole("heading", { name: "Tickets" })` — the `<h2>` on TicketsPage (disambiguates from the navbar "Tickets" link which has role="link")
- `getByText("No tickets yet.")` — empty-state `<td colSpan={6}>` cell
- Column headers: Subject, From, Status, Priority, Category, Received
- Status badge text: `status.replace("_", " ")` → "open", "in progress", "resolved"
- Priority badge text: raw enum value → "low", "medium", "high"
- Category label: `technical_it` → "Technical / IT"; `billing_fees` → "Billing / Fees"; `other` → "Other"
- From column: shows `from_name || from_email` as primary; if from_name set, renders from_email below in a smaller span

Use `{ exact: true }` on short badge texts like "open" and "high" to avoid substring matches.

## Test ordering within the spec

Empty-state describe blocks come BEFORE the "with data" describe block.
Global-setup always truncates the tickets table at run start, so empty-state tests
are guaranteed to see 0 rows.  The "with data" block's afterAll deletes its seed row
so it leaves the DB clean for any subsequent test in the same run.

## File location

`e2e/tickets.spec.ts`

## Describe groups

1. "Tickets page — auth gate" — plain `page` fixture, unauthenticated redirect to /login
2. "Tickets page — Navbar link" — admin + agent see "Tickets" link in navbar
3. "Tickets page — empty state" — admin + agent see "No tickets yet." + table present
4. "Tickets page — with data" — beforeAll/afterAll seed + 5 tests covering headers, row fields, agent access, and no-empty-state
