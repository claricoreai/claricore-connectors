import { createSyncWorker, enqueueDeadLetter } from "@claricore/queue";
import { getCheckpoint, upsertCheckpoint } from "@claricore/checkpoints";
import { getConnection, updateJobStatus } from "@claricore/db";
import { ClaricoreLoader } from "@claricore/loaders";
import { logError, logInfo, metrics, startSpan } from "@claricore/observability";
import { mapSalesforceAccount } from "@claricore/transformations";
import { SalesforceConnector } from "@claricore/connector-salesforce";

const loader = new ClaricoreLoader();

const worker = createSyncWorker(async (job) => {
  const span = startSpan("sync-job");
  const payload = job.data;
  const started = Date.now();

  await updateJobStatus(payload.jobId, "running");
  logInfo("job started", { jobId: payload.jobId, source: payload.source });

  try {
    const connection = await getConnection(payload.connectionId);
    if (!connection) {
      throw new Error(`Connection ${payload.connectionId} not found`);
    }

    switch (payload.connectorType) {
      case "salesforce": {
        const connector = new SalesforceConnector();
        const checkpoint = await getCheckpoint(payload.connectionId, payload.resource ?? "Account");
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

        const result = await loader.load({
          connectionId: payload.connectionId,
          runId: payload.jobId,
          resource: payload.resource,
          destination: "claricore-ingestion-api"
        }, transformed());

        await upsertCheckpoint({
          connectionId: payload.connectionId,
          resource: payload.resource ?? "Account",
          cursor: new Date().toISOString()
        });

        await updateJobStatus(payload.jobId, "completed", null);
        metrics.increment("sync.jobs.completed", 1, { connectorType: payload.connectorType });
        metrics.timing("sync.jobs.duration_ms", Date.now() - started, { connectorType: payload.connectorType });
        logInfo("job completed", { jobId: payload.jobId, loadedCount: result.loadedCount });
        break;
      }
      default:
        throw new Error(`Unsupported connector type: ${payload.connectorType}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateJobStatus(payload.jobId, "failed", message);
    metrics.increment("sync.jobs.failed", 1, { connectorType: payload.connectorType });
    logError("job failed", { jobId: payload.jobId, error: message });

    if ((job.attemptsMade + 1) >= (job.opts.attempts ?? 1)) {
      await enqueueDeadLetter(payload);
      logError("job sent to dlq", { jobId: payload.jobId });
    }

    throw error;
  } finally {
    span.end();
  }
});

worker.on("failed", (job, error) => {
  logError("bullmq failed", { bullmqId: job?.id, error: error.message });
});

worker.on("completed", (job) => {
  logInfo("bullmq completed", { bullmqId: job.id });
});

logInfo("worker started");
