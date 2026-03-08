import { describe, expect, it } from "vitest";
import { connectorName } from "../src/index";

describe("connector-template", () => {
  it("exports name", () => {
    expect(connectorName).toBe("template");
  });
});
