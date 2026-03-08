import { z } from "zod";

export const createConnectionRequestSchema = z.object({
  connectorType: z.string().min(1),
  name: z.string().min(1),
  syncMode: z.enum(["full", "incremental"]),
  credentials: z.record(z.string()).optional(),
  options: z.record(z.any()).optional()
});

export const triggerSyncRequestSchema = z.object({
  mode: z.enum(["full", "incremental"]),
  resource: z.string().min(1).optional()
});

export const webhookPayloadSchema = z.object({
  connectorType: z.string().min(1),
  connectionId: z.string().uuid().optional(),
  resource: z.string().min(1).optional(),
  eventType: z.string().min(1),
  payload: z.record(z.any())
});

export const scheduleRequestSchema = z.object({
  connectionId: z.string().uuid(),
  resource: z.string().min(1).optional(),
  cron: z.string().min(5)
});

export type CreateConnectionRequest = z.infer<typeof createConnectionRequestSchema>;
export type TriggerSyncRequest = z.infer<typeof triggerSyncRequestSchema>;
export type WebhookPayloadRequest = z.infer<typeof webhookPayloadSchema>;
export type ScheduleRequest = z.infer<typeof scheduleRequestSchema>;
