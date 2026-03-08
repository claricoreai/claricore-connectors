import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type MockFn = ReturnType<typeof vi.fn>;

type DbMocks = {
  createConnection: MockFn;
  attachSecretToConnection: MockFn;
  createJob: MockFn;
  createSchedule: MockFn;
  getConnection: MockFn;
  getJob: MockFn;
  listConnections: MockFn;
};

const db: DbMocks = {
  createConnection: vi.fn(),
  attachSecretToConnection: vi.fn(),
  createJob: vi.fn(),
  createSchedule: vi.fn(),
  getConnection: vi.fn(),
  getJob: vi.fn(),
  listConnections: vi.fn()
};

const queue = { enqueueSyncJob: vi.fn() };
const secrets = { storeSecret: vi.fn() };

vi.mock("@claricore/db", () => db);
vi.mock("@claricore/queue", () => queue);
vi.mock("@claricore/secret-manager", () => secrets);
vi.mock("@claricore/registry", () => ({ connectorRegistry: [] }));

import { createApiServer } from "./index";

async function request(port: number, path: string, options?: RequestInit): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...(options?.headers ?? {}) }
  });

  return {
    status: res.status,
    body: (await res.json()) as unknown
  };
}

describe("api routes", () => {
  let server: ReturnType<typeof createApiServer>;
  let port = 0;

  beforeEach(async () => {
    Object.values(db).forEach((fn) => fn.mockReset());
    queue.enqueueSyncJob.mockReset();
    secrets.storeSecret.mockReset();

    server = createApiServer();
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

  it("POST /connections", async () => {
    db.createConnection.mockResolvedValue({ id: "c1", connectorType: "salesforce" });
    secrets.storeSecret.mockResolvedValue("s1");

    const res = await request(port, "/connections", {
      method: "POST",
      body: JSON.stringify({
        connectorType: "salesforce",
        name: "Prod",
        syncMode: "incremental",
        credentials: { token: "x" }
      })
    });

    expect(res.status).toBe(201);
    expect(db.createConnection).toHaveBeenCalled();
    expect(secrets.storeSecret).toHaveBeenCalledWith("c1", { token: "x" });
    expect(db.attachSecretToConnection).toHaveBeenCalledWith("c1", "s1");
  });

  it("POST /connections/:id/sync", async () => {
    db.getConnection.mockResolvedValue({ id: "c1", connectorType: "salesforce" });
    db.createJob.mockResolvedValue({ id: "j1" });

    const res = await request(port, "/connections/c1/sync", {
      method: "POST",
      body: JSON.stringify({ mode: "full" })
    });

    expect(res.status).toBe(202);
    expect(queue.enqueueSyncJob).toHaveBeenCalledWith(expect.objectContaining({ jobId: "j1", source: "api" }));
  });

  it("POST /connections/:id/sync returns 404 when connection does not exist", async () => {
    db.getConnection.mockResolvedValue(undefined);

    const res = await request(port, "/connections/missing/sync", {
      method: "POST",
      body: JSON.stringify({ mode: "incremental" })
    });

    expect(res.status).toBe(404);
  });

  it("POST /schedules", async () => {
    db.createSchedule.mockResolvedValue({ id: "s1" });

    const res = await request(port, "/schedules", {
      method: "POST",
      body: JSON.stringify({ connectionId: "550e8400-e29b-41d4-a716-446655440000", cron: "* * * * *" })
    });

    expect(res.status).toBe(201);
  });

  it("GET /jobs/:id", async () => {
    db.getJob.mockResolvedValue({ id: "j1", status: "queued" });
    const res = await request(port, "/jobs/j1");

    expect(res.status).toBe(200);
    expect((res.body as { data: { id: string } }).data.id).toBe("j1");
  });

  it("returns 400 for invalid JSON", async () => {
    const res = await fetch(`http://127.0.0.1:${port}/connections`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{"
    });

    expect(res.status).toBe(400);
  });
});
