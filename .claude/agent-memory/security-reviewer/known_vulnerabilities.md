---
name: known-vulnerabilities
description: Security issues found in the initial auth/auth-flow review (2026-06-27) — not yet fixed
metadata:
  type: project
---

## Issues Found in Initial Review (2026-06-27)

### CRITICAL

**C1 — Orphaned admin credentials in Vite bundle**
- File: `client/.env` lines 2-3
- `VITE_SEED_ADMIN_EMAIL=admin@example.com` and `VITE_SEED_ADMIN_PASSWORD=password123` are in the client env file.
- Vite embeds ALL `VITE_*` vars into the public JS bundle at build time.
- These variables are completely unused in any client source file (grepped and confirmed).
- Fix: Delete both lines from `client/.env` and `client/.env.example`. They belong only in `auth/.env`.

### HIGH

**H1 — `role` field `input: true` — privilege escalation risk**
- File: `auth/src/auth.ts` line 21
- Better Auth's `additionalFields` with `input: true` may allow the `role` field to be set via the `updateUser` API endpoint, meaning any authenticated agent could send `{ role: "admin" }` to escalate privileges.
- The seed script does NOT use `input: true` (it writes the role directly to the DB), so this flag serves no purpose.
- Fix: Change `input: true` to `input: false` on the role field.
- Status: UNVERIFIED whether `updateUser` actually accepts additionalFields — but risk is high enough to fix regardless.

**H2 — Weak BETTER_AUTH_SECRET**
- File: `auth/.env` line 2
- Value: `dev-secret-key-change-in-production` — predictable, weak.
- Fix: Generate with `openssl rand -base64 32` and rotate for production.

**H3 — Weak admin seed password**
- File: `auth/.env` line 6: `SEED_ADMIN_PASSWORD=password123`
- Even dev credentials should not be trivially guessable.
- Fix: Use a strong random password in dev; require one in the seed script if below complexity threshold.

### MEDIUM

**M1 — Frontend-only authorization (`AdminRoute`)**
- File: `client/src/App.tsx`
- `AdminRoute` checks `session.user.role !== "admin"` client-side only. Bypassable.
- Not exploitable now (no backend routes exist), but WILL be exploitable if admin routes are added without `require_admin` on the backend.
- Action: When building any admin-only FastAPI route, `require_admin` is mandatory.

**M2 — No SSL in database connection template**
- Files: `server/.env.example`, `auth/.env.example`
- URLs lack `sslmode=require`. Production deployments following these templates will use unencrypted DB connections.
- Fix: Add `?sslmode=require` (or `verify-full`) to production DATABASE_URL.

**M3 — `VITE_AUTH_URL` points directly to auth sidecar port**
- File: `client/.env`: `VITE_AUTH_URL=http://localhost:3001`
- In production, the auth service port should NOT be internet-facing. Auth requests should go through an nginx/CDN proxy at the same origin as the frontend.
- Fix: In production, set `VITE_AUTH_URL` to the same origin as the frontend (e.g., `https://app.example.com`) and proxy `/api/auth/*` internally.

**M4 — No rate limiting on sign-in endpoint**
- File: `auth/src/index.ts`
- No rate limiting on `POST /api/auth/sign-in/email`.
- Fix: Add `express-rate-limit` before the Better Auth handler, or enable Better Auth's built-in rate limiting plugin.

### LOW

**L1 — Unused `SECRET_KEY` in server env**
- File: `server/.env`: `SECRET_KEY=dev-secret-key-change-in-production` — never imported or used.
- Remove to avoid confusion about what cryptographic keys protect the system.

**L2 — Admin credentials in committed `.env.example` files**
- `auth/.env.example` and `client/.env.example` both contain `password123`.
- Replace with placeholder like `<your-strong-password>`.
