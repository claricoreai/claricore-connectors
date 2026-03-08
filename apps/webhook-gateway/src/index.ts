import crypto from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { ZodError } from "zod";
import { getConfig } from "@claricore/config";
import { createJob, saveWebhookEvent } from "@claricore/db";
import { createLogger } from "@claricore/observability";
import { enqueueSyncJob } from "@claricore/queue";
import { webhookPayloadSchema } from "@claricore/ui-contracts";

const logger = createLogger({ service: "webhook-gateway" });

class InvalidJsonError extends Error {
  constructor() {
    super("Invalid JSON body");
  }
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data, null, 2));
}

async function readRawBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function parseJsonBody(rawBody: string): unknown {
  if (!rawBody) return {};
  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw new InvalidJsonError();
  }
}

export function verifyWebhookSignature(rawBody: string, signature: string | undefined, secret: string): boolean {
  if (!signature) return false;

  // TODO: support connector-specific signature formats/versioned headers.
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest();
  const provided = Buffer.from(signature, "hex");

  if (provided.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, provided);
}

export function createWebhookServer(): Server {
  const config = getConfig();

  return createServer(async (req, res) => {
    try {
      if (req.method === "GET" && req.url === "/health") {
        return sendJson(res, 200, { ok: true, service: "webhook-gateway" });
      }

      if (req.method !== "POST" || req.url !== "/webhooks") {
        return sendJson(res, 404, { error: "Not found" });
      }

      const rawBody = await readRawBody(req);
      const signature = req.headers["x-claricore-signature"];
      const signatureValue = typeof signature === "string" ? signature : undefined;

      if (!verifyWebhookSignature(rawBody, signatureValue, config.webhookSignatureSecret)) {
        return sendJson(res, 401, { error: "Invalid signature" });
      }

      const parsed = webhookPayloadSchema.parse(parseJsonBody(rawBody));
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

      logger.info("webhook received", { eventId: event.id, connectorType: parsed.connectorType });
      return sendJson(res, 202, { data: event });
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
  const server = createWebhookServer();
  let shuttingDown = false;

  server.listen(config.webhookPort, () => {
    logger.info("service started", { port: config.webhookPort });
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
