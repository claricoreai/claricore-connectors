import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { ZodError } from "zod";
import { getConfig } from "@claricore/config";
import {
  attachSecretToConnection,
  createConnection,
  createJob,
  createSchedule,
  getConnection,
  getJob,
  listConnections
} from "@claricore/db";
import { createLogger } from "@claricore/observability";
import { enqueueSyncJob } from "@claricore/queue";
import { connectorRegistry } from "@claricore/registry";
import { storeSecret } from "@claricore/secret-manager";
import {
  createConnectionRequestSchema,
  scheduleRequestSchema,
  triggerSyncRequestSchema
} from "@claricore/ui-contracts";

const logger = createLogger({ service: "api" });

class InvalidJsonError extends Error {
  constructor() {
    super("Invalid JSON body");
  }
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data, null, 2));
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new InvalidJsonError();
  }
}

export function createApiServer(): Server {
  return createServer(async (req, res) => {
    try {
      const url = req.url ?? "/";
      const method = req.method ?? "GET";

      if (method === "GET" && url === "/health") {
        return sendJson(res, 200, { ok: true, service: "api" });
      }

      if (method === "GET" && url === "/connectors") {
        return sendJson(res, 200, { data: connectorRegistry });
      }

      if (method === "GET" && url === "/connections") {
        return sendJson(res, 200, { data: await listConnections() });
      }

      if (method === "POST" && url === "/connections") {
        const parsed = createConnectionRequestSchema.parse(await readJsonBody(req));
        const connection = await createConnection(parsed);

        if (parsed.credentials) {
          const secretId = await storeSecret(connection.id, parsed.credentials);
          await attachSecretToConnection(connection.id, secretId);
        }

        return sendJson(res, 201, { data: connection });
      }

      const syncMatch = url.match(/^\/connections\/([^/]+)\/sync$/);
      if (method === "POST" && syncMatch) {
        const connectionId = syncMatch[1];
        const connection = await getConnection(connectionId);
        if (!connection) {
          return sendJson(res, 404, { error: "Connection not found" });
        }

        const parsed = triggerSyncRequestSchema.parse(await readJsonBody(req));
        const job = await createJob({
          connectionId,
          connectorType: connection.connectorType,
          mode: parsed.mode,
          resource: parsed.resource
        });

        await enqueueSyncJob({
          jobId: job.id,
          connectionId,
          connectorType: connection.connectorType,
          mode: parsed.mode,
          resource: parsed.resource,
          source: "api"
        });

        logger.info("sync enqueued", { jobId: job.id, correlationId: job.id });
        return sendJson(res, 202, { data: job });
      }

      if (method === "POST" && url === "/schedules") {
        const parsed = scheduleRequestSchema.parse(await readJsonBody(req));
        const schedule = await createSchedule(parsed.connectionId, parsed.cron, parsed.resource);
        return sendJson(res, 201, { data: schedule });
      }

      const jobMatch = url.match(/^\/jobs\/([^/]+)$/);
      if (method === "GET" && jobMatch) {
        const job = await getJob(jobMatch[1]);
        if (!job) return sendJson(res, 404, { error: "Job not found" });
        return sendJson(res, 200, { data: job });
      }

      return sendJson(res, 404, { error: "Not found" });
    } catch (error) {
      if (error instanceof InvalidJsonError) {
        return sendJson(res, 400, { error: error.message });
      }
      if (error instanceof ZodError) {
        return sendJson(res, 400, { error: "Validation failed", details: error.issues });
      }
      return sendJson(res, 500, { error: error instanceof Error ? error.message : "Unknown server error" });
    }
  });
}

if (process.env.NODE_ENV !== "test") {
  const config = getConfig();
  const server = createApiServer();
  let shuttingDown = false;

  server.listen(config.port, () => {
    logger.info("service started", { port: config.port });
  });

  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info("graceful shutdown requested");
    server.close(() => process.exit(0));
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
