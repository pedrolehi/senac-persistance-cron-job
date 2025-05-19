import { AssistantController } from "../controllers/assistant.controller";
import { promises as fs } from "fs";
import path from "path";
import { LogsResponse } from "../schemas/logs.response.schema";
import {
  SyncReport,
  SyncStatus,
  SyncReportSchema,
  AssistantSummary,
} from "../schemas/sync-report.schema";
import { LogRepository } from "../repositories/log.repository";
import { LogService } from "../services/log.service";
import { PersistanceService } from "../services/persistance.service";
import { systemConfig } from "../config/system.config";
import { AuditModel } from "../models/audit.model";
import { Logger, LoggerImpl } from "../utils";
import { ValidationError, DatabaseError } from "../utils/errors";
import { EmailService } from "./email.service";

export class LogAuditService {
  private assistantController: AssistantController;
  private logRepository: LogRepository;
  private persistanceService: PersistanceService;
  private readonly logger: Logger;
  private emailService: EmailService;

  constructor() {
    this.assistantController = AssistantController.getInstance();
    this.logRepository = LogRepository.getInstance();
    this.persistanceService = PersistanceService.getInstance();
    this.logger = LoggerImpl.getInstance();
    this.emailService = EmailService.getInstance();
  }

  public async auditLogsForDay(date: Date) {
    const startTime = Date.now();

    if (!(date instanceof Date) || isNaN(date.getTime())) {
      const error = new ValidationError("Data inválida");
      await this.emailService.sendErrorNotification(error, { date });
      throw error;
    }

    const startDate = new Date(date);
    startDate.setUTCHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setUTCHours(23, 59, 59, 999);

    // Formata a data para exibição consistente
    const auditDate = date.toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });

    // Verifica se já existe uma auditoria para este dia
    const existingAudit = await AuditModel.findOne({
      timestamp: {
        $gte: startDate,
        $lte: endDate,
      },
    });

    if (existingAudit) {
      this.logger.info(`Auditoria para ${auditDate} já existe`, {
        auditId: existingAudit._id,
      });
      return existingAudit;
    }

    this.logger.info(`Iniciando auditoria para o dia ${auditDate}`, {
      startDate,
      endDate,
    });

    try {
      // Busca todos os logs do dia
      const allLogs = await this.assistantController.getAllLogsForPeriod(
        startDate,
        endDate
      );

      // Gera o relatório de sincronização
      const syncReport = await this.generateSyncReport(allLogs, date);

      // Se houver logs faltantes, processa e salva
      if (syncReport.syncStatus.missingLogs.length > 0) {
        this.logger.info(
          `Encontrados ${syncReport.syncStatus.missingLogs.length} logs faltantes. Iniciando processamento...`,
          { missingLogs: syncReport.syncStatus.missingLogs }
        );

        // Cria um novo LogsResponse apenas com os logs faltantes
        const missingLogsResponse: LogsResponse = {
          startDate: allLogs.startDate,
          endDate: allLogs.endDate,
          assistants: {},
        };

        // Agrupa os logs faltantes por assistente
        for (const logInfo of syncReport.syncStatus.missingLogs) {
          const assistantLogs =
            allLogs.assistants[logInfo.assistant]?.logs || [];
          const missingLog = assistantLogs.find(
            (log) => log.log_id === logInfo.logId
          );
          if (missingLog) {
            if (!missingLogsResponse.assistants[logInfo.assistant]) {
              missingLogsResponse.assistants[logInfo.assistant] = {
                logs: [],
                pagination: { next_url: null },
              };
            }
            missingLogsResponse.assistants[logInfo.assistant].logs.push(
              missingLog
            );
          }
        }

        // Usa o mesmo fluxo de processamento do CronJob
        const standardizedLogs =
          LogService.processAllAssistants(missingLogsResponse);
        await this.persistanceService.saveProcessedLogs(standardizedLogs);

        this.logger.info("Logs faltantes processados e salvos com sucesso!", {
          processedLogs: Object.entries(standardizedLogs).reduce(
            (acc, [assistant, logs]) => ({ ...acc, [assistant]: logs.length }),
            {}
          ),
        });
      }

      // Prepara o relatório final
      const fullReport = {
        ...syncReport,
        sanitizedLogs: Object.entries(allLogs.assistants).reduce(
          (acc, [assistantName, logCollection]) => {
            // Só inclui os logs do assistente se ele tiver logs faltantes
            const hasMissingLogs = syncReport.syncStatus.missingLogs.some(
              (log) => log.assistant === assistantName
            );
            if (hasMissingLogs) {
              // Mantém apenas os campos essenciais para reduzir o tamanho
              acc[assistantName] = {
                logs: logCollection.logs.map((log) => ({
                  log_id: log.log_id || "",
                  request_timestamp:
                    log.request_timestamp || new Date().toISOString(),
                  response_timestamp:
                    log.response_timestamp || new Date().toISOString(),
                })),
                pagination: {
                  next_url: logCollection.pagination.next_url,
                },
              };
            }
            return acc;
          },
          {} as Record<string, any>
        ),
      };

      // Salva o relatório na collection audit
      const validatedReport = SyncReportSchema.parse(fullReport);
      const savedReport = await AuditModel.create(validatedReport);
      this.logger.info("Relatório salvo na collection audit", {
        reportId: savedReport._id,
      });

      // Salva também em arquivo JSON para referência
      const logsDir = path.join(process.cwd(), systemConfig.audit.reportPath);
      await fs.mkdir(logsDir, { recursive: true });

      const timestamp = date.toISOString().split(".")[0].replace(/[:]/g, "-");
      const reportPath = path.join(logsDir, `sync-report-${timestamp}.json`);

      await fs.writeFile(
        reportPath,
        JSON.stringify(fullReport, null, 2),
        "utf-8"
      );

      const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
      this.logger.info(`Auditoria concluída em ${executionTime}s`, {
        reportPath,
        executionTime,
        totalLogs: syncReport.summary.totalLogs,
        missingLogs: syncReport.summary.missingLogs,
        includedLogs: syncReport.summary.includedLogs,
      });

      return syncReport;
    } catch (error) {
      // Em caso de erro, salva um relatório de erro
      const errorReport = {
        timestamp: date.toISOString(),
        syncStatus: {
          status: "FAILURE",
          missingLogs: [],
          includedLogs: [],
          error: error instanceof Error ? error.message : "Erro desconhecido",
          errorStack: error instanceof Error ? error.stack : undefined,
          errorType:
            error instanceof Error ? error.constructor.name : "UnknownError",
        },
        summary: {
          totalLogs: 0,
          includedLogs: 0,
          missingLogs: 0,
          assistants: [],
        },
        sanitizedLogs: {}, // Removendo logs sanitizados para reduzir tamanho
        auditDate: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      };

      try {
        const savedErrorReport = await AuditModel.create(errorReport);
        this.logger.error(
          "Erro durante a auditoria - relatório de erro salvo",
          {
            error,
            reportId: savedErrorReport._id,
            auditDate: {
              start: startDate.toISOString(),
              end: endDate.toISOString(),
            },
          }
        );

        // Envia email de notificação
        await this.emailService.sendErrorNotification(
          error instanceof Error ? error : new Error(String(error)),
          {
            auditDate: {
              start: startDate.toISOString(),
              end: endDate.toISOString(),
            },
            reportId: savedErrorReport._id,
            errorReport,
          }
        );

        // Salva também em arquivo JSON para referência
        const logsDir = path.join(process.cwd(), systemConfig.audit.reportPath);
        await fs.mkdir(logsDir, { recursive: true });

        const timestamp = new Date()
          .toISOString()
          .split(".")[0]
          .replace(/[:]/g, "-");
        const reportPath = path.join(logsDir, `error-report-${timestamp}.json`);

        await fs.writeFile(
          reportPath,
          JSON.stringify(errorReport, null, 2),
          "utf-8"
        );

        this.logger.info("Relatório de erro salvo", {
          reportPath,
          reportId: savedErrorReport._id,
          auditDate: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
        });
      } catch (saveError) {
        this.logger.error("Erro ao salvar relatório de erro", {
          originalError: error,
          saveError,
          auditDate: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
        });

        // Tenta enviar email mesmo se falhar ao salvar o relatório
        await this.emailService.sendErrorNotification(
          error instanceof Error ? error : new Error(String(error)),
          {
            auditDate: {
              start: startDate.toISOString(),
              end: endDate.toISOString(),
            },
            saveError,
          }
        );
      }

      throw error; // Re-throw o erro original para manter o comportamento existente
    }
  }

  private async generateSyncReport(
    logs: LogsResponse,
    date: Date
  ): Promise<SyncReport> {
    const assistants = Object.keys(logs.assistants || {});
    const syncStatus: SyncStatus = {
      status: "SUCCESS",
      missingLogs: [],
      includedLogs: [],
    };

    const assistantSummary: AssistantSummary[] = [];

    // Inicializa o resumo para cada assistente
    for (const assistant of assistants) {
      const assistantLogs = logs.assistants[assistant]?.logs || [];
      assistantSummary.push({
        name: assistant,
        watsonLogs: assistantLogs.length,
        savedLogs: 0,
      });
    }

    // Verifica todos os logs de uma vez no MongoDB
    const existingLogsByAssistant = await this.checkLogsInBatch(logs);

    // Processa os resultados por assistente
    for (const [assistantName, assistantData] of Object.entries(
      logs.assistants
    )) {
      const existingLogIds = existingLogsByAssistant[assistantName] || [];
      const assistantIndex = assistantSummary.findIndex(
        (a) => a.name === assistantName
      );

      for (const log of assistantData.logs) {
        if (existingLogIds.includes(log.log_id)) {
          syncStatus.includedLogs.push({
            assistant: assistantName,
            logId: log.log_id,
            timestamp: log.request_timestamp,
          });
          if (assistantIndex !== -1) {
            assistantSummary[assistantIndex].savedLogs++;
          }
        } else {
          syncStatus.status = "PARTIAL";
          syncStatus.missingLogs.push({
            assistant: assistantName,
            logId: log.log_id,
            timestamp: log.request_timestamp,
          });
        }
      }
    }

    if (syncStatus.missingLogs.length > 0) {
      syncStatus.status = "PARTIAL";
    }

    const report = {
      timestamp: date.toISOString(),
      syncStatus,
      summary: {
        totalLogs:
          syncStatus.includedLogs.length + syncStatus.missingLogs.length,
        includedLogs: syncStatus.includedLogs.length,
        missingLogs: syncStatus.missingLogs.length,
        assistants: assistantSummary,
      },
    };

    return SyncReportSchema.parse(report);
  }

  private async checkLogsInBatch(
    logs: LogsResponse
  ): Promise<Record<string, string[]>> {
    try {
      return await this.logRepository.findLogIdsInBatch(logs);
    } catch (error) {
      this.logger.error("Erro ao verificar logs no MongoDB", error);
      throw new DatabaseError("Falha ao verificar logs no banco de dados");
    }
  }

  public async checkPreviousAudits(
    startDate: Date,
    endDate: Date
  ): Promise<void> {
    try {
      // Busca todas as auditorias no período
      const audits = await AuditModel.find({
        timestamp: {
          $gte: startDate,
          $lte: endDate,
        },
      }).sort({ timestamp: 1 });

      // Verifica se há dias sem auditoria
      const auditDates = new Set(
        audits.map(
          (audit) => new Date(audit.timestamp).toISOString().split("T")[0]
        )
      );

      const currentDate = new Date(startDate);
      const missingDates: string[] = [];

      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split("T")[0];
        if (!auditDates.has(dateStr)) {
          missingDates.push(dateStr);
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      if (missingDates.length > 0) {
        this.logger.warn("Dias sem auditoria encontrados", {
          missingDates,
          period: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
        });

        // Processa os dias faltantes
        for (const dateStr of missingDates) {
          const missingDate = new Date(dateStr);
          this.logger.info(
            `Processando auditoria para dia faltante: ${dateStr}`,
            {
              missingDate,
            }
          );
          await this.auditLogsForDay(missingDate);
        }
      }
    } catch (error) {
      this.logger.error("Erro ao verificar auditorias anteriores", error);
      throw new DatabaseError("Falha ao verificar histórico de auditorias");
    }
  }
}
