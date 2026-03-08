
# Claricore Connectors

Open-source **data connector and ETL framework** for the Claricore AI platform.

Claricore Connectors enables teams to build scalable integrations between enterprise systems and data platforms such as:

- Salesforce
- SAP
- Snowflake
- Databricks
- AWS
- Google Analytics
- Custom APIs

It provides a modular architecture for **extracting, transforming, and loading (ETL)** data with support for:

- Connector SDK
- Async job execution
- Encrypted credential storage
- Incremental sync checkpoints
- Scheduled syncs
- Webhook ingestion
- Retry & dead-letter queues
- Observability

---

# Architecture

Claricore uses a **modular service architecture** built around workers and queues.

Client / UI / CLI
        │
        ▼
      API
        │
        ├── PostgreSQL (connections, jobs, checkpoints)
        ├── Redis (BullMQ queue)
        └── Secret Manager (encrypted credentials)
        │
        ▼
      Worker
        │
   extract → transform → load
        │
        ▼
   Destination System

Additional services:

Scheduler → recurring sync jobs
Webhook Gateway → event-driven sync
Observability → logs + metrics + traces

---

# Features

## Connector SDK

Create connectors using standardized interfaces.

- SourceConnector
- DestinationConnector
- StreamConnector

Supports:

- schema discovery
- incremental sync
- webhook ingestion

---

## Async Job Processing

API → Redis queue → Worker → Connector → Loader

Includes:

- retries
- exponential backoff
- dead-letter queue

---

## Secure Credential Storage

Credentials are encrypted using **AES-256-GCM** and stored in PostgreSQL.

---

## Incremental Sync

Claricore tracks sync progress using checkpoints:

- connection_id
- resource
- cursor

---

## Transformation Layer

Records can be mapped to canonical schemas.

Example:

Salesforce Account → CanonicalCustomer

---

## Webhook Ingestion

External systems can trigger sync jobs using webhooks.

Endpoint:

POST /webhooks

---

## Scheduled Sync

Cron-based schedules supported.

Example:

*/10 * * * *

---

# Repository Structure

claricore-connectors/

apps/
  api
  worker
  scheduler
  webhook-gateway
  cli

packages/
  core
  config
  db
  queue
  secret-manager
  checkpoints
  transformations
  loaders
  observability
  registry
  sdk
  ui-contracts
  testing

connectors/
  salesforce

scripts/
  generate-connector.ts
  validate-manifests.ts

---

# Requirements

- Node.js 20+
- pnpm
- Docker

---

# Quick Start

Clone repository

git clone https://github.com/claricore/claricore-connectors
cd claricore-connectors

Setup environment

cp .env.example .env

Start infrastructure

docker compose up -d

Install dependencies

pnpm install

Run database migrations

pnpm db:migrate

Start services

pnpm dev

---

# API Usage

Health check

GET /health

List connectors

GET /connectors

Create connection

POST /connections

Trigger sync

POST /connections/{id}/sync

Check job status

GET /jobs/{id}

Create schedule

POST /schedules

Webhook endpoint

POST /webhooks

---

# ETL Pipeline

Extract
 ↓
Transform
 ↓
Load
 ↓
Checkpoint

---

# Retry & Dead Letter Queue

Jobs use retries with exponential backoff.

Failed jobs are sent to a dead-letter queue.

---

# Adding a Connector

Generate a connector scaffold:

pnpm generate:connector hubspot

---

# License

MIT License
