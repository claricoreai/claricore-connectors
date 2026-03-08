import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const manifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  category: z.string().min(1),
  resources: z.array(z.string()).optional(),
  capabilities: z.object({
    incrementalSync: z.boolean(),
    schemaDiscovery: z.boolean(),
    webhooks: z.boolean()
  })
});

let failed = 0;
for (const entry of readdirSync(join(process.cwd(), "connectors"), { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  try {
    const raw = readFileSync(join(process.cwd(), "connectors", entry.name, "connector.manifest.json"), "utf8");
    manifestSchema.parse(JSON.parse(raw));
    console.log(`OK ${entry.name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${entry.name}:`, error instanceof Error ? error.message : String(error));
  }
}
if (failed > 0) process.exit(1);
console.log("All manifests valid");
