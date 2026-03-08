import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pool } from "./client";

async function main(): Promise<void> {
  const dir = join(__dirname, "..", "migrations");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    await pool.query(readFileSync(join(dir, file), "utf8"));
    console.log(`Applied ${file}`);
  }
  await pool.end();
}
void main();
