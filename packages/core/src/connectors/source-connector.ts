import { BaseConnector } from "./base-connector";
import { ExtractContext } from "../types/jobs";
import { SchemaDefinition } from "../types/schema";
import { ConnectorConfig, TestConnectionResult } from "../types/connection";

export interface SourceConnector extends BaseConnector {
  testConnection(config: ConnectorConfig): Promise<TestConnectionResult>;
  discoverSchema(config: ConnectorConfig): Promise<SchemaDefinition[]>;
  extract(ctx: ExtractContext): AsyncGenerator<Record<string, unknown>>;
}
