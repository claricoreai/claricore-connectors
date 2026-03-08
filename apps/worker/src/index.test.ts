import { describe, expect, it, vi } from "vitest";
import { createWorkerProcessor } from "./index";

type TestJob = {
  data: {
    jobId: string;
    connectionId: string;
    connectorType: string;
    mode: "full" | "incremental";
    source: "api" | "scheduler" | "webhook";
  };
  attemptsMade: number;
  opts: { attempts?: number };
};

function makeJob(overrides?: Partial<TestJob>): TestJob {
  return {
    data: {
      jobId: "j1",
      connectionId: "c1",
      connectorType: "salesforce",
      mode: "incremental",
      source: "api",
      ...overrides?.data
    },
    attemptsMade: overrides?.attemptsMade ?? 0,
    opts: overrides?.opts ?? { attempts: 1 }
  };
}

describe("worker flows", () => {
  it("handles successful salesforce sync", async () => {
    const updateJobStatus = vi.fn();
    const load = vi.fn().mockResolvedValue({ loadedCount: 1 });

    const processor = createWorkerProcessor({
      getConnection: vi.fn().mockResolvedValue({ id: "c1", connectorType: "salesforce" }),
      updateJobStatus,
      getCheckpoint: vi.fn().mockResolvedValue(null),
      upsertCheckpoint: vi.fn(),
      loader: { load },
      connectorFactory: () => ({
        async *extract() {
          yield { id: "001", name: "Acme" };
        }
      })
    });

    await processor(makeJob() as never);

    expect(updateJobStatus).toHaveBeenNthCalledWith(1, "j1", "running");
    expect(updateJobStatus).toHaveBeenLastCalledWith("j1", "completed", null);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("sends failed job to DLQ on final retry", async () => {
    const enqueueDeadLetter = vi.fn();
    const updateJobStatus = vi.fn();

    const processor = createWorkerProcessor({
      getConnection: vi.fn().mockResolvedValue({ id: "c1", connectorType: "salesforce" }),
      updateJobStatus,
      getCheckpoint: vi.fn().mockResolvedValue(null),
      upsertCheckpoint: vi.fn(),
      enqueueDeadLetter,
      loader: { load: vi.fn().mockRejectedValue(new Error("load failed")) },
      connectorFactory: () => ({
        async *extract() {
          yield { id: "001", name: "Acme" };
        }
      })
    });

    await expect(processor(makeJob({ attemptsMade: 0, opts: { attempts: 1 } }) as never)).rejects.toThrow("load failed");

    expect(updateJobStatus).toHaveBeenCalledWith("j1", "failed", "load failed");
    expect(enqueueDeadLetter).toHaveBeenCalledWith(expect.objectContaining({ jobId: "j1" }));
  });

  it("does not enqueue DLQ before final retry", async () => {
    const enqueueDeadLetter = vi.fn();

    const processor = createWorkerProcessor({
      getConnection: vi.fn().mockResolvedValue({ id: "c1", connectorType: "salesforce" }),
      updateJobStatus: vi.fn(),
      getCheckpoint: vi.fn().mockResolvedValue(null),
      upsertCheckpoint: vi.fn(),
      enqueueDeadLetter,
      loader: { load: vi.fn().mockRejectedValue(new Error("load failed")) },
      connectorFactory: () => ({
        async *extract() {
          yield { id: "001", name: "Acme" };
        }
      })
    });

    await expect(processor(makeJob({ attemptsMade: 0, opts: { attempts: 3 } }) as never)).rejects.toThrow("load failed");
    expect(enqueueDeadLetter).not.toHaveBeenCalled();
  });
});
