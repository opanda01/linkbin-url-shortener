# Linkbin

Linkbin is a self-hosted URL shortening service. It converts long, unwieldy links into short, memorable URLs and tracks how they perform over time.

## Overview

When you paste a URL into Linkbin, it generates a short code — for example, `linkbin.io/launch` — that redirects anyone who visits it to the original address. You can choose your own custom slug, or let the system generate one automatically. Every link records daily click statistics so you can see exactly when and how often it is being visited.

Links expire after 30 days and are removed automatically, keeping the system clean without any manual maintenance.

## Key Features

- **URL shortening** — Paste any valid HTTP or HTTPS link and receive a short URL instantly.
- **Custom aliases** — Optionally specify a memorable name for your link instead of a generated code.
- **Click analytics** — View total clicks and a daily breakdown chart for any shortened link.
- **Rate limiting** — Each client is limited to 60 requests per 15-minute window to prevent abuse.
- **Automatic expiry** — Links and their associated data are removed from Redis after 30 days.

## Architecture

The project is structured as a monorepo with two applications and shared infrastructure.

```
apps/
  api/    — Node.js HTTP server (no framework), Redis-backed, fully tested
  web/    — React + Vite single-page application with Tailwind CSS
infra/
  docker/ — Docker Compose files for local development and production
  caddy/  — Reverse proxy configuration
  scripts/— Smoke tests and utilities
packages/ — Shared utilities (in progress)
```

The API is intentionally built without an application framework to demonstrate a clear understanding of the Node.js HTTP layer. All routing, error handling, and middleware behaviour is implemented directly.

The CI/CD pipeline runs on GitHub Actions. Every push triggers the full test suite; merges to `main` additionally build and push Docker images to the GitHub Container Registry and optionally deploy to a production server over SSH.

---

## Developer Guide

> The sections below are intended for contributors and operators running the project locally or in production.

## Local Development

```bash
# Install dependencies
npm install

# Start Redis
cd infra/docker && docker compose -f docker-compose.dev.yml up -d

# Start the API (port 3001)
npm run dev:api

# Start the web app (port 5173)
npm run dev:web
```

## Tests

```bash
# All tests
npm test

# API only (25 tests)
npm run test:api

# Web only (18 tests)
npm run test:web

# Smoke test against a running API
npm run smoke
```

## Docker

```bash
# API image
docker build -t linkbin-api apps/api

# Web image (requires VITE_API_URL at build time)
docker build --build-arg VITE_API_URL=https://yourdomain.com -t linkbin-web apps/web
```

## CI / CD

Every push to `main` or `master` runs three sequential jobs via GitHub Actions:

1. **Test** — full test suite with a Redis service container, plus a production build check
2. **Docker** — builds and pushes both images to the GitHub Container Registry (`ghcr.io`)
3. **Deploy** — connects to the production server over SSH and runs `docker compose pull && up`

The deploy job only runs when the repository variable `DEPLOY_ENABLED` is set to `true`, making it safe to push without a production server configured.

### Required Secrets

| Secret | Description |
|---|---|
| `DEPLOY_HOST` | Production server IP or hostname |
| `DEPLOY_USER` | SSH username |
| `DEPLOY_KEY` | SSH private key (ed25519 recommended) |
| `VITE_API_URL` | Production API base URL for the web app (e.g. `https://api.yourdomain.com`) |

`GITHUB_TOKEN` is provided automatically by GitHub Actions and requires no configuration.

### First-time Server Setup

```bash
mkdir -p /opt/linkbin
cd /opt/linkbin
git clone <repo> .
cp apps/api/.env.example apps/api/.env.prod
# Edit .env.prod with production values
```

## Environment Variables

Copy the example file before running locally:

```bash
cp apps/api/.env.example apps/api/.env
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | API server port |
| `BASE_URL` | `http://localhost:3001` | Public API base URL used when returning generated short links |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `URL_TTL_SECONDS` | `2592000` | Link lifetime in seconds (30 days) |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window in milliseconds (15 min) |
| `RATE_LIMIT_MAX` | `60` | Maximum requests per window per IP |
