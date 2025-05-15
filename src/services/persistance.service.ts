import { LogRepository } from "../repositories/log.repository";
import { SaveResult } from "../schemas/save-result.schema";
import type { StandardizedLog } from "../schemas/standardized-log.schema";
import { Logger, LoggerImpl } from "../utils";
import { DatabaseError } from "../utils/errors";

export class PersistanceService {
  private static instance: PersistanceService;
  private logRepository: LogRepository;
  private readonly logger: Logger;

  private constructor() {
    this.logRepository = LogRepository.getInstance();
    this.logger = LoggerImpl.getInstance();
  }

  public static getInstance(): PersistanceService {
    if (!PersistanceService.instance) {
      PersistanceService.instance = new PersistanceService();
    }
    return PersistanceService.instance;
  }

  private logSaveResults(assistantName: string, result: SaveResult): void {
    this.logger.info(`Results for ${assistantName}:`, {
      saved: result.count,
      duplicates: result.duplicates,
      error: result.error,
    });
  }

  async saveProcessedLogs(
    standardizedLogsByAssistant: Record<string, StandardizedLog[]>
  ): Promise<Record<string, SaveResult>> {
    this.logger.info("Starting log persistence process", {
      assistantCount: Object.keys(standardizedLogsByAssistant).length,
    });

    const results: Record<string, SaveResult> = {};

    for (const [assistantName, logs] of Object.entries(
      standardizedLogsByAssistant
    )) {
      if (!logs?.length) {
        this.logger.info(`No logs to process for ${assistantName}`, {
          assistantName,
        });
        results[assistantName] = {
          success: true,
          count: 0,
          duplicates: 0,
        };
        continue;
      }

      this.logger.info(
        `Processing ${logs.length} logs for assistant ${assistantName}`,
        { assistantName, logCount: logs.length }
      );

      try {
        results[assistantName] = await this.logRepository.saveMany(
          assistantName,
          logs
        );
        this.logSaveResults(assistantName, results[assistantName]);
      } catch (error: unknown) {
        this.logger.error(`Failed to save logs for ${assistantName}`, error);
        results[assistantName] = {
          success: false,
          count: 0,
          duplicates: 0,
          error: error instanceof Error ? error.message : String(error),
        };
        throw new DatabaseError(`Falha ao salvar logs para ${assistantName}`);
      }
    }

    return results;
  }
}
