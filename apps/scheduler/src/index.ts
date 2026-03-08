import { createServer } from "node:http";
import cron, { type ScheduledTask } from "node-cron";
import { createJob, getConnection, listSchedules } from "@claricore/db";
import { createLogger } from "@claricore/observability";
import { enqueueSyncJob } from "@claricore/queue";
import { getConfig } from "@claricore/config";

const logger = createLogger({ service: "scheduler" });

export async function bootstrapScheduler(): Promise<{ stop: () => void }> {
  const schedules = await listSchedules();
  const tasks: ScheduledTask[] = [];

  for (const schedule of schedules) {
    const task = cron.schedule(schedule.cron, async () => {
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

        logger.info("scheduled sync enqueued", { scheduleId: schedule.id, jobId: job.id, correlationId: job.id });
      } catch (error) {
        logger.error("scheduled sync failed", { error: error instanceof Error ? error.message : String(error) });
      }
    });
    tasks.push(task);
  }

  logger.info("scheduler started", { schedules: schedules.length });

  return {
    stop: () => {
      for (const task of tasks) {
        task.stop();
      }
    }
  };
}

if (process.env.NODE_ENV !== "test") {
  const config = getConfig();
  const healthServer = createServer((req, res) => {
    if (req.url !== "/health") {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
      return;
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "scheduler" }));
  });

  healthServer.listen(config.schedulerHealthPort, () => {
    logger.info("health server started", { port: config.schedulerHealthPort });
  });

  let stop: (() => void) | undefined;
  void bootstrapScheduler().then((runner) => {
    stop = runner.stop;
  });

  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info("graceful shutdown requested");
    stop?.();
    healthServer.close(() => process.exit(0));
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
