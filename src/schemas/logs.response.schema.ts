/**
 * @file logs.response.schema.ts
 * @description Schema para validação da resposta de logs do Watson Assistant
 */

import { z } from "zod";
import { LogCollectionSchema } from "./logs.schema";

/**
 * Schema para validação da resposta de logs
 * Inclui datas de início e fim, e logs de todos os assistentes
 */
export const LogsResponseSchema = z.object({
  startDate: z
    .string()
    .datetime()
    .describe("Data de início do período em ISO 8601"),
  endDate: z.string().datetime().describe("Data de fim do período em ISO 8601"),
  assistants: z
    .record(LogCollectionSchema)
    .describe("Mapa de logs por assistente"),
});

export type LogsResponse = z.infer<typeof LogsResponseSchema>;
