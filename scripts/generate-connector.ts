import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const name = process.argv[2];
if (!name) {
  console.error("Usage: pnpm generate:connector <name>");
  process.exit(1);
}

const packageName = `@claricore/connector-${name}`;
const dir = join(process.cwd(), "connectors", name);
if (existsSync(dir)) {
  console.error(`Connector already exists: ${name}`);
  process.exit(1);
}

mkdirSync(join(dir, "src"), { recursive: true });
mkdirSync(join(dir, "test"), { recursive: true });

writeFileSync(
  join(dir, "package.json"),
  JSON.stringify(
    {
      name: packageName,
      version: "0.1.0",
      private: false,
      main: "dist/index.js",
      types: "dist/index.d.ts",
      files: ["dist", "connector.manifest.json"],
      scripts: {
        dev: "tsc -w -p tsconfig.json",
        build: "tsc -p tsconfig.json",
        lint: "eslint src test --ext .ts",
        test: "vitest run",
        typecheck: "tsc --noEmit -p tsconfig.json",
        clean: "rm -rf dist"
      },
      dependencies: {
        "@claricore/core": "workspace:*"
      }
    },
    null,
    2
  )
);

writeFileSync(
  join(dir, "tsconfig.json"),
  JSON.stringify(
    {
      extends: "../../tsconfig.base.json",
      compilerOptions: {
        outDir: "dist",
        rootDir: "src"
      },
      include: ["src/**/*.ts", "test/**/*.ts"]
    },
    null,
    2
  )
);

writeFileSync(
  join(dir, "connector.manifest.json"),
  JSON.stringify(
    {
      id: name,
      name,
      version: "0.1.0",
      category: "custom",
      resources: ["default"],
      capabilities: {
        incrementalSync: true,
        schemaDiscovery: true,
        webhooks: false
      }
    },
    null,
    2
  )
);

writeFileSync(
  join(dir, "src", "index.ts"),
  `export const connectorName = "${name}";\n\nexport async function* extract(): AsyncGenerator<Record<string, unknown>> {\n  // TODO: implement API client pagination and checkpointed extraction.\n  yield { id: "example", source: connectorName };\n}\n`
);

writeFileSync(
  join(dir, "README.md"),
  `# ${packageName}\n\nGenerated Claricore connector scaffold.\n\n## Development\n\n\`\`\`bash\npnpm --filter ${packageName} build\npnpm --filter ${packageName} test\n\`\`\`\n`
);

writeFileSync(
  join(dir, "test", "index.test.ts"),
  `import { describe, expect, it } from "vitest";\nimport { connectorName, extract } from "../src/index";\n\ndescribe("${packageName}", () => {\n  it("exports connector name", () => {\n    expect(connectorName).toBe("${name}");\n  });\n\n  it("yields at least one record", async () => {\n    const records: unknown[] = [];\n    for await (const row of extract()) records.push(row);\n    expect(records.length).toBeGreaterThan(0);\n  });\n});\n`
);

console.log(`Created connector scaffold at ${dir}`);
