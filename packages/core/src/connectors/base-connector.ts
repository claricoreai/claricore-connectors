export interface ConnectorHealth {
  ok: boolean;
  message?: string;
}

export interface BaseConnector {
  id: string;
  name: string;
  version: string;
  healthCheck(): Promise<ConnectorHealth>;
}
