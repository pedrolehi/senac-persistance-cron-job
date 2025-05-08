// src/schemas/save-result.schema.ts
import { z } from "zod";

export const SaveResultSchema = z.object({
  success: z.boolean(),
  count: z.number(),
  duplicates: z.number(),
  error: z.string().optional(),
});

export type SaveResult = z.infer<typeof SaveResultSchema>;
