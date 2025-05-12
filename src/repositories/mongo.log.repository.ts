import mongoose from "mongoose";
import { getAssistantModel } from "../models/log.model";
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

      // Prepara as operações de bulk write
      const bulkOps = logs.map((log) => ({
        updateOne: {
          filter: { log_id: log.log_id },
          update: { $set: log },
          upsert: true,
        },
      }));

      // Executa todas as operações em uma única chamada
      const result: any = await AssistantModel.bulkWrite(bulkOps, {
        ordered: false,
      });

      const savedCount = result.upsertedCount;
      const duplicatesCount = logs.length - savedCount;

      const savedLogs =
        result.upserted?.map((entry: any) => logs[entry.index]) || [];

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
        savedLogs: savedLogs,
      };
    } catch (error: any) {
      console.error(
        `[DB][REPOSITORY] Erro ao salvar logs na collection ${collectionName}:`
      );
      if (error.code === 11000) {
        console.warn(`[DB][REPOSITORY] Erro de duplicidade detectado.`);
      }
      throw error;
    }
  }
}
