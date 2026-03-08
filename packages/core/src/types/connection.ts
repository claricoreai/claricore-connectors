export interface ConnectorConfig {
  credentials?: Record<string, string>;
  options?: Record<string, unknown>;
}

export interface TestConnectionResult {
  ok: boolean;
  message: string;
}

export type SyncMode = "full" | "incremental" | "webhook";

export interface Connection {
  id: string;
  connectorType: string;
  name: string;
  status: "active" | "inactive";
  syncMode: SyncMode;
  configSecretId?: string | null;
  createdAt: string;
}

export interface CreateConnectionInput {
  connectorType: string;
  name: string;
  syncMode: "full" | "incremental";
  credentials?: Record<string, string>;
  options?: Record<string, unknown>;
}
