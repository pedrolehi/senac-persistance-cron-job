// src/schemas/logs-response.schema.ts
import { z } from "zod";
import { LogCollectionSchema } from "./logs.schema";

export const LogsResponseSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  assistants: z.record(LogCollectionSchema),
});

export type LogsResponse = z.infer<typeof LogsResponseSchema>;
