import { createServer } from "node:http";
import { ZodError } from "zod";
import { getConfig } from "@claricore/config";
import { attachSecretToConnection, createConnection, createJob, createSchedule, getConnection, getJob, listConnections } from "@claricore/db";
import { enqueueSyncJob } from "@claricore/queue";
import { connectorRegistry } from "@claricore/registry";
import { storeSecret } from "@claricore/secret-manager";
import { createConnectionRequestSchema, scheduleRequestSchema, triggerSyncRequestSchema } from "@claricore/ui-contracts";

const config = getConfig();

function sendJson(res: import("node:http").ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data, null, 2));
}

async function readJsonBody(req: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

const server = createServer(async (req, res) => {
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
    if (error instanceof ZodError) {
      return sendJson(res, 400, { error: "Validation failed", details: error.issues });
    }
    return sendJson(res, 500, { error: error instanceof Error ? error.message : "Unknown server error" });
  }
});

server.listen(config.port, () => {
  console.log(`@claricore/api listening on http://localhost:${config.port}`);
});
