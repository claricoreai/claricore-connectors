# Claricore Connectors

<p align="center">
  <img src="https://img.shields.io/badge/status-active-success" />
  <img src="https://img.shields.io/badge/license-MIT-blue" />
  <img src="https://img.shields.io/badge/node-20%2B-green" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-blue" />
  <img src="https://img.shields.io/badge/Redis-BullMQ-red" />
  <img src="https://img.shields.io/badge/PostgreSQL-supported-blue" />
</p>

Open-source data connector framework for building scalable ETL pipelines and integrations across enterprise systems.

## Local development

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker + Docker Compose (for local Postgres/Redis)
- `jq` (used by `scripts/smoke-test.sh`)

### Quick start

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:migrate
pnpm dev
```

### Core commands

```bash
pnpm install         # install dependencies
pnpm db:migrate      # run db migrations
pnpm dev             # run all apps in dev mode via turbo
pnpm test            # run vitest suites via turbo
pnpm lint            # run eslint across workspaces
pnpm build           # build all packages/apps
pnpm validate:manifests
```

### Health endpoints

- API: `GET http://localhost:4000/health`
- Webhook gateway: `GET http://localhost:4100/health`
- Worker: `GET http://localhost:4200/health`
- Scheduler: `GET http://localhost:4300/health`

### Smoke test

After services are up:

```bash
bash scripts/smoke-test.sh
```

## Architecture

```mermaid
flowchart TD
Client --> API
API --> Postgres
API --> Redis
Redis --> Worker
Scheduler --> Redis
Webhook --> Redis
Worker --> Transform
Transform --> Load
```

See `docs/ARCHITECTURE.md` for a detailed version.
