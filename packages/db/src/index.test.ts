import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.fn();
vi.mock("./client", () => ({ pool: { query } }));

import { createConnection, createJob, updateJobStatus } from "./index";

describe("db query layer", () => {
  beforeEach(() => {
    query.mockReset();
  });

  it("creates connection with expected SQL parameters", async () => {
    query.mockResolvedValue({ rows: [{ id: "c1", connectorType: "salesforce" }] });
    await createConnection({ connectorType: "salesforce", name: "SF", syncMode: "incremental" });

    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO connections"), [
      "salesforce",
      "SF",
      "incremental"
    ]);
  });

  it("creates sync job with default queued status", async () => {
    query.mockResolvedValue({ rows: [{ id: "j1" }] });
    await createJob({ connectionId: "c1", connectorType: "salesforce", mode: "full" });
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO sync_jobs"), [
      "c1",
      "salesforce",
      "full",
      null
    ]);
  });

  it("updates job status", async () => {
    query.mockResolvedValue({ rows: [] });
    await updateJobStatus("j1", "failed", "boom");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("UPDATE sync_jobs SET status"), [
      "j1",
      "failed",
      "boom"
    ]);
  });
});
