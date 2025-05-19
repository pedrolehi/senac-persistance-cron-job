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
  session_id: z.string().optional().describe("ID da sessão do usuário"),
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
 * Schema para validação do log sanitizado
 * Este schema define a estrutura dos logs que vêm do IBM Watson
 */
export const SanitizedLogSchema = z.object({
  log_id: z.string().optional().describe("ID único do log"),
  request_timestamp: z.string().describe("Timestamp da requisição"),
  response_timestamp: z.string().describe("Timestamp da resposta"),
  language: z.string().describe("Idioma da conversa"),
  customer_id: z.string().describe("ID do cliente"),
  assistant_id: z.string().describe("ID do assistente"),
  session_id: z.string().optional().describe("ID da sessão"),
  response: z.any().describe("Resposta do assistente"),
});

// Tipo gerado a partir do schema
export type SanitizedLog = z.infer<typeof SanitizedLogSchema>;

/**
 * Schema para validação do log padronizado
 * Este schema define a estrutura que será salva no MongoDB
 * Os dados são transformados do formato IBM para este formato padronizado
 */
export const StandardizedLogSchema = z.object({
  // Campos obrigatórios (agora opcionais para teste)
  log_id: z.string().optional().describe("ID único do log"),
  timestamp: z.date().describe("Data e hora do log"),
  user: UserSchema.optional().describe("Dados do usuário"),

  // Campos opcionais com valores padrão
  conversation_id: z.string().optional().describe("ID da conversa"),
  context: z
    .object({})
    .passthrough()
    .optional()
    .describe("Contexto da conversa (campos dinâmicos)"),
  input: z.string().optional().describe("Texto de entrada do usuário"),
  intents: z.array(z.any()).optional().describe("Intenções detectadas"),
  entities: z.array(z.any()).optional().describe("Entidades detectadas"),
  output: z
    .array(z.any())
    .nullable()
    .optional()
    .describe("Respostas do assistente"),

  // Campos adicionais para compatibilidade com logs sanitizados
  request_timestamp: z.string().optional().describe("Timestamp da requisição"),
  response_timestamp: z.string().optional().describe("Timestamp da resposta"),
  language: z.string().optional().describe("Idioma da conversa"),
  customer_id: z.string().optional().describe("ID do cliente"),
  assistant_id: z.string().optional().describe("ID do assistente"),
  session_id: z.string().optional().describe("ID da sessão"),
  response: z.any().optional().describe("Resposta do assistente"),
});

// Tipo gerado a partir do schema
export type StandardizedLog = z.infer<typeof StandardizedLogSchema>;
