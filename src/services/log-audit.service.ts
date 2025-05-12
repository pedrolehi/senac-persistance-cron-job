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
import { Logger } from "../utils/logger";
import { ValidationError, DatabaseError } from "../utils/errors";

export class LogAuditService {
  private assistantController: AssistantController;
  private logRepository: LogRepository;
  private persistanceService: PersistanceService;
  private readonly logger: Logger;

  constructor() {
    this.assistantController = AssistantController.getInstance();
    this.logRepository = LogRepository.getInstance();
    this.persistanceService = PersistanceService.getInstance();
    this.logger = Logger.getInstance();
  }

  public async auditLogsForDay(date: Date) {
    const startTime = Date.now();

    // Se não for especificada uma data, usa o dia anterior
    const auditDate = date || new Date(Date.now() - 24 * 60 * 60 * 1000);

    if (!(auditDate instanceof Date) || isNaN(auditDate.getTime())) {
      throw new ValidationError("Data inválida");
    }

    const startDate = new Date(auditDate);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(auditDate);
    endDate.setHours(23, 59, 59, 999);

    this.logger.info(
      `Iniciando auditoria para o dia ${startDate.toLocaleDateString()}`,
      { startDate, endDate }
    );

    // Busca todos os logs do dia
    const allLogs = await this.assistantController.getAllLogsForPeriod(
      startDate,
      endDate
    );

    // Gera o relatório de sincronização
    const syncReport = await this.generateSyncReport(allLogs);

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
        const assistantLogs = allLogs.assistants[logInfo.assistant]?.logs || [];
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
            acc[assistantName] = LogService.sanitizeLogs(logCollection);
          }
          return acc;
        },
        {} as Record<string, any>
      ),
    };

    // Salva o relatório na collection audit
    try {
      const validatedReport = SyncReportSchema.parse(fullReport);
      const savedReport = await AuditModel.create(validatedReport);
      this.logger.info("Relatório salvo na collection audit", {
        reportId: savedReport._id,
      });
    } catch (error) {
      this.logger.error("Erro ao salvar relatório na collection audit", error);
      throw new DatabaseError("Falha ao salvar relatório de auditoria");
    }

    // Salva também em arquivo JSON para referência
    const logsDir = path.join(process.cwd(), systemConfig.audit.reportPath);
    await fs.mkdir(logsDir, { recursive: true });

    const timestamp = new Date()
      .toISOString()
      .split(".")[0]
      .replace(/[:]/g, "-");
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
  }

  private async generateSyncReport(logs: LogsResponse): Promise<SyncReport> {
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
      timestamp: new Date().toISOString(),
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
}
