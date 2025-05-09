/**
 * @file save-result.schema.ts
 * @description Schema para validação do resultado do salvamento de logs
 */

import { StandardizedLogSchema } from "./standardized-log.schema";
// src/schemas/save-result.schema.ts
import { z } from "zod";

/**
 * Schema para validação do resultado do salvamento
 * Contém informações sobre o sucesso da operação e estatísticas
 */
export const SaveResultSchema = z.object({
  success: z.boolean().describe("Indica se o salvamento foi bem-sucedido"),
  count: z.number().min(0).describe("Número de logs salvos com sucesso"),
  duplicates: z
    .number()
    .min(0)
    .describe("Número de logs duplicados encontrados"),
  savedLogs: StandardizedLogSchema.optional().describe(
    "Logs que foram salvos (opcional)"
  ),
  error: z.string().optional().describe("Mensagem de erro, se houver"),
});

export type SaveResult = z.infer<typeof SaveResultSchema>;
