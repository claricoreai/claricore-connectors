
# Claricore Connectors

<p align="center">
  <img src="https://img.shields.io/badge/status-active-success" />
  <img src="https://img.shields.io/badge/license-MIT-blue" />
  <img src="https://img.shields.io/badge/node-20%2B-green" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-blue" />
  <img src="https://img.shields.io/badge/Redis-BullMQ-red" />
  <img src="https://img.shields.io/badge/PostgreSQL-supported-blue" />
</p>

<p align="center">
Open-source data connector framework for building scalable ETL pipelines and integrations across enterprise systems.
</p>

---

# What is Claricore Connectors?

Claricore Connectors is a modular ETL platform for connecting enterprise systems to data platforms and AI pipelines.

It provides:

- Connector SDK
- Async job processing
- Incremental sync
- Secure credential storage
- Webhook ingestion
- Scheduled pipelines
- Transformation pipelines
- Retry + dead letter queues
- Observability

Supported systems include:

- Salesforce
- SAP
- Snowflake
- Databricks
- AWS
- Google Analytics
- Custom APIs

---

# Architecture

Claricore uses a worker-based distributed architecture.

Client / UI / CLI
        │
        ▼
      API
        │
        ├── PostgreSQL
        │      connections
        │      jobs
        │      checkpoints
        │
        ├── Secret Manager
        │      encrypted credentials
        │
        └── Redis Queue
               │
               ▼
            Worker
               │
        extract → transform → load
               │
               ▼
         Destination System

Additional runtime services:

Scheduler → recurring sync jobs  
Webhook Gateway → event-driven ingestion  
Observability → logs + metrics + tracing

---

# Features

## Connector SDK

Create connectors using a consistent interface.

- SourceConnector
- DestinationConnector
- StreamConnector

Supports:

- schema discovery
- incremental sync
- webhook ingestion

---

## Async Job Processing

API → Redis → Worker → Connector → Loader

Includes:

- retries
- exponential backoff
- dead-letter queue

---

## Incremental Sync

Claricore tracks progress using checkpoints:

connection_id  
resource  
cursor  

---

## Secure Credential Storage

Credentials are encrypted using AES-256-GCM and stored in PostgreSQL.

---

## Webhook Ingestion

External systems can trigger sync jobs using webhooks.

Endpoint:

POST /webhooks

---

## Scheduled Pipelines

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

# Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Submit a pull request

---

# License

MIT License

---

# Claricore AI

Claricore Connectors is part of the Claricore AI data intelligence platform, enabling organizations to build AI-ready data pipelines across enterprise systems.
