/**
 * @file logs.schema.ts
 * @description Schemas para validação dos logs brutos recebidos da API da IBM Watson Assistant
 */

import { z } from "zod";

/**
 * Schema para validação de um log individual da IBM
 * Este schema representa a estrutura exata dos dados recebidos da API
 */
export const LogSchema = z.object({
  log_id: z.string().describe("Identificador único do log na IBM"),
  request_timestamp: z.string().describe("Timestamp da requisição"),
  response_timestamp: z.string().describe("Timestamp da resposta"),
  language: z.string().describe("Idioma da conversa"),
  customer_id: z.string().optional().describe("ID do cliente (opcional)"),
  assistant_id: z.string().describe("ID do assistente virtual"),
  session_id: z.string().optional().describe("ID da sessão da conversa"),
  input: z.any().describe("Dados de entrada da conversa"),
  response: z.any().describe("Dados de resposta da conversa"),
});

/**
 * Schema para validação da coleção de logs retornada pela API
 * Inclui paginação e metadados
 */
export const LogCollectionSchema = z.object({
  logs: z.array(LogSchema).describe("Array de logs"),
  pagination: z.object({
    next_url: z
      .string()
      .nullable()
      .optional()
      .describe("URL para próxima página de resultados"),
    matched: z
      .number()
      .optional()
      .describe("Número total de registros encontrados"),
    refresh_url: z
      .string()
      .optional()
      .describe("URL para atualizar os resultados"),
  }),
});

// Tipos gerados a partir dos schemas
export type Log = z.infer<typeof LogSchema>;
export type LogCollection = z.infer<typeof LogCollectionSchema>;
