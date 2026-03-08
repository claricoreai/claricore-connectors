import { createConnection } from "./index";
import { pool } from "./client";

async function main(): Promise<void> {
  await createConnection({
    connectorType: "salesforce",
    name: "Seeded Salesforce",
    syncMode: "full"
  });
  console.log("Seed complete");
  await pool.end();
}
void main();
