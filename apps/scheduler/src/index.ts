import cron from "node-cron";
import { createJob, getConnection, listSchedules } from "@claricore/db";
import { logInfo, logError } from "@claricore/observability";
import { enqueueSyncJob } from "@claricore/queue";

async function bootstrap(): Promise<void> {
  const schedules = await listSchedules();

  for (const schedule of schedules) {
    cron.schedule(schedule.cron, async () => {
      try {
        const connection = await getConnection(schedule.connectionId);
        if (!connection) return;

        const job = await createJob({
          connectionId: schedule.connectionId,
          connectorType: connection.connectorType,
          mode: "incremental",
          resource: schedule.resource
        });

        await enqueueSyncJob({
          jobId: job.id,
          connectionId: schedule.connectionId,
          connectorType: connection.connectorType,
          mode: "incremental",
          resource: schedule.resource,
          source: "scheduler"
        });

        logInfo("scheduled sync enqueued", { scheduleId: schedule.id, jobId: job.id });
      } catch (error) {
        logError("scheduled sync failed", { error: error instanceof Error ? error.message : String(error) });
      }
    });
  }

  logInfo("scheduler started", { schedules: schedules.length });
}

void bootstrap();
