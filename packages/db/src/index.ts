import type { CreateConnectionInput, Connection, CreateSyncJobInput, SyncJob, Checkpoint } from "@claricore/core";
import { pool } from "./client";

export async function createConnection(input: CreateConnectionInput): Promise<Connection> {
  const result = await pool.query(
    `INSERT INTO connections (connector_type, name, sync_mode)
     VALUES ($1, $2, $3)
     RETURNING id, connector_type AS "connectorType", name, status, sync_mode AS "syncMode", config_secret_id AS "configSecretId", created_at AS "createdAt"`,
    [input.connectorType, input.name, input.syncMode]
  );
  return result.rows[0] as Connection;
}

export async function attachSecretToConnection(connectionId: string, secretId: string): Promise<void> {
  await pool.query(`UPDATE connections SET config_secret_id = $2 WHERE id = $1`, [connectionId, secretId]);
}

export async function getConnection(id: string): Promise<Connection | undefined> {
  const result = await pool.query(
    `SELECT id, connector_type AS "connectorType", name, status, sync_mode AS "syncMode", config_secret_id AS "configSecretId", created_at AS "createdAt"
     FROM connections WHERE id = $1`, [id]
  );
  return result.rows[0] as Connection | undefined;
}

export async function listConnections(): Promise<Connection[]> {
  const result = await pool.query(
    `SELECT id, connector_type AS "connectorType", name, status, sync_mode AS "syncMode", config_secret_id AS "configSecretId", created_at AS "createdAt"
     FROM connections ORDER BY created_at DESC`
  );
  return result.rows as Connection[];
}

export async function createJob(input: CreateSyncJobInput): Promise<SyncJob> {
  const result = await pool.query(
    `INSERT INTO sync_jobs (connection_id, connector_type, mode, status, resource)
     VALUES ($1, $2, $3, 'queued', $4)
     RETURNING id, connection_id AS "connectionId", connector_type AS "connectorType", mode, status, resource, created_at AS "createdAt", updated_at AS "updatedAt", error_message AS "errorMessage"`,
    [input.connectionId, input.connectorType, input.mode, input.resource ?? null]
  );
  return result.rows[0] as SyncJob;
}

export async function getJob(id: string): Promise<SyncJob | undefined> {
  const result = await pool.query(
    `SELECT id, connection_id AS "connectionId", connector_type AS "connectorType", mode, status, resource, created_at AS "createdAt", updated_at AS "updatedAt", error_message AS "errorMessage"
     FROM sync_jobs WHERE id = $1`, [id]
  );
  return result.rows[0] as SyncJob | undefined;
}

export async function updateJobStatus(id: string, status: SyncJob["status"], errorMessage?: string | null): Promise<void> {
  await pool.query(
    `UPDATE sync_jobs SET status = $2, error_message = $3, updated_at = NOW() WHERE id = $1`,
    [id, status, errorMessage ?? null]
  );
}

export async function upsertCheckpoint(checkpoint: Checkpoint): Promise<void> {
  await pool.query(
    `INSERT INTO checkpoints (connection_id, resource, cursor, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (connection_id, resource)
     DO UPDATE SET cursor = EXCLUDED.cursor, updated_at = NOW()`,
    [checkpoint.connectionId, checkpoint.resource, checkpoint.cursor ?? null]
  );
}

export async function getCheckpoint(connectionId: string, resource: string): Promise<Checkpoint | null> {
  const result = await pool.query(
    `SELECT connection_id AS "connectionId", resource, cursor, updated_at AS "updatedAt"
     FROM checkpoints WHERE connection_id = $1 AND resource = $2`,
    [connectionId, resource]
  );
  return (result.rows[0] as Checkpoint | undefined) ?? null;
}

export async function createSchedule(connectionId: string, cron: string, resource?: string): Promise<{ id: string }> {
  const result = await pool.query(
    `INSERT INTO schedules (connection_id, cron, resource) VALUES ($1, $2, $3) RETURNING id`,
    [connectionId, cron, resource ?? null]
  );
  return result.rows[0] as { id: string };
}

export async function listSchedules(): Promise<Array<{ id: string; connectionId: string; cron: string; resource?: string }>> {
  const result = await pool.query(
    `SELECT id, connection_id AS "connectionId", cron, resource FROM schedules WHERE active = TRUE`
  );
  return result.rows;
}

export async function saveWebhookEvent(input: { connectorType: string; connectionId?: string; eventType: string; resource?: string; payload: unknown }): Promise<{ id: string }> {
  const result = await pool.query(
    `INSERT INTO webhook_events (connector_type, connection_id, event_type, resource, payload)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [input.connectorType, input.connectionId ?? null, input.eventType, input.resource ?? null, JSON.stringify(input.payload)]
  );
  return result.rows[0] as { id: string };
}
