import { z } from "zod";

// Schema específico para o user
const UserSchema = z.object({
  session_id: z.string(),
  chapa: z.string().optional(), // opcional caso nem sempre venha
  emplid: z.string().optional(), // opcional caso nem sempre venha
});

export const StandardizedLogSchema = z.object({
  log_id: z.string(),
  conversation_id: z.string(),
  user: UserSchema,
  context: z.object({}).passthrough(),
  input: z.string(),
  intents: z.array(z.any()),
  entities: z.array(z.any()),
  output: z.array(z.any()).nullable().optional(),
  timestamp: z.date(),
});

export type StandardizedLog = z.infer<typeof StandardizedLogSchema>;
