# Connector SDK

Connectors live in `connectors/<name>` and should export extraction logic and metadata.

## Generate a connector

```bash
pnpm generate:connector my-system
```

This creates manifest, TS config, source, README, and starter tests.

## Connector checklist
- Define capabilities in `connector.manifest.json`
- Export typed connector entrypoint
- Add tests for extraction and mapping logic
