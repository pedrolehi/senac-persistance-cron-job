/**
 * @file logger.schema.ts
 * @description Schema para validação do logger
 */

import { z } from "zod";

export const RateLimitHeadersSchema = z.object({
  "x-ratelimit-remaining": z.string().optional(),
  "x-ratelimit-limit": z.string().optional(),
  "x-ratelimit-reset": z.string().optional(),
});

export const LoggerSchema = z.object({
  info: z.function().args(z.string(), z.unknown().optional()).returns(z.void()),
  warn: z.function().args(z.string(), z.unknown().optional()).returns(z.void()),
  error: z
    .function()
    .args(z.string(), z.unknown().optional())
    .returns(z.void()),
  debug: z
    .function()
    .args(z.string(), z.unknown().optional())
    .returns(z.void()),
  logRateLimit: z
    .function()
    .args(RateLimitHeadersSchema, z.string().optional())
    .returns(z.void()),
});

export type Logger = z.infer<typeof LoggerSchema>;
export type RateLimitHeaders = z.infer<typeof RateLimitHeadersSchema>;
