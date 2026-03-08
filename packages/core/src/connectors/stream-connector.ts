import { BaseConnector } from "./base-connector";

export interface StreamConnector extends BaseConnector {
  subscribe(): Promise<void>;
  handleWebhook(payload: unknown): Promise<void>;
}
