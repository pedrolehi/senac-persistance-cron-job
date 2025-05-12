/**
 * @file assistant.schema.ts
 * @description Schemas para validação dos dados do Watson Assistant
 */

import { z } from "zod";

/**
 * Schema para habilidades do assistente
 */
export const AssistantSkillSchema = z.object({
  type: z.string().describe("Tipo da habilidade"),
  skill_id: z.string().describe("ID único da habilidade"),
});

/**
 * Schema para ambientes do assistente
 */
export const AssistantEnvironmentSchema = z.object({
  name: z.string().describe("Nome do ambiente (ex: 'live', 'development')"),
  environment: z.string().describe("Tipo do ambiente"),
  environment_id: z.string().describe("ID único do ambiente"),
});

/**
 * Schema para um assistente individual
 */
export const AssistantSchema = z.object({
  name: z.string().min(1).describe("Nome do assistente"),
  language: z.string().min(2).describe("Idioma do assistente"),
  description: z.string().describe("Descrição do assistente"),
  assistant_id: z.string().min(1).describe("ID único do assistente"),
  assistant_skills: z
    .array(AssistantSkillSchema)
    .describe("Lista de habilidades do assistente"),
  assistant_environments: z
    .array(AssistantEnvironmentSchema)
    .describe("Lista de ambientes do assistente"),
});

/**
 * Schema para paginação
 */
export const PaginationSchema = z.object({
  refresh_url: z
    .string()
    .describe("Caminho relativo ou URL para atualizar os resultados"),
});

/**
 * Schema para a resposta completa da API de assistentes
 */
export const AssistantResponseSchema = z.object({
  assistants: z.array(AssistantSchema).describe("Lista de assistentes"),
  pagination: PaginationSchema.describe("Informações de paginação"),
});

// Types gerados dos schemas
export type Assistant = z.infer<typeof AssistantSchema>;
export type AssistantResponse = z.infer<typeof AssistantResponseSchema>;
export type AssistantSkill = z.infer<typeof AssistantSkillSchema>;
export type AssistantEnvironment = z.infer<typeof AssistantEnvironmentSchema>;
