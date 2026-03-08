export interface ConnectorManifest {
  id: string;
  name: string;
  version: string;
  category: string;
  resources?: string[];
  capabilities: {
    incrementalSync: boolean;
    schemaDiscovery: boolean;
    webhooks: boolean;
  };
}

export const connectorRegistry: ConnectorManifest[] = [
  {
    id: "salesforce",
    name: "Salesforce",
    version: "0.4.0",
    category: "crm",
    resources: ["Account", "Contact", "Opportunity"],
    capabilities: {
      incrementalSync: true,
      schemaDiscovery: true,
      webhooks: true
    }
  }
];
