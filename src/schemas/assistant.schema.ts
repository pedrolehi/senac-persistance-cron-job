import { z } from "zod";

export const AssistantSchema = z.object({
  assistant_id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  language: z.string(),
  created: z.string().datetime(),
  updated: z.string().datetime(),
  environment_id: z.string().optional(),
  workspace_id: z.string().optional(),
  status: z.enum(["Available", "Unavailable", "Training"]),
});

export const AssistantResponseSchema = z.object({
  assistants: z.array(AssistantSchema),
  pagination: z
    .object({
      refresh_url: z.string().optional(),
      next_url: z.string().optional(),
      total: z.number().optional(),
      matched: z.number().optional(),
    })
    .optional(),
});

// Types

export type Assistant = z.infer<typeof AssistantSchema>;
export type AssistantResponse = z.infer<typeof AssistantResponseSchema>;
