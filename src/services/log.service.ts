import {
  StandardizedLog,
  StandardizedLogSchema,
} from "../schemas/standardized-log.schema";
import { LogsResponse } from "../schemas/logs.response.schema";
import { Log, LogCollection } from "../schemas/logs.schema";
import { systemConfig } from "../config/system.config";

export class LogService {
  private assistantName: string;

  constructor(assistantName: string) {
    this.assistantName = assistantName;
  }

  private formatTimestamp(dateString: string): Date {
    const date = new Date(dateString);
    return date;
  }

  private extractUserInfo(log: Log) {
    const mainSkill = log.response?.context?.skills?.["main skill"];
    const userDefined = mainSkill?.user_defined;

    return {
      session_id: log.session_id,
      chapa: userDefined?.chapa || "",
      emplid: userDefined?.emplid || "",
    };
  }

  private transformSingleLog(log: Log): StandardizedLog {
    try {
      const standardLog = {
        log_id: log.log_id || "",
        conversation_id:
          log.response?.context?.metadata?.user_id ||
          log.response?.context?.global?.system?.user_id ||
          "",
        user: this.extractUserInfo(log),
        context: log.response?.context || {},
        input: log.response?.input?.text || "",
        intents: log.response?.output?.intents || [],
        entities: log.response?.output?.entities || [],
        output: log.response?.output?.generic || [],
        timestamp: this.formatTimestamp(log.request_timestamp),
      };

      return StandardizedLogSchema.parse(standardLog);
    } catch (error) {
      console.error(
        `Erro ao transformar log do assistente ${this.assistantName}:`,
        error
      );
      throw error;
    }
  }

  public transformLogs(logs: Log[]): StandardizedLog[] {
    return logs
      .map((log) => {
        try {
          return this.transformSingleLog(log);
        } catch (error) {
          console.error(`Erro ao processar log individual:`, error);
          return null;
        }
      })
      .filter((log): log is StandardizedLog => log !== null)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  public static processAllAssistants(
    logsResponse: LogsResponse
  ): Record<string, StandardizedLog[]> {
    const processedLogs: Record<string, StandardizedLog[]> = {};

    Object.entries(logsResponse.assistants).forEach(
      ([assistantName, assistantData]) => {
        const transformer = new LogService(assistantName);
        processedLogs[assistantName] = transformer.transformLogs(
          assistantData.logs
        );
      }
    );
    return processedLogs;
  }

  // --- SANITIZAÇÃO ---

  private static readonly MASK = "**CONFIDENCIAL**";

  private static sanitizeValue(value: any): any {
    if (typeof value !== "string") return value;
    return this.MASK;
  }

  private static sanitizeObject(obj: unknown): unknown {
    if (!obj || typeof obj !== "object") return obj;

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item));
    }

    const sanitizedObj: { [key: string]: unknown } = {};

    for (const [key, value] of Object.entries(obj as object)) {
      if (systemConfig.sensitiveFields.includes(key)) {
        sanitizedObj[key] = this.sanitizeValue(value);
      } else if (value && typeof value === "object") {
        sanitizedObj[key] = this.sanitizeObject(value);
      } else {
        sanitizedObj[key] = value;
      }
    }

    return sanitizedObj;
  }

  public static sanitizeLogs(logs: LogCollection): LogCollection {
    return {
      ...logs,
      logs: logs.logs.map((log: Log) => ({
        ...log,
        response: this.sanitizeObject(log.response),
      })),
    };
  }
}
