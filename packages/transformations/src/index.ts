export interface CanonicalCustomer {
  externalId: string;
  source: string;
  name: string;
  updatedAt?: string;
}

export function mapSalesforceAccount(record: Record<string, unknown>): CanonicalCustomer {
  return {
    externalId: String(record.id ?? ""),
    source: "salesforce",
    name: String(record.name ?? ""),
    updatedAt: record.updatedAt ? String(record.updatedAt) : undefined
  };
}
