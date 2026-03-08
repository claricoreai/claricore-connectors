import { describe, expect, it } from "vitest";
import { mapSalesforceAccount } from "./index";

describe("mapSalesforceAccount", () => {
  it("maps known fields to canonical customer", () => {
    expect(mapSalesforceAccount({ id: "001", name: "Acme", updatedAt: "2024-01-01" })).toEqual({
      externalId: "001",
      source: "salesforce",
      name: "Acme",
      updatedAt: "2024-01-01"
    });
  });
});
