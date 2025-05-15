import { systemConfig } from "../config/system.config";
import { Logger, RateLimitHeaders } from "../schemas/logger.schema";

export enum LogLevel {
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  DEBUG = "DEBUG",
}

export class LoggerImpl implements Logger {
  private static instance: LoggerImpl;
  private readonly timeZone = "America/Sao_Paulo";

  private constructor() {}

  public static getInstance(): Logger {
    if (!LoggerImpl.instance) {
      LoggerImpl.instance = new LoggerImpl();
    }
    return LoggerImpl.instance;
  }

  // Método para testes
  public static resetInstance(): void {
    LoggerImpl.instance = undefined as any;
  }

  private formatDate(date: Date): string {
    return date.toLocaleString("pt-BR", {
      timeZone: this.timeZone,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  private log(level: LogLevel, message: string, data?: unknown) {
    const timestamp = this.formatDate(new Date());
    const logMessage = `[${timestamp}][${level}] ${message}`;

    switch (level) {
      case LogLevel.ERROR:
        console.error(logMessage, data || "");
        break;
      case LogLevel.WARN:
        console.warn(logMessage, data || "");
        break;
      case LogLevel.DEBUG:
        if (systemConfig.debug) {
          console.debug(logMessage, data || "");
        }
        break;
      default:
        console.log(logMessage, data || "");
    }
  }

  public info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data);
  }

  public warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data);
  }

  public error(message: string, data?: unknown): void {
    this.log(LogLevel.ERROR, message, data);
  }

  public debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  public logRateLimit(
    headers: Partial<RateLimitHeaders>,
    context: string = "ASSISTANT"
  ): void {
    if (!headers["x-ratelimit-reset"]) {
      this.warn(`[${context}] Rate limit headers incomplete`, headers);
      return;
    }

    const resetDate = new Date(Number(headers["x-ratelimit-reset"]) * 1000);

    this.info(`[${context}] Rate Limit Info:`, {
      remaining: headers["x-ratelimit-remaining"] || "unknown",
      limit: headers["x-ratelimit-limit"] || "unknown",
      reset: this.formatDate(resetDate),
    });
  }
}
