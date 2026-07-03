# Root directory for this service in Railway must stay at the repo root
# with "Custom Dockerfile Path" set to auth/Dockerfile — see DEPLOYMENT.md.
# Repo-root build context is required because this is an npm workspace
# (auth depends on the local @ticket/core package via the root lockfile).

FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY core/package.json ./core/package.json
COPY auth/package.json ./auth/package.json
COPY client/package.json ./client/package.json
RUN npm ci

FROM node:20-slim AS runtime
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY core ./core
COPY auth ./auth

WORKDIR /app/auth
ENV PORT=3001
EXPOSE 3001

# Schema for these tables (users/sessions/accounts/verifications) is owned
# and migrated by the server service's Alembic migrations, not by this
# service — auth only queries them via Drizzle. Do not add a migration step
# here; running one would race/duplicate server's "alembic upgrade head".
CMD ["npm", "start"]
