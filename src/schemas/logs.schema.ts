// src/schemas/logs.schema.ts
import { z } from "zod";

// Schema básico para logs (você pode ajustar baseado nos campos que precisa)
export const LogSchema = z.object({
  log_id: z.string(),
  request_timestamp: z.string(),
  response_timestamp: z.string(),
  language: z.string(),
  customer_id: z.string().optional(),
  assistant_id: z.string(),
  session_id: z.string(),
  input: z.any(),
  response: z.any(),
});

export const LogCollectionSchema = z.object({
  logs: z.array(LogSchema),
  pagination: z.object({
    next_url: z.string().nullable().optional(),
    matched: z.number().optional(),
    refresh_url: z.string().optional(),
  }),
});

export type Log = z.infer<typeof LogSchema>;
export type LogCollection = z.infer<typeof LogCollectionSchema>;
