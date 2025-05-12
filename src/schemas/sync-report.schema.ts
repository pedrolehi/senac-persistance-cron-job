/**
 * @file sync-report.schema.ts
 * @description Schema para validação do relatório de sincronização
 */

import { z } from "zod";
import { LogCollectionSchema } from "./logs.schema";

/**
 * Schema para validação do relatório de sincronização
 * Contém informações sobre o status da sincronização e logs faltantes/incluídos
 */
export const SyncStatusSchema = z.object({
  status: z.enum(["SUCCESS", "PARTIAL", "FAILURE"]),
  missingLogs: z.array(
    z.object({
      assistant: z.string(),
      logId: z.string(),
      timestamp: z.string(),
    })
  ),
  includedLogs: z.array(
    z.object({
      assistant: z.string(),
      logId: z.string(),
      timestamp: z.string(),
    })
  ),
});

// Schema para o resumo de cada assistente
export const AssistantSummarySchema = z.object({
  name: z.string(),
  watsonLogs: z.number(),
  savedLogs: z.number(),
});

export const SyncReportSchema = z.object({
  timestamp: z.string(),
  syncStatus: SyncStatusSchema,
  summary: z.object({
    totalLogs: z.number(),
    includedLogs: z.number(),
    missingLogs: z.number(),
    assistants: z.array(AssistantSummarySchema),
  }),
  sanitizedLogs: z.record(z.string(), LogCollectionSchema).default({}),
});

// Tipo gerado a partir do schema
export type SyncStatus = z.infer<typeof SyncStatusSchema>;
export type SyncReport = z.infer<typeof SyncReportSchema>;
export type AssistantSummary = z.infer<typeof AssistantSummarySchema>;
