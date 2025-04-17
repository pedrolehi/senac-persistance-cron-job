import { z } from "zod";

export const LogsRequestSchema = z.object({});

export type LogsRequest = z.infer<typeof LogsRequestSchema>;
