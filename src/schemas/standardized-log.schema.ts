import { z } from "zod";

// Schema específico para o user
const UserSchema = z.object({
  session_id: z.string(),
  chapa: z.string().optional(), // opcional caso nem sempre venha
  emplid: z.string().optional(), // opcional caso nem sempre venha
});

export const StandardizedLogSchema = z.object({
  conversation_id: z.string(),
  user: UserSchema,
  context: z.object({}).passthrough(),
  input: z.string(),
  intents: z.array(z.any()),
  entities: z.array(z.any()),
  output: z.object({}).passthrough().nullable().optional(),
  timestamp: z.string().or(z.date()).optional(),
});

export type StandardizedLog = z.infer<typeof StandardizedLogSchema>;
