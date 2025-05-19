import mongoose from "mongoose";
import { getLogModel } from "../models/log.model";
import { SaveResult } from "../schemas/save-result.schema";
import type { StandardizedLog } from "../schemas/standardized-log.schema";
import type { LogsResponse } from "../schemas/logs.response.schema";

// Interfaces para tipagem de erros
interface MongoWriteError {
  errmsg?: string;
  message?: string;
  code?: number;
}

interface MongoBulkWriteError extends Error {
  writeErrors?: MongoWriteError[];
  code?: number;
  errorLabelSet?: Set<string>;
}

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
    const batchSize = 500; // Processa 500 logs por vez
    const maxRetries = 3;
    const baseDelay = 1000; // 1 segundo

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

      let totalSaved = 0;
      let totalDuplicates = 0;

      // Divide os logs em lotes
      for (let i = 0; i < logs.length; i += batchSize) {
        const batch = logs.slice(i, i + batchSize);
        console.log(
          `[DB][REPOSITORY] Processando lote ${
            i / batchSize + 1
          } de ${Math.ceil(logs.length / batchSize)} (${batch.length} logs)`
        );

        // Prepara as operações de bulk write para este lote
        const bulkOps = batch.map((log) => ({
          updateOne: {
            filter: { log_id: log.log_id },
            update: { $set: log },
            upsert: true,
          },
        }));

        // Tenta executar o bulk write com retry
        let lastError: MongoBulkWriteError | undefined;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const result = await AssistantModel.bulkWrite(bulkOps, {
              ordered: false,
            });

            totalSaved += result.upsertedCount;
            totalDuplicates += batch.length - result.upsertedCount;

            console.log(
              `[DB][REPOSITORY] Lote ${i / batchSize + 1}: ${
                result.upsertedCount
              } logs salvos, ${batch.length - result.upsertedCount} duplicados`
            );
            break; // Sucesso, sai do loop de retry
          } catch (error: unknown) {
            lastError = error as MongoBulkWriteError;
            if (
              lastError.errorLabelSet?.has("RetryableWriteError") &&
              attempt < maxRetries
            ) {
              const delay = baseDelay * Math.pow(2, attempt - 1);
              console.log(
                `[DB][REPOSITORY] Tentativa ${attempt} falhou, aguardando ${delay}ms antes de tentar novamente...`
              );
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            }
            throw error; // Se não for retryable ou última tentativa, propaga o erro
          }
        }
      }

      console.log(
        `[DB][REPOSITORY] Total: ${totalSaved} logs salvos com sucesso na collection ${collectionName}`
      );
      if (totalDuplicates > 0) {
        console.log(
          `[DB][REPOSITORY] Total: ${totalDuplicates} logs ignorados por serem duplicados`
        );
      }

      return {
        success: true,
        count: totalSaved,
        duplicates: totalDuplicates,
      };
    } catch (error: unknown) {
      const mongoError = error as MongoBulkWriteError;
      // Agrupamento e deduplicação de erros
      if (mongoError.writeErrors && Array.isArray(mongoError.writeErrors)) {
        const errorSummary: Record<string, number> = {};
        mongoError.writeErrors.forEach((e: MongoWriteError) => {
          const msg = e.errmsg || e.message || JSON.stringify(e);
          errorSummary[msg] = (errorSummary[msg] || 0) + 1;
        });
        const uniqueMessages = Object.keys(errorSummary);
        uniqueMessages.forEach((msg) => {
          console.error(`[DB][REPOSITORY][BULK] ${errorSummary[msg]}x: ${msg}`);
        });
        if (uniqueMessages.length > 10) {
          console.warn(
            `[DB][REPOSITORY][BULK] Mais de 10 tipos de erro únicos. Alguns foram omitidos.`
          );
        }
      } else {
        console.error(
          `[DB][REPOSITORY] Erro ao salvar logs na collection ${collectionName}:`,
          mongoError
        );
        console.error(`[DB][REPOSITORY] Detalhes do erro:`, {
          message: mongoError.message,
          code: mongoError.code,
          stack: mongoError.stack,
        });
      }
      if (mongoError.code === 11000) {
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
