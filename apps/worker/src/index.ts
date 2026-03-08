import { createServer } from "node:http";
import { createSyncWorker, enqueueDeadLetter, type SyncQueuePayload } from "@claricore/queue";
import { getCheckpoint, upsertCheckpoint } from "@claricore/checkpoints";
import { getConnection, updateJobStatus } from "@claricore/db";
import { ClaricoreLoader } from "@claricore/loaders";
import { createLogger, metrics, startSpan } from "@claricore/observability";
import { mapSalesforceAccount } from "@claricore/transformations";
import { SalesforceConnector } from "@claricore/connector-salesforce";
import { getConfig } from "@claricore/config";
import type { Job } from "bullmq";

const logger = createLogger({ service: "worker" });

export function createWorkerProcessor(deps?: {
  getConnection?: typeof getConnection;
  updateJobStatus?: typeof updateJobStatus;
  getCheckpoint?: typeof getCheckpoint;
  upsertCheckpoint?: typeof upsertCheckpoint;
  enqueueDeadLetter?: typeof enqueueDeadLetter;
  loader?: Pick<ClaricoreLoader, "load">;
  connectorFactory?: () => { extract: SalesforceConnector["extract"] };
}) {
  const loader = deps?.loader ?? new ClaricoreLoader();

  return async (job: Job<SyncQueuePayload>) => {
    const span = startSpan("sync-job");
    const payload = job.data;
    const started = Date.now();

    const dbGetConnection = deps?.getConnection ?? getConnection;
    const dbUpdateJobStatus = deps?.updateJobStatus ?? updateJobStatus;
    const dbGetCheckpoint = deps?.getCheckpoint ?? getCheckpoint;
    const dbUpsertCheckpoint = deps?.upsertCheckpoint ?? upsertCheckpoint;
    const dlq = deps?.enqueueDeadLetter ?? enqueueDeadLetter;

    await dbUpdateJobStatus(payload.jobId, "running");
    logger.info("job started", { jobId: payload.jobId, correlationId: payload.jobId, source: payload.source });

    try {
      const connection = await dbGetConnection(payload.connectionId);
      if (!connection) {
        throw new Error(`Connection ${payload.connectionId} not found`);
      }

      switch (payload.connectorType) {
        case "salesforce": {
          const connector = deps?.connectorFactory?.() ?? new SalesforceConnector();
          const checkpoint = await dbGetCheckpoint(payload.connectionId, payload.resource ?? "Account");
          const rawRecords = connector.extract({
            connectionId: payload.connectionId,
            runId: payload.jobId,
            mode: payload.mode,
            resource: payload.resource,
            checkpoint
          });

          async function* transformed() {
            for await (const record of rawRecords) {
              yield mapSalesforceAccount(record);
            }
          }

          const result = await loader.load(
            {
              connectionId: payload.connectionId,
              runId: payload.jobId,
              resource: payload.resource,
              destination: "claricore-ingestion-api"
            },
            transformed()
          );

          await dbUpsertCheckpoint({
            connectionId: payload.connectionId,
            resource: payload.resource ?? "Account",
            cursor: new Date().toISOString()
          });

          await dbUpdateJobStatus(payload.jobId, "completed", null);
          metrics.increment("sync.jobs.completed", 1, { connectorType: payload.connectorType });
          metrics.timing("sync.jobs.duration_ms", Date.now() - started, { connectorType: payload.connectorType });
          logger.info("job completed", { jobId: payload.jobId, correlationId: payload.jobId, loadedCount: result.loadedCount });
          break;
        }
        default:
          throw new Error(`Unsupported connector type: ${payload.connectorType}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await dbUpdateJobStatus(payload.jobId, "failed", message);
      metrics.increment("sync.jobs.failed", 1, { connectorType: payload.connectorType });
      logger.error("job failed", { jobId: payload.jobId, correlationId: payload.jobId, error: message });

      if (job.attemptsMade + 1 >= (job.opts.attempts ?? 1)) {
        await dlq(payload);
        logger.error("job sent to dlq", { jobId: payload.jobId, correlationId: payload.jobId });
      }

      throw error;
    } finally {
      span.end();
    }
  };
}

if (process.env.NODE_ENV !== "test") {
  const worker = createSyncWorker(createWorkerProcessor());
  const healthServer = createServer((req, res) => {
    if (req.url !== "/health") {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
      return;
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "worker" }));
  });

  const config = getConfig();
  healthServer.listen(config.workerHealthPort, () => {
    logger.info("health server started", { port: config.workerHealthPort });
  });

  worker.on("failed", (job, error) => {
    logger.error("bullmq failed", { bullmqId: job?.id, error: error.message });
  });

  worker.on("completed", (job) => {
    logger.info("bullmq completed", { bullmqId: job.id });
  });

  logger.info("worker started");

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info("graceful shutdown requested");
    await worker.close();
    healthServer.close(() => process.exit(0));
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}
