export function logInfo(message: string, meta?: Record<string, unknown>): void {
  console.log(JSON.stringify({ level: "info", message, ...meta }));
}

export function logError(message: string, meta?: Record<string, unknown>): void {
  console.error(JSON.stringify({ level: "error", message, ...meta }));
}

export class Metrics {
  increment(name: string, value = 1, tags?: Record<string, string>): void {
    console.log(JSON.stringify({ metric: name, value, tags }));
  }

  timing(name: string, ms: number, tags?: Record<string, string>): void {
    console.log(JSON.stringify({ metric: name, ms, tags }));
  }
}

export const metrics = new Metrics();

export function startSpan(name: string): { end: () => void } {
  const started = Date.now();
  return {
    end: () => {
      console.log(JSON.stringify({ span: name, durationMs: Date.now() - started }));
    }
  };
}
