import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  WEBHOOK_PORT: z.coerce.number().default(4100),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  QUEUE_NAME: z.string().min(1).default("sync-jobs"),
  LOG_LEVEL: z.string().default("info"),
  ENCRYPTION_KEY: z.string().length(64)
});

export function getConfig() {
  const env = envSchema.parse({
    PORT: process.env.PORT ?? 4000,
    WEBHOOK_PORT: process.env.WEBHOOK_PORT ?? 4100,
    DATABASE_URL: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/claricore",
    REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
    QUEUE_NAME: process.env.QUEUE_NAME ?? "sync-jobs",
    LOG_LEVEL: process.env.LOG_LEVEL ?? "info",
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ?? "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
  });

  return {
    port: env.PORT,
    webhookPort: env.WEBHOOK_PORT,
    databaseUrl: env.DATABASE_URL,
    redisUrl: env.REDIS_URL,
    queueName: env.QUEUE_NAME,
    logLevel: env.LOG_LEVEL,
    encryptionKey: env.ENCRYPTION_KEY
  };
}
