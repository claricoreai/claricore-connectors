export const connectorName = "template";

export async function* extract(): AsyncGenerator<Record<string, unknown>> {
  // TODO: Replace with real extraction from provider APIs.
  yield { id: "example", source: connectorName };
}
