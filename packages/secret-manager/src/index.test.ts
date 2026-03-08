import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "./index";

describe("secret-manager", () => {
  it("encrypts and decrypts payloads", () => {
    const payload = { clientId: "abc", clientSecret: "def" };
    const encrypted = encryptSecret(payload);

    expect(encrypted.ciphertext).not.toContain("abc");
    expect(decryptSecret(encrypted)).toEqual(payload);
  });
});
