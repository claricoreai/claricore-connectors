import { BaseConnector } from "./base-connector";
import { LoadContext, LoadResult } from "../types/jobs";

export interface DestinationConnector extends BaseConnector {
  load(ctx: LoadContext, records: AsyncGenerator<Record<string, unknown>>): Promise<LoadResult>;
}
