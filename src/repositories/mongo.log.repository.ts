import { getAssistantModel } from "../models/mongo-log.model";
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
  ): Promise<{ success: boolean; count: number }> {
    try {
      const collectionName = assistantName.toLowerCase();
      console.log(
        `[DB][REPOSITORY] Salvando ${logs.length} logs na collection ${collectionName}`
      );

      const AssistantModel = getAssistantModel(assistantName);
      const result = await AssistantModel.insertMany(logs);

      const savedCount = Array.isArray(result) ? result.length : 0;
      console.log(
        `[DB][REPOSITORY] ${savedCount} logs salvos com sucesso na collection ${collectionName}`
      );
      return {
        success: true,
        count: savedCount,
      };
    } catch (error) {
      console.error(
        `[DB][REPOSITORY] Erro ao salvar logs na collection ${assistantName.toLowerCase()}:`,
        error
      );
      throw error;
    }
  }
}
