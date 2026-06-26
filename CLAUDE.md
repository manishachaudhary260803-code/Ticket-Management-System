# Ticket Management System

AI-powered support ticket system that auto-classifies, routes, and drafts replies for student support emails.

## Stack

**Frontend** (`client/`)
- React 19 + TypeScript 6 + Vite 8
- Tailwind CSS v4 (Vite plugin — no PostCSS config needed)
- React Router v7

**Backend** (`server/`)
- FastAPI + Uvicorn
- SQLAlchemy (ORM) + Alembic (migrations)
- PostgreSQL (`psycopg2-binary`)
- JWT auth via `python-jose`, password hashing via `passlib[bcrypt]`

## Dev Commands

```bash
# Frontend
cd client && npm run dev       # http://localhost:5173
cd client && npm run build
cd client && npm run lint      # oxlint

# Backend
cd server && source venv/bin/activate
python main.py                 # http://localhost:3000
alembic upgrade head           # run migrations
```

## Architecture

```
client/src/          React app
server/app/
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

## Key Constraints

- No student-facing portal — email only
- Auth is email + password (JWT sessions)
- AI draft replies require human approval before sending
- Dashboard metrics: ticket volume over time, open vs resolved counts, tickets by category, agent workload
- Notifications: email to assigned agent when a ticket is assigned

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
- python-jose / passlib
```

Prefer context7 over training-data recall for any API surface, config format, or migration guide — especially for Tailwind v4, React Router v7, and React 19, which all have recent breaking changes.
