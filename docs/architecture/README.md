# V4 architecture

## Added layers
- encrypted secret storage
- checkpoint persistence
- transform + loader pipeline
- scheduler service
- webhook gateway
- metrics / tracing / structured logging
- retries with DLQ

## Runtime path
API -> Postgres + Redis
Worker -> connector -> transform -> loader -> checkpoint
Scheduler -> queue
Webhook gateway -> store event -> queue
