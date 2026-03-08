import type { LoadContext, LoadResult } from "@claricore/core";
import { logInfo } from "@claricore/observability";

export class ClaricoreLoader {
  async load(ctx: LoadContext, records: AsyncGenerator<Record<string, unknown>>): Promise<LoadResult> {
    let loadedCount = 0;
    for await (const record of records) {
      loadedCount += 1;
      logInfo("loaded record", { connectionId: ctx.connectionId, runId: ctx.runId, record });
    }
    return {
      loadedCount,
      destination: ctx.destination ?? "claricore-ingestion-api"
    };
  }
}
