import crypto from "node:crypto";
import { getConfig } from "@claricore/config";
import { Pool } from "pg";

const config = getConfig();
const pool = new Pool({ connectionString: config.databaseUrl });

function getKey(): Buffer {
  return Buffer.from(config.encryptionKey, "hex");
}

export function encryptSecret(value: Record<string, unknown>): { iv: string; ciphertext: string; tag: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString("hex"),
    ciphertext: encrypted.toString("hex"),
    tag: tag.toString("hex")
  };
}

export function decryptSecret(secret: { iv: string; ciphertext: string; tag: string }): Record<string, unknown> {
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(secret.iv, "hex"));
  decipher.setAuthTag(Buffer.from(secret.tag, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(secret.ciphertext, "hex")),
    decipher.final()
  ]);
  return JSON.parse(decrypted.toString("utf8")) as Record<string, unknown>;
}

export async function storeSecret(connectionId: string, value: Record<string, unknown>): Promise<string> {
  const encrypted = encryptSecret(value);
  const result = await pool.query(
    `INSERT INTO connection_secrets (connection_id, iv, ciphertext, auth_tag)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [connectionId, encrypted.iv, encrypted.ciphertext, encrypted.tag]
  );
  return result.rows[0].id as string;
}

export async function getSecret(secretId: string): Promise<Record<string, unknown> | null> {
  const result = await pool.query(
    `SELECT id, iv, ciphertext, auth_tag AS tag
     FROM connection_secrets
     WHERE id = $1`,
    [secretId]
  );
  if (result.rowCount === 0) return null;
  return decryptSecret(result.rows[0] as { iv: string; ciphertext: string; tag: string });
}
