# Contributing

Thanks for contributing to Claricore Connectors.

## Development workflow
1. Fork and create a feature branch.
2. Run `pnpm install`.
3. Run `pnpm lint && pnpm test && pnpm build`.
4. Open a PR with context, tests, and migration notes if applicable.

## Standards
- TypeScript only.
- Keep connectors isolated under `connectors/*`.
- Add tests with Vitest for new behavior.
