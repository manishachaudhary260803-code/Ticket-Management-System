# Deploying to Railway

This app deploys as **4 Railway resources in one project**: a managed Postgres
database, and three Dockerfile-based services (`server`, `auth`, `client`).

## Architecture

```
                    ┌──────────────────────────┐
 Browser  ────────► │  client  (public domain)  │
                    │  nginx: static build +    │
                    │  reverse proxy            │
                    └───────────┬───────────────┘
                                │ Railway private network
                    ┌───────────┼───────────────┐
                    ▼                           ▼
            ┌───────────────┐           ┌───────────────┐
            │ auth (private)│           │server (private)│
            │ Express :3001 │◄──────────┤ FastAPI :3000  │
            └───────┬───────┘           └───────┬───────┘
                    └─────────────┬─────────────┘
                                  ▼
                          ┌───────────────┐
                          │   Postgres    │
                          └───────────────┘
```

Only `client` gets a public domain. The browser always talks to the client's
domain — `/api/auth/*` and `/api/*` are reverse-proxied by nginx to `auth`
and `server` over Railway's private network (`<service>.railway.internal`).
This keeps cookies same-origin (no CORS/`SameSite=None` complexity) and keeps
the backend services off the public internet entirely. This mirrors exactly
what the Vite dev server's proxy does locally — see `client/vite.config.ts`.

**Service names matter.** Name the services exactly `server`, `auth`, and
`client` in the Railway dashboard — the nginx config's default upstreams
(`http://auth.railway.internal:3001`, `http://server.railway.internal:3000`)
assume these names. If you name them differently, override `AUTH_UPSTREAM`
/ `SERVER_UPSTREAM` on the `client` service accordingly.

## 1. Create the project and database

1. In the Railway dashboard: **New Project** → **Deploy PostgreSQL**.
2. Note the database service's name (default: `Postgres`) — used in the
   `${{Postgres.DATABASE_URL}}` references below.

## 2. Add the three services

For each of `server`, `auth`, `client`:

1. **New** → **GitHub Repo** → select this repo.
2. Rename the service to `server` / `auth` / `client` respectively.
3. In **Settings → Build**, set **Builder** to Dockerfile if not
   auto-detected, and confirm **Custom Config File Path** picks up each
   service's own `railway.json` (`server/railway.json`, `auth/railway.json`,
   `client/railway.json` — already checked into the repo, each pointing at
   the matching Dockerfile). Leave **Root Directory** unset (repo root) —
   `auth` and `client` are npm workspaces and need the repo-root build
   context to reach `core/` and the shared lockfile.
4. Only for `client`: **Settings → Networking → Generate Domain** to get a
   public URL. Do **not** generate public domains for `auth` or `server`.

## 3. Environment variables

### `server`

| Variable | Value |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `CLIENT_URL` | `https://${{client.RAILWAY_PUBLIC_DOMAIN}}` |
| `AUTH_SERVICE_URL` | `http://auth.railway.internal:3001` |
| `WEBHOOK_SECRET` | strong random string (enables `/api/webhooks/*`) |
| `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL` | optional — outbound email |
| `IMAP_HOST`, `IMAP_PORT`, `IMAP_USER`, `IMAP_PASSWORD` | optional — inbound email polling |
| `SENTRY_DSN` | optional |

### `auth`

| Variable | Value |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` — required, service refuses to boot without a production-safe value |
| `BETTER_AUTH_URL` | `https://${{client.RAILWAY_PUBLIC_DOMAIN}}` |
| `CLIENT_URL` | `https://${{client.RAILWAY_PUBLIC_DOMAIN}}` |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | used once by `npm run seed` (step 5) — password must be 16+ characters |
| `OPENAI_API_KEY` | required for AI classify/summarize/polish features |
| `SENTRY_DSN` | optional |

### `client`

No required variables — `VITE_AUTH_URL` can stay unset (Better Auth's client
defaults to same-origin, which is correct here since nginx proxies
`/api/auth/*` on the same domain). Only set `AUTH_UPSTREAM` / `SERVER_UPSTREAM`
if you named the backend services something other than `auth` / `server`.

Since `client`'s own public domain isn't known until after its first deploy,
and `CLIENT_URL`/`BETTER_AUTH_URL` on `auth`/`server` reference it via
`${{client.RAILWAY_PUBLIC_DOMAIN}}`: deploy `client` first (or redeploy
`auth`/`server` once `client`'s domain exists) so the reference resolves.

## 4. Deploy

Trigger a deploy on all three services (push to the connected branch, or
**Deploy** in the dashboard). `server` runs `alembic upgrade head`
automatically on boot before starting — a fresh Postgres database will have
its schema created on first deploy, including the `users` / `sessions` /
`accounts` / `verifications` tables that `auth` reads and writes via Drizzle.
`auth` does not run its own migrations; it only queries tables that `server`'s
Alembic migrations own. Deploy (or at least let `server` finish its first
boot) before `auth`, so the schema exists when `auth` starts querying it.

## 5. Seed the initial admin user

One-time, after `auth` is up:

```bash
railway run --service auth npm run seed
```

This creates the admin (and optional agent) account from `SEED_ADMIN_EMAIL`
/ `SEED_ADMIN_PASSWORD` (and `SEED_AGENT_EMAIL` / `SEED_AGENT_PASSWORD` if
set), plus a well-known AI-agent account used for auto-assignment. Sign-up is
disabled in this app by design — this is the only way to create users.

## 6. Verify

- `https://<client-domain>/api/health` → `{"status":"ok"}` (proxied to `server`)
- `https://<client-domain>/api/auth/ok` → `200` (proxied to `auth`)
- `https://<client-domain>/login` → sign in with the seeded admin credentials

## Notes

- **Migrations**: only `server` runs migrations (`alembic upgrade head`,
  automatically on every boot). It owns the schema for every table, including
  the Better Auth tables (`users`/`sessions`/`accounts`/`verifications`) that
  `auth` reads and writes via Drizzle — `auth` has no migration step of its
  own. Alembic's migrations are idempotent (no-op if already applied), so
  this is safe to leave in the container's start command permanently.
- **Re-seeding**: `npm run seed` skips any email that already exists, so
  re-running it after a redeploy is harmless.
- **Local dev is unaffected**: none of this changes `npm run dev` — the
  Dockerfiles and `railway.json` files are only used by Railway's build.
