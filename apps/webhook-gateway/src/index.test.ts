import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = { createJob: vi.fn(), saveWebhookEvent: vi.fn() };
const queue = { enqueueSyncJob: vi.fn() };

vi.mock("@claricore/db", () => db);
vi.mock("@claricore/queue", () => queue);
vi.mock("@claricore/config", () => ({
  getConfig: () => ({ webhookPort: 4100, webhookSignatureSecret: "test-secret" })
}));

import { createWebhookServer } from "./index";

function sign(body: string): string {
  return crypto.createHmac("sha256", "test-secret").update(body).digest("hex");
}

describe("webhook routes", () => {
  let server: ReturnType<typeof createWebhookServer>;
  let port = 0;

  beforeEach(async () => {
    db.createJob.mockReset();
    db.saveWebhookEvent.mockReset();
    queue.enqueueSyncJob.mockReset();

    server = createWebhookServer();
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Unexpected server address");
    }
    port = address.port;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("POST /webhooks", async () => {
    db.saveWebhookEvent.mockResolvedValue({ id: "e1" });
    db.createJob.mockResolvedValue({ id: "j1" });

    const payload = {
      connectorType: "salesforce",
      connectionId: "550e8400-e29b-41d4-a716-446655440000",
      eventType: "updated",
      payload: { id: "001" }
    };
    const raw = JSON.stringify(payload);

    const res = await fetch(`http://127.0.0.1:${port}/webhooks`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-claricore-signature": sign(raw)
      },
      body: raw
    });

    expect(res.status).toBe(202);
    expect(queue.enqueueSyncJob).toHaveBeenCalledWith(expect.objectContaining({ source: "webhook" }));
  });

  it("returns 401 for missing signature", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/webhooks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ connectorType: "salesforce", eventType: "updated", payload: { id: "001" } })
    });

    expect(res.status).toBe(401);
  });

  it("returns 401 for bad signature", async () => {
    const raw = JSON.stringify({ connectorType: "salesforce", eventType: "updated", payload: { id: "001" } });

    const res = await fetch(`http://127.0.0.1:${port}/webhooks`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-claricore-signature": "deadbeef"
      },
      body: raw
    });

    expect(res.status).toBe(401);
  });
});
