---
name: test-infrastructure
description: Fixture file location, auth states exposed, global-setup pattern, test ports, seed mechanism
metadata:
  type: project
---

## Fixture file
`e2e/fixtures.ts` — re-exports `test` (extended) and `expect`.
- `adminPage: Page` — signed in as admin before test body runs
- `agentPage: Page` — signed in as agent before test body runs
- Raw `page` fixture from the extended `test` is unauthenticated

Import pattern in every spec:
```ts
import { test, expect } from "./fixtures"
import { TEST_ADMIN, TEST_AGENT } from "./test-credentials"
```
Never import directly from `@playwright/test`.

## Test credentials
`e2e/test-credentials.ts`
- `TEST_ADMIN`: email `admin@test.local`, password `TestAdmin@Secure2024!`, name `"Test Admin"`, role `"admin"`
- `TEST_AGENT`: email `agent@test.local`, password `TestAgent@Secure2024!`, name `"Test Agent"`, role `"agent"`

## Test ports
| Service | Port |
|---------|------|
| Frontend (Vite) | 5174 |
| Auth (Express + Better Auth) | 3011 |
| Backend (FastAPI) | 3010 |
| baseURL | `http://localhost:5174` |

## Global setup (`e2e/global-setup.ts`)
Order: `ensureDatabase` → `runMigrations` (Alembic) → `truncateTables` → `seedUsers` (via `npm run seed`).
Truncates: `verifications, accounts, sessions, tickets, users` with RESTART IDENTITY CASCADE.

## Global teardown
Empty — cleanup runs at the START of global-setup so state is preserved post-failure for inspection.

## Playwright config
- `fullyParallel: false`, single worker
- No storageState usage — fixtures handle auth state per-test with `page.goto("/login")` sign-in
- retries: 0 locally, 2 in CI
- `forbidOnly` on CI
