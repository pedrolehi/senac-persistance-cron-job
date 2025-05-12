import mongoose from "mongoose";
import { getLogModel } from "../models/log.model";
import { SaveResult } from "../schemas/save-result.schema";
import type { StandardizedLog } from "../schemas/standardized-log.schema";
import type { LogsResponse } from "../schemas/logs.response.schema";

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
        `[DB][REPOSITORY] Nome do assistente recebido: ${assistantName}`
      );
      console.log(`[DB][REPOSITORY] Nome da collection: ${collectionName}`);
      console.log(
        `[DB][REPOSITORY] Usando banco: ${mongoose.connection.name}, collection: ${collectionName}`
      );
      console.log(`[DB][REPOSITORY] Tentando salvar ${logs.length} logs`);

      const AssistantModel = getLogModel(assistantName);
      console.log(
        `[DB][REPOSITORY] Modelo obtido para collection ${collectionName}`
      );

      // Prepara as operações de bulk write
      const bulkOps = logs.map((log) => ({
        updateOne: {
          filter: { log_id: log.log_id },
          update: { $set: log },
          upsert: true,
        },
      }));

      console.log(
        `[DB][REPOSITORY] Operações de bulk write preparadas: ${bulkOps.length}`
      );

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
        `[DB][REPOSITORY] Erro ao salvar logs na collection ${collectionName}:`,
        error
      );
      console.error(`[DB][REPOSITORY] Detalhes do erro:`, {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
      if (error.code === 11000) {
        console.warn(`[DB][REPOSITORY] Erro de duplicidade detectado.`);
      }
      throw error;
    }
  }

  async findLogIdsInBatch(
    logsResponse: LogsResponse
  ): Promise<Record<string, string[]>> {
    try {
      const results: Record<string, string[]> = {};

      // Para cada assistente, busca seus logs no MongoDB
      for (const [assistantName, assistantData] of Object.entries(
        logsResponse.assistants
      )) {
        const logIds = assistantData.logs.map((log) => log.log_id);

        if (logIds.length === 0) continue;

        const AssistantModel = getLogModel(assistantName);
        const result = await AssistantModel.aggregate([
          {
            $match: {
              log_id: { $in: logIds },
            },
          },
          {
            $project: {
              _id: 0,
              log_id: 1,
            },
          },
        ]);

        results[assistantName] = result.map((doc: any) => doc.log_id);
      }

      return results;
    } catch (error) {
      console.error("[DB][REPOSITORY] Erro ao buscar logs em lote:", error);
      throw error;
    }
  }
}
