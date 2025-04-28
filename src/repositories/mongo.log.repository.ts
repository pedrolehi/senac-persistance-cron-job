import mongoose from "mongoose";
import { getAssistantModel } from "../models/mongo-log.model";
import { SaveResult } from "../schemas/save-result.schema";
import type { StandardizedLog } from "../schemas/standardized-log.schema";

export class LogRepository {
  private static instance: LogRepository;

  private constructor() {}

  public static getInstance(): LogRepository {
    if (!LogRepository.instance) {
      LogRepository.instance = new LogRepository();
    }
    return LogRepository.instance;
  }

  async saveMany(
    assistantName: string,
    logs: StandardizedLog[]
  ): Promise<SaveResult> {
    const collectionName = assistantName.toLowerCase();
    try {
      console.log(
        `[DB][REPOSITORY] Usando banco: ${mongoose.connection.name}, collection: ${collectionName}`
      );

      const AssistantModel = getAssistantModel(collectionName);

      // O Mongoose retorna um array de documentos inseridos
      const result = await AssistantModel.insertMany(logs, {
        ordered: false,
      });
      // console.log(`[DB][REPOSITORY] Resultado do insertMany:`, result);

      const savedCount = Array.isArray(result) ? result.length : 0;
      const duplicatesCount = logs.length - savedCount;

      console.log(
        `[DB][REPOSITORY] ${savedCount} logs salvos com sucesso na collection ${collectionName}`
      );
      if (duplicatesCount > 0) {
        console.log(
          `[DB][REPOSITORY] ${duplicatesCount} logs ignorados por serem duplicados`
        );
      }

      return {
        success: true,
        count: savedCount,
        duplicates: duplicatesCount,
      };
    } catch (error: any) {
      // Logue o erro completo, inclusive stack trace
      console.error(
        `[DB][REPOSITORY] Erro ao salvar logs na collection ${collectionName}:`,
        error,
        error?.stack
      );
      // Se for erro de duplicata, pode tratar aqui se quiser
      if (error.code === 11000) {
        console.warn(`[DB][REPOSITORY] Erro de duplicidade detectado.`);
      }
      throw error; // Lance o erro para cima para não engolir!
    }
  }
}
