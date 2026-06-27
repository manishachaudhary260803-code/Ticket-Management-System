---
name: auth-architecture-security
description: Confirmed secure patterns in the auth layer — session validation, CORS, cookie handling, role model
metadata:
  type: project
---

## Confirmed Secure Patterns (as of 2026-06-27)

**Session validation** (`server/app/auth.py`): `get_current_user` does a two-query DB lookup — first the `sessions` table by token, then `users` by `session.user_id`. Expiry is checked with timezone-aware comparison. A deleted user or revoked session is caught immediately. This is correct.

**CORS**: FastAPI (`server/main.py`) restricts `allow_origins` to `CLIENT_URL` env var, defaulting to `http://localhost:5173`. Auth sidecar (`auth/src/index.ts`) restricts origin to `CLIENT_URL`. Both use `allow_credentials=True`. Better Auth `trustedOrigins` is set to `[CLIENT_URL]`.

**Sign-up disabled**: `emailAndPassword.disableSignUp: true` in `auth/src/auth.ts` prevents self-registration. Users created via `auth/src/seed.ts` only.

**Role model**: Role stored as PostgreSQL enum (`admin | agent`), not a free string. Default is `agent`. FastAPI `User` model uses Python enum `Role`.

**`require_admin` dependency**: Correctly wraps `get_current_user` and 403s if `user.role.value != "admin"`. Both dependencies are defined and correct; they just need to be applied to every route as routes are built.

**No raw SQL**: SQLAlchemy ORM used throughout FastAPI — no f-string SQL or string concatenation visible.

**Token lookup**: `Session.token` column has `unique=True` and an index — correct for security and performance.

**Seed script role elevation**: `seed.ts` creates user with default role then elevates via direct `db.update()` — does not rely on the Better Auth API for role assignment.

**AI draft separation**: `ai_draft_reply` stored as a `Ticket` field (not auto-sent). Architecture requires explicit agent action to send.

**Auth dependency files**:
- `server/app/auth.py` — FastAPI deps (`get_current_user`, `require_admin`)
- `auth/src/auth.ts` — Better Auth config
- `auth/src/index.ts` — Express app, mounts Better Auth
- `auth/src/db/schema.ts` — Drizzle schema for auth tables
- `client/src/lib/auth-client.ts` — Better Auth React client
- `client/src/App.tsx` — `ProtectedRoute` + `AdminRoute` components (frontend-only, not security enforcement)
