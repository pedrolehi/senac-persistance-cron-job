// src/schemas/assistant.schema.ts
import { z } from "zod";

// Schema para Assistant Skills
const AssistantSkillSchema = z.object({
  type: z.string(),
  skill_id: z.string(),
});

// Schema para Assistant Environments
const AssistantEnvironmentSchema = z.object({
  name: z.string(),
  environment: z.string(),
  environment_id: z.string(),
});

// Schema para um Assistant individual
export const AssistantSchema = z.object({
  name: z.string(),
  language: z.string(),
  description: z.string(),
  assistant_id: z.string(),
  assistant_skills: z.array(AssistantSkillSchema),
  assistant_environments: z.array(AssistantEnvironmentSchema),
});

// Schema para a paginação
const PaginationSchema = z.object({
  refresh_url: z.string(),
});

// Schema para a resposta completa
export const AssistantResponseSchema = z.object({
  assistants: z.array(AssistantSchema),
  pagination: PaginationSchema,
});

// Types gerados dos schemas
export type Assistant = z.infer<typeof AssistantSchema>;
export type AssistantResponse = z.infer<typeof AssistantResponseSchema>;
