import {
  StandardizedLog,
  StandardizedLogSchema,
} from "../schemas/standardized-log.schema";
import {
  LogsResponse,
  LogsResponseSchema,
} from "./../schemas/logs.response.schema";
import { Log } from "../schemas/logs.schema";

export class LogTransformer {
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
        output: log.response?.output || [],
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
      .filter((log): log is StandardizedLog => log !== null);
  }

  public static processAllAssistants(
    logsResponse: LogsResponse
  ): Record<string, StandardizedLog[]> {
    const processedLogs: Record<string, StandardizedLog[]> = {};

    Object.entries(logsResponse.assistants).forEach(
      ([assistantName, assistantData]) => {
        const transformer = new LogTransformer(assistantName);
        processedLogs[assistantName] = transformer.transformLogs(
          assistantData.logs
        );
      }
    );
    return processedLogs;
  }

  public static validadeInitialPayload(payload: unknown): LogsResponse {
    try {
      return LogsResponseSchema.parse(payload);
    } catch (error) {
      console.error("Erro na validação do payload inicial:", error);
      throw error;
    }
  }
}
