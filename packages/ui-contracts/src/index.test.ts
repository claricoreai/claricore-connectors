import { describe, expect, it } from "vitest";
import { createConnectionRequestSchema, scheduleRequestSchema, webhookPayloadSchema } from "./index";

describe("ui-contracts schemas", () => {
  it("validates create connection input", () => {
    const result = createConnectionRequestSchema.safeParse({
      connectorType: "salesforce",
      name: "SF Prod",
      syncMode: "incremental"
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid schedule", () => {
    const result = scheduleRequestSchema.safeParse({ connectionId: "abc", cron: "* *" });
    expect(result.success).toBe(false);
  });

  it("accepts webhook payload shape", () => {
    const result = webhookPayloadSchema.safeParse({
      connectorType: "salesforce",
      eventType: "account.updated",
      payload: { id: "001" }
    });
    expect(result.success).toBe(true);
  });
});
