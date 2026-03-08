import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const name = process.argv[2];
if (!name) {
  console.error("Usage: pnpm generate:connector <name>");
  process.exit(1);
}

const dir = join(process.cwd(), "connectors", name);
if (existsSync(dir)) {
  console.error(`Connector already exists: ${name}`);
  process.exit(1);
}

mkdirSync(join(dir, "src"), { recursive: true });
writeFileSync(join(dir, "connector.manifest.json"), JSON.stringify({
  id: name,
  name,
  version: "0.1.0",
  category: "custom",
  resources: [],
  capabilities: { incrementalSync: false, schemaDiscovery: false, webhooks: false }
}, null, 2));
writeFileSync(join(dir, "src", "index.ts"), `export const connectorName = "${name}";\n`);
console.log(`Created connector scaffold at ${dir}`);
