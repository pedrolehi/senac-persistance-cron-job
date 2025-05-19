import {
  StandardizedLog,
  StandardizedLogSchema,
} from "../schemas/standardized-log.schema";
import { LogsResponse } from "../schemas/logs.response.schema";
import { Log, LogCollection } from "../schemas/logs.schema";
import { systemConfig } from "../config/system.config";
import { Logger, LoggerImpl } from "../utils";
import { ValidationError, TransformationError } from "../utils/errors";
import { ZodError } from "zod";

export class LogService {
  private assistantName: string;
  private readonly logger: Logger;

  constructor(assistantName: string) {
    this.assistantName = assistantName;
    this.logger = LoggerImpl.getInstance();
  }

  private formatTimestamp(dateString: string): Date {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        throw new ValidationError(`Data inválida: ${dateString}`);
      }
      return date;
    } catch (error) {
      this.logger.error(`Erro ao formatar timestamp: ${dateString}`, error);
      // Retorna a data atual como fallback
      return new Date();
    }
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
      // Extrai informações do usuário com fallbacks
      const userInfo = {
        session_id: log.session_id || "",
        chapa:
          log.response?.context?.skills?.["main skill"]?.user_defined?.chapa ||
          "",
        emplid:
          log.response?.context?.skills?.["main skill"]?.user_defined?.emplid ||
          "",
      };

      // Extrai o user_id da IBM do contexto
      const ibmUserId =
        log.response?.context?.metadata?.user_id ||
        log.response?.context?.global?.system?.user_id;

      // Garante que o timestamp seja uma data válida
      const timestamp = this.formatTimestamp(log.request_timestamp);

      // Prepara o log padronizado apenas com os campos necessários
      const standardLog = {
        log_id: log.log_id || "",
        timestamp: timestamp,
        user: userInfo,
        conversation_id: ibmUserId || "",
        context: log.response?.context || {},
        input: log.response?.input?.text || "",
        intents: log.response?.output?.intents || [],
        entities: log.response?.output?.entities || [],
        output: log.response?.output?.generic || [],
      };

      // Log para debug antes da validação
      this.logger.debug("[TRANSFORM] Log antes da validação", {
        log_id: standardLog.log_id,
        has_context: !!standardLog.context,
        has_ibm_user_id: !!ibmUserId,
        timestamp: standardLog.timestamp,
        conversation_id: standardLog.conversation_id,
        user_info: standardLog.user,
      });

      // Valida o log antes de retornar
      const validatedLog = StandardizedLogSchema.parse(standardLog);

      // Log para debug após a validação
      this.logger.debug("[TRANSFORM] Log validado com sucesso", {
        log_id: validatedLog.log_id,
        conversation_id: validatedLog.conversation_id,
        timestamp: validatedLog.timestamp,
        user_info: validatedLog.user,
      });

      return validatedLog;
    } catch (error) {
      if (error instanceof ZodError) {
        this.logger.error(
          `[ZOD][TRANSFORM] Erro de validação ao transformar log do assistente ${this.assistantName}`,
          {
            log_id: log.log_id,
            etapa: "transformSingleLog",
            log_data: JSON.stringify(log, null, 2),
            zod_errors: error.errors.map((e) => ({
              path: e.path,
              expected: "expected" in e ? e.expected : undefined,
              received: "received" in e ? e.received : undefined,
              message: e.message,
            })),
          }
        );
      } else {
        this.logger.error(
          `[TRANSFORM] Erro inesperado ao transformar log do assistente ${this.assistantName}`,
          {
            error,
            log_id: log.log_id,
            etapa: "transformSingleLog",
            log_data: JSON.stringify(log, null, 2),
          }
        );
      }
      throw new TransformationError(
        `Falha ao transformar log ${log.log_id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // Método público para transformar um único log
  public transformSingleLogPublic(log: Log): StandardizedLog {
    return this.transformSingleLog(log);
  }

  public transformLogs(logs: Log[]): StandardizedLog[] {
    this.logger.info(
      `Iniciando transformação de ${logs.length} logs do assistente ${this.assistantName}`,
      {
        assistantName: this.assistantName,
        logCount: logs.length,
      }
    );

    const transformedLogs = logs
      .map((log) => {
        try {
          return this.transformSingleLog(log);
        } catch (error) {
          this.logger.error(
            `Erro ao processar log individual ${log.log_id}`,
            error
          );
          return null;
        }
      })
      .filter((log): log is StandardizedLog => log !== null)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const successRate = ((transformedLogs.length / logs.length) * 100).toFixed(
      2
    );
    this.logger.info(
      `Transformação concluída: ${transformedLogs.length}/${logs.length} logs processados (${successRate}% de sucesso)`,
      {
        assistantName: this.assistantName,
        logCount: logs.length,
        successCount: transformedLogs.length,
        successRate,
      }
    );

    return transformedLogs;
  }

  public static processAllAssistants(
    logsResponse: LogsResponse
  ): Record<string, StandardizedLog[]> {
    const processedLogs: Record<string, StandardizedLog[]> = {};
    const logger = LoggerImpl.getInstance();

    Object.entries(logsResponse.assistants).forEach(
      ([assistantName, assistantData]) => {
        logger.info("Processando assistente:", assistantName);
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

  private static sanitizeValue(value: unknown): unknown {
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
