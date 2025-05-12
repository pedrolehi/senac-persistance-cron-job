import mongoose from "mongoose";
import zodToMongoose from "@zodyac/zod-mongoose";
import { StandardizedLogSchema } from "../schemas/standardized-log.schema";

const mongooseLogSchema = zodToMongoose(StandardizedLogSchema);

// Função para obter o modelo com a collection correta
export function getLogModel(assistantName: string) {
  // Converte o nome do assistente para minúsculo (ex: SUPORTE -> suporte, GEP -> gep)
  const collectionName = assistantName.toLowerCase();

  // Validação extra para garantir que não há 's' no final
  if (collectionName.endsWith("s")) {
    console.error(
      `[DB][MODEL] Nome do assistente não deve terminar com 's': ${collectionName}`
    );
    throw new Error(
      `Nome do assistente não deve terminar com 's': ${collectionName}`
    );
  }

  console.log(`[DB][MODEL] Criando modelo para collection: ${collectionName}`);
  return mongoose.model(collectionName, mongooseLogSchema, collectionName);
}
