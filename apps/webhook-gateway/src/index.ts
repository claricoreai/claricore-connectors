import { createServer } from "node:http";
import { ZodError } from "zod";
import { getConfig } from "@claricore/config";
import { createJob, saveWebhookEvent } from "@claricore/db";
import { logInfo } from "@claricore/observability";
import { enqueueSyncJob } from "@claricore/queue";
import { webhookPayloadSchema } from "@claricore/ui-contracts";

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

createServer(async (req, res) => {
  try {
    if (req.method !== "POST" || req.url !== "/webhooks") {
      return sendJson(res, 404, { error: "Not found" });
    }

    const parsed = webhookPayloadSchema.parse(await readJsonBody(req));
    const event = await saveWebhookEvent(parsed);

    if (parsed.connectionId) {
      const job = await createJob({
        connectionId: parsed.connectionId,
        connectorType: parsed.connectorType,
        mode: "incremental",
        resource: parsed.resource
      });

      await enqueueSyncJob({
        jobId: job.id,
        connectionId: parsed.connectionId,
        connectorType: parsed.connectorType,
        mode: "incremental",
        resource: parsed.resource,
        source: "webhook"
      });
    }

    logInfo("webhook received", { eventId: event.id, connectorType: parsed.connectorType });
    return sendJson(res, 202, { data: event });
  } catch (error) {
    if (error instanceof ZodError) {
      return sendJson(res, 400, { error: "Validation failed", details: error.issues });
    }
    return sendJson(res, 500, { error: error instanceof Error ? error.message : "Unknown server error" });
  }
}).listen(config.webhookPort, () => {
  console.log(`@claricore/webhook-gateway listening on http://localhost:${config.webhookPort}`);
});
