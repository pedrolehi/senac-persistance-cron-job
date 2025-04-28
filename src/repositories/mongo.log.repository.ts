import { getAssistantModel } from "../models/standardized-log-mongo.model";
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
  ): Promise<void> {
    try {
      const collectionName = assistantName.toLowerCase();
      console.log(
        `[DB][REPOSITORY] Salvando ${logs.length} logs na collection ${collectionName}`
      );

      const AssistantModel = getAssistantModel(assistantName);
      await AssistantModel.insertMany(logs);

      console.log(
        `[DB][REPOSITORY] Logs salvos com sucesso na collection ${collectionName}`
      );
    } catch (error) {
      console.error(
        `[DB][REPOSITORY] Erro ao salvar logs na collection ${assistantName.toLowerCase()}:`,
        error
      );
      throw error;
    }
  }
}
