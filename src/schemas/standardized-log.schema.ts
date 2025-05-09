/**
 * @file standardized-log.schema.ts
 * @description Schema para validação dos logs padronizados antes de salvar no MongoDB
 */

import { z } from "zod";

/**
 * Schema para dados do usuário
 * Contém informações básicas de identificação do usuário
 */
const UserSchema = z.object({
  session_id: z.string().describe("ID da sessão do usuário"),
  chapa: z
    .string()
    .optional()
    .describe("Número da chapa do funcionário (opcional)"),
  emplid: z
    .string()
    .optional()
    .describe("ID do funcionário no sistema (opcional)"),
});

/**
 * Schema para validação do log padronizado
 * Este schema define a estrutura que será salva no MongoDB
 * Os dados são transformados do formato IBM para este formato padronizado
 */
export const StandardizedLogSchema = z.object({
  log_id: z.string().describe("ID único do log"),
  conversation_id: z.string().describe("ID da conversa"),
  user: UserSchema.describe("Dados do usuário"),
  context: z
    .object({})
    .passthrough()
    .describe("Contexto da conversa (campos dinâmicos)"),
  input: z.string().describe("Texto de entrada do usuário"),
  intents: z.array(z.any()).describe("Intenções detectadas"),
  entities: z.array(z.any()).describe("Entidades detectadas"),
  output: z
    .array(z.any())
    .nullable()
    .optional()
    .describe("Respostas do assistente"),
  timestamp: z.date().describe("Data e hora do log"),
});

// Tipo gerado a partir do schema
export type StandardizedLog = z.infer<typeof StandardizedLogSchema>;
