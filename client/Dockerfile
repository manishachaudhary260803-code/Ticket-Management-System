# Root directory for this service in Railway must stay at the repo root
# with "Custom Dockerfile Path" set to client/Dockerfile — see DEPLOYMENT.md.
# Repo-root build context is required because this is an npm workspace
# (client depends on the local @ticket/core package via the root lockfile).

FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY core/package.json ./core/package.json
COPY auth/package.json ./auth/package.json
COPY client/package.json ./client/package.json
RUN npm ci

COPY core ./core
COPY client ./client
# client/src/lib/auth-client.ts does a type-only import of auth/src/auth.ts
# (for inferAdditionalFields) — the type build needs auth's source present,
# even though nothing from it ends up in the runtime bundle.
COPY auth/src ./auth/src
COPY auth/tsconfig.json ./auth/tsconfig.json
WORKDIR /app/client
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf.template /etc/nginx/templates/default.conf.template

# Defaults assume services are named "auth" and "server" in the Railway
# project (Railway private networking DNS). Override via env vars if named
# differently. The official nginx image envsubst's *.template files on boot.
ENV AUTH_UPSTREAM=http://auth.railway.internal:3001
ENV SERVER_UPSTREAM=http://server.railway.internal:3000
ENV PORT=8080
EXPOSE 8080
