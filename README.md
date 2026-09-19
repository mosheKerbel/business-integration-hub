# Business Integration Hub

TypeScript/Node platform service for ERP integration, canonical data synchronization, and outbound command delivery. See `docs/` for the PRD, technical specification, and implementation plan.

## Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [pnpm](https://pnpm.io/) 9+
- [Docker](https://www.docker.com/) (for local Hub PostgreSQL)

Packages install from the [public npm registry](https://www.npmjs.com/) (see `.npmrc`).

## Local bootstrap

```bash
# Install workspace dependencies
pnpm install

# Environment (no secrets committed — copy the template)
cp .env.example .env

# Hub PostgreSQL (separate from future Mock ERP SQLite)
pnpm db:up

# Compile all apps and packages (strict TypeScript)
pnpm build

# Quality checks
pnpm typecheck
pnpm lint
pnpm test
```

`pnpm test` runs workspace smoke tests and compiles all packages. To include the PostgreSQL connectivity test after `pnpm db:up`:

```bash
export RUN_DB_INTEGRATION=1
pnpm test
```

If port `15432` is already in use, set `BIH_POSTGRES_PORT` in `.env` and use the same host port in `DATABASE_URL`.

## Development entry points

```bash
# HTTP API (GET /health, GET /health/db)
pnpm dev:api

# Background worker (periodic DB connectivity check until sync/outbox work lands)
pnpm dev:worker
```

Default API base: `http://127.0.0.1:3000`

## Repository layout

```text
apps/api/          HTTP API service
apps/worker/       Worker processes
apps/mock-erp/     Mock ERP scaffold (SQLite + HTTP in later tasks)
packages/          Shared libraries (contracts, db, sync-engine, …)
migrations/        Hub PostgreSQL migrations (domain schema in later tasks)
tests/             integration, e2e, and security tests
```

## Useful commands

| Command | Description |
| --- | --- |
| `pnpm build` | Build all workspaces |
| `pnpm typecheck` | Type-check all workspaces |
| `pnpm lint` | ESLint across the repo |
| `pnpm test` | Vitest smoke and integration tests |
| `pnpm db:up` | Start Hub PostgreSQL via Docker Compose |
| `pnpm db:down` | Stop Hub PostgreSQL |
| `pnpm db:wait` | Wait until PostgreSQL accepts connections |
