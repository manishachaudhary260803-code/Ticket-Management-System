# Ticket Management System

AI-powered support ticket system that auto-classifies, routes, and drafts replies for student support emails.

## Stack

**Frontend** (`client/`)
- React 19 + TypeScript 6 + Vite 8
- Tailwind CSS v4 (Vite plugin — no PostCSS config needed)
- React Router v7
- **axios** for all HTTP requests — always pass `{ withCredentials: true }` so the session cookie is sent
- **TanStack Query** (`@tanstack/react-query`) for all server state — use `useQuery` for fetches; `QueryClientProvider` is mounted in `main.tsx`

**Auth sidecar** (`auth/`)
- Express.js + Better Auth v1 + Drizzle ORM + `pg`
- Runs on port 3001; sign-up is disabled — users are seeded via `auth/src/seed.ts`

**Backend** (`server/`)
- FastAPI + Uvicorn
- SQLAlchemy (ORM) + Alembic (migrations)
- PostgreSQL (`psycopg2-binary`)

## Dev Commands

```bash
# Frontend
cd client && npm run dev       # http://localhost:5173
cd client && npm run build
cd client && npm run lint      # oxlint

# Auth sidecar
cd auth && npm run dev         # http://localhost:3001
cd auth && npm run seed        # seed initial admin/agent users

# Backend
cd server && source venv/bin/activate
python main.py                 # http://localhost:3000
alembic upgrade head           # run migrations
```

## Architecture

```
client/src/          React app
  lib/auth-client.ts createAuthClient() — points at VITE_AUTH_URL (proxied to :3001)
auth/src/
  auth.ts            Better Auth config (emailAndPassword, role field, trustedOrigins)
  index.ts           Express app — mounts Better Auth at /api/auth/*
  db/schema.ts       Drizzle schema: users, sessions, accounts, verifications tables
  seed.ts            Creates initial admin/agent users
server/app/
  auth.py            get_current_user + require_admin FastAPI dependencies
  models/            SQLAlchemy models (user.py, ticket.py, session.py)
  database.py        DB session / engine setup
server/main.py       FastAPI entrypoint + CORS config
server/alembic/      Migration scripts
```

## Domain Model

**Users:** Admin and Agent roles only. Students never log in — they interact via email only.

**Ticket lifecycle:** Open → In Progress → Resolved. Agents can flag priority (no SLA timers).

**Ticket categories:** Technical/IT · Billing/Fees · Other

**Email:** IMAP inbound, SMTP outbound. Student replies thread back by email thread ID.

## AI Features

- Auto-classify ticket on arrival
- Auto-assign agent based on category
- AI summary per ticket
- AI draft reply — agent must review and approve before sending (never fully automatic)
- Knowledgebase: manual articles + uploaded PDFs

## Authentication

Three services share one PostgreSQL database:

| Service | Port | Role |
|---------|------|------|
| `auth/` (Express + Better Auth) | 3001 | Issues/validates sessions, owns auth tables |
| `server/` (FastAPI) | 3000 | Business logic; verifies sessions via DB |
| `client/` (Vite) | 5173 | Proxies `/api/auth/*` → 3001, `/api/*` → 3000 |

**Session flow:**
1. Client calls `authClient.signIn.email()` → hits `/api/auth/sign-in/email` → proxied to Better Auth on 3001
2. Better Auth sets `better-auth.session_token` cookie
3. FastAPI reads that cookie (or `Authorization: Bearer <token>`) and queries the `sessions` table directly — no HTTP call to the auth service

**FastAPI auth dependencies** (`server/app/auth.py`):
- `get_current_user` — validates token, returns `User`
- `require_admin` — wraps `get_current_user`, 403s if `user.role != "admin"`

**DB tables owned by Better Auth:** `users`, `sessions`, `accounts`, `verifications`
- Passwords are in `accounts.password` (not `users`)
- Roles are a PostgreSQL enum: `admin` | `agent`
- Sign-up is disabled — create users via `cd auth && npm run seed`

**Client auth client** (`client/src/lib/auth-client.ts`): `createAuthClient({ baseURL: VITE_AUTH_URL })`

## Key Constraints

- No student-facing portal — email only
- Auth is email + password (Better Auth sessions, not JWT)
- AI draft replies require human approval before sending
- Dashboard metrics: ticket volume over time, open vs resolved counts, tickets by category, agent workload
- Notifications: email to assigned agent when a ticket is assigned

## E2E Testing

Playwright tests live in `e2e/`. Infrastructure is in place — use the **playwright-e2e-writer** agent to generate tests after implementing any significant feature or UI change.

**Test database:** `ticket_db_test` (separate from `ticket_db`). Must exist before running tests:
```bash
sudo -u postgres psql -c "CREATE DATABASE ticket_db_test OWNER enjay"
```
Global setup handles schema migrations and seeding automatically.

**Test ports (never conflict with dev):**

| Service | Dev | Test |
|---------|-----|------|
| Client (Vite) | 5173 | 5174 |
| Auth (Express) | 3001 | 3011 |
| FastAPI | 3000 | 3010 |

**Run commands:**
```bash
npm run test:e2e           # headless
npm run test:e2e:ui        # Playwright UI mode
npm run test:e2e:headed    # visible browser
npm run test:e2e:report    # open HTML report
```

**Writing tests — always follow these conventions:**
- Import `test` and `expect` from `e2e/fixtures.ts` (not directly from `@playwright/test`)
- Use `adminPage` / `agentPage` fixtures — they sign in automatically before the test body
- Use `TEST_ADMIN` / `TEST_AGENT` from `e2e/test-credentials.ts` for any credential references; never hardcode

**When to invoke the playwright-e2e-writer agent:** After completing a new page, user flow, auth change, or API endpoint. The agent reads the existing fixtures and credentials convention and generates tests that conform to the project patterns.

## Fetching Up-to-Date Documentation

Use the **context7** MCP server to pull current docs before working with any library:

```
# Examples — resolve library ID first, then fetch docs
mcp__context7__resolve-library-id  →  mcp__context7__query-docs

Key libraries to always fetch fresh docs for:
- fastapi
- sqlalchemy / alembic
- react-router (v7 has breaking changes vs v6)
- tailwindcss (v4 config differs significantly from v3)
- vite
- better-auth
- drizzle-orm
- axios
- @tanstack/react-query
```

Prefer context7 over training-data recall for any API surface, config format, or migration guide — especially for Tailwind v4, React Router v7, and React 19, which all have recent breaking changes.
