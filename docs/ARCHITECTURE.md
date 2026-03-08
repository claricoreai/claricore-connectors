# Architecture

Claricore is a TypeScript monorepo with API, worker, scheduler, and webhook gateway services.

## Runtime components
- **API**: connection and sync orchestration.
- **Worker**: extract-transform-load execution.
- **Scheduler**: cron-driven sync initiation.
- **Webhook Gateway**: webhook ingestion and queue fan-out.

## Shared packages
- `@claricore/db`: PostgreSQL query layer.
- `@claricore/queue`: BullMQ setup and queue helpers.
- `@claricore/secret-manager`: encrypted secret storage.
- `@claricore/transformations`: canonical mapping functions.
- `@claricore/ui-contracts`: API request schemas.
- `@claricore/observability`: structured logs, metric stubs, span helpers.

## Reliability notes
- All services now expose explicit health endpoints.
- API, worker, scheduler, and webhook gateway implement graceful shutdown hooks.
- Worker and scheduler logs carry `correlationId`/`jobId` where applicable.
- Webhook signature verification is currently an HMAC-SHA256 baseline and should be specialized per connector.

## Known weak spots (minimal patch plan)
- **Secrets and DB clients are process-local singletons**: acceptable for now, but future iterations should centralize connection lifecycle management.
- **Webhook signature support is generic**: add connector-specific verifiers and replay protection (timestamp + nonce cache).
- **Observability adapters are stubs**: wire to OpenTelemetry/metrics backend in a dedicated observability integration milestone.
