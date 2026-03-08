import {
  ConnectorConfig,
  ConnectorHealth,
  ExtractContext,
  SchemaDefinition,
  SourceConnector,
  StreamConnector,
  TestConnectionResult
} from "@claricore/core";

export class SalesforceConnector implements SourceConnector, StreamConnector {
  id = "salesforce";
  name = "Salesforce";
  version = "0.4.0";

  async healthCheck(): Promise<ConnectorHealth> {
    return { ok: true, message: "Salesforce healthy" };
  }

  async testConnection(_config: ConnectorConfig): Promise<TestConnectionResult> {
    return { ok: true, message: "Demo Salesforce connection succeeded" };
  }

  async discoverSchema(_config: ConnectorConfig): Promise<SchemaDefinition[]> {
    return [{
      resource: "Account",
      fields: [
        { name: "Id", type: "string", required: true },
        { name: "Name", type: "string", required: true },
        { name: "LastModifiedDate", type: "datetime" }
      ]
    }];
  }

  async *extract(ctx: ExtractContext): AsyncGenerator<Record<string, unknown>> {
    const resource = ctx.resource ?? "Account";
    const now = new Date().toISOString();

    yield {
      source: "salesforce",
      resource,
      id: "001-demo",
      name: "Demo Account",
      updatedAt: now
    };

    yield {
      source: "salesforce",
      resource,
      id: "001-demo-2",
      name: "Acme Healthcare",
      updatedAt: now
    };
  }

  async subscribe(): Promise<void> {
    return;
  }

  async handleWebhook(payload: unknown): Promise<void> {
    console.log("Received Salesforce webhook", payload);
  }
}
