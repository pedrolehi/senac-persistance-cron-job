/**
 * @file sync-point.schema.ts
 * @description Schema para validação dos pontos de sincronização
 */

import { z } from "zod";
import mongoose from "mongoose";

/**
 * Schema Zod para validação dos pontos de sincronização
 */
export const SyncPointSchema = z.object({
  assistantId: z.string().min(1).describe("ID do assistente"),
  lastSyncTimestamp: z.date().describe("Timestamp da última sincronização"),
  lastLogId: z.string().min(1).describe("ID do último log sincronizado"),
});

export type SyncPoint = z.infer<typeof SyncPointSchema>;

/**
 * Schema Mongoose para persistência dos pontos de sincronização
 */
const syncPointMongooseSchema = new mongoose.Schema({
  assistantId: { type: String, required: true },
  lastSyncTimestamp: { type: Date, required: true },
  lastLogId: { type: String, required: true },
});

export const SyncPoint = mongoose.model(
  "SyncPoint",
  syncPointMongooseSchema,
  "syncPoint"
);
