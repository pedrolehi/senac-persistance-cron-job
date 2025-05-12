import { LogRepository } from "../repositories/log.repository";
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

  private logSaveResults(assistantName: string, result: SaveResult): void {
    console.log(`[DB][SERVICE] Results for ${assistantName}:`);
    console.log(`- Successfully saved: ${result.count} logs`);
    if (result.duplicates > 0) {
      console.log(`- Duplicates found and ignored: ${result.duplicates} logs`);
    }
    if (result.error) {
      console.error(`- Error occurred: ${result.error}`);
    }
  }

  async saveProcessedLogs(
    standardizedLogsByAssistant: Record<string, StandardizedLog[]>
  ): Promise<Record<string, SaveResult>> {
    console.log("[DB][SERVICE] Starting log persistence process");

    const results: Record<string, SaveResult> = {};

    for (const [assistantName, logs] of Object.entries(
      standardizedLogsByAssistant
    )) {
      if (!logs?.length) {
        console.log(`[DB][SERVICE] No logs to process for ${assistantName}`);
        results[assistantName] = {
          success: true,
          count: 0,
          duplicates: 0,
        };
        continue;
      }

      console.log(
        `[DB][SERVICE] Processing ${logs.length} logs for assistant ${assistantName}`
      );

      try {
        results[assistantName] = await this.logRepository.saveMany(
          assistantName,
          logs
        );
        this.logSaveResults(assistantName, results[assistantName]);
      } catch (error: any) {
        console.error(
          `[DB][SERVICE] Failed to save logs for ${assistantName}:`,
          error.code
        );
        results[assistantName] = {
          success: false,
          count: 0,
          duplicates: 0,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    return results;
  }
}
