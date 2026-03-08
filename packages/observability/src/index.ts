export type LogLevel = "info" | "error";

export interface LogContext {
  service?: string;
  correlationId?: string;
  jobId?: string;
  [key: string]: unknown;
}

function emit(level: LogLevel, message: string, meta?: LogContext): void {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta
  };
  const serialized = JSON.stringify(payload);
  if (level === "error") {
    console.error(serialized);
    return;
  }
  console.log(serialized);
}

export function createLogger(defaultContext: LogContext) {
  return {
    info(message: string, meta?: LogContext): void {
      emit("info", message, { ...defaultContext, ...meta });
    },
    error(message: string, meta?: LogContext): void {
      emit("error", message, { ...defaultContext, ...meta });
    }
  };
}

export function logInfo(message: string, meta?: Record<string, unknown>): void {
  emit("info", message, meta);
}

export function logError(message: string, meta?: Record<string, unknown>): void {
  emit("error", message, meta);
}

export class Metrics {
  increment(name: string, value = 1, tags?: Record<string, string>): void {
    logInfo("metric.increment", { metric: name, value, tags });
  }

  timing(name: string, ms: number, tags?: Record<string, string>): void {
    logInfo("metric.timing", { metric: name, ms, tags });
  }
}

export const metrics = new Metrics();

export function startSpan(name: string): { end: () => void } {
  const started = Date.now();
  return {
    end: () => {
      logInfo("span.completed", { span: name, durationMs: Date.now() - started });
    }
  };
}
