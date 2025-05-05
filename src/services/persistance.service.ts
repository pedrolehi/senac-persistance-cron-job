import { LogRepository } from "../repositories/mongo.log.repository";
import { SaveResult } from "../schemas/save-result.schema";
import type { StandardizedLog } from "../schemas/standardized-log.schema";

export class PersistanceService {
  private static instance: PersistanceService;
  private logRepository: LogRepository;

  private constructor() {
    this.logRepository = LogRepository.getInstance();
  }

  public static getInstance(): PersistanceService {
    if (!PersistanceService.instance) {
      PersistanceService.instance = new PersistanceService();
    }
    return PersistanceService.instance;
  }

  async saveProcessedLogs(
    standardizedLogsByAssistant: Record<string, StandardizedLog[]>
  ): Promise<Record<string, SaveResult>> {
    try {
      console.log("[DB][SERVICE] Iniciando salvamento dos logs processados");

      const results: Record<string, SaveResult> = {};

      for (const [assistantName, logs] of Object.entries(
        standardizedLogsByAssistant
      )) {
        if (logs.length > 0) {
          console.log(
            `[DB][SERVICE] Processando ${logs.length} logs do assistante ${assistantName}`
          );
          results[assistantName] = await this.logRepository.saveMany(
            assistantName,
            logs
          );
        }
      }

      return results;
    } catch (error: any) {
      console.error(
        `[DB][SERVICE] Erro ao salvar logs: ${
          error.code == "E11000"
            ? "E11000 - Log não salvo devido a duplicidade no banco"
            : error
        }`
      );
      return {};
    }
  }
}
