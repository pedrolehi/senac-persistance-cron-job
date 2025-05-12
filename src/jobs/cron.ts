import { AssistantController } from "./../controllers/assistant.controller";
import { AssistantService } from "../services/assistant.service";
import { PersistanceService } from "../services/persistance.service";
import { LogService } from "../services/log.service";
import { LogAuditService } from "../services/log-audit.service";
import { systemConfig } from "../config/system.config";
import { LogsResponse } from "../schemas/logs.response.schema";
import { stdin as input, stdout as output } from "process";
import { promises as fs } from "fs";
import readline from "readline";
import path from "path";
import { CronJob } from "cron";
import CronExpressionParser from "cron-parser";
import { getTimeInterval } from "../utils/timeParser";

export class CronJobs {
  private static instance: CronJobs;
  private assistantController: AssistantController;
  private PersistanceService: PersistanceService;
  private logAuditService: LogAuditService;
  private static hasStarted: boolean = false;

  private constructor() {
    this.assistantController = AssistantController.getInstance();
    this.PersistanceService = PersistanceService.getInstance();
    this.logAuditService = new LogAuditService();
  }

  public static getInstance(): CronJobs {
    if (!CronJobs.instance) {
      CronJobs.instance = new CronJobs();
    }
    return CronJobs.instance;
  }

  private async promptForStart(): Promise<boolean> {
    const rl = readline.createInterface({ input, output });

    return new Promise((resolve) => {
      rl.question("Deseja iniciar o CronJob agora? (s/n): ", (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === "s");
      });
    });
  }

  private async fetchRawLogs() {
    console.log("[CRON][FETCH] Iniciando coleta de logs brutos...");
    const { startDate, endDate } = getTimeInterval();
    const rawLogs = await this.assistantController.getAllLogsForPeriod(
      startDate,
      endDate
    );
    console.log("[CRON][FETCH] Logs brutos coletados com sucesso!");
    return rawLogs;
  }

  private standardizeLogs(rawLogs: LogsResponse) {
    console.log("[CRON][STANDARDIZE] Iniciando padronização dos logs...");
    const standardizedLogs = LogService.processAllAssistants(rawLogs);
    console.log("[CRON][STANDARDIZE] Logs padronizados com sucesso!");
    return standardizedLogs;
  }

  private async saveLogs(rawLogs: LogsResponse, standardizedLogs: any) {
    try {
      console.log("[CRON][SAVE] Iniciando salvamento dos logs...");

      const saveResults = await this.PersistanceService.saveProcessedLogs(
        standardizedLogs
      );

      // Agrupar todos os logs que foram realmente salvos
      const savedLogsOnly: any = {};
      for (const [assistantName, result] of Object.entries(saveResults)) {
        savedLogsOnly[assistantName] = result.savedLogs || [];
      }

      const now = new Date().toISOString().split(".")[0].replace(/[:]/g, "-");
      const logsDir = path.join(process.cwd(), "logs");

      await fs.mkdir(logsDir, { recursive: true });

      const fullLogsData = {
        timestamp: new Date().toISOString(),
        raw: rawLogs,
        standardized: savedLogsOnly,
      };

      await fs.writeFile(
        path.join(logsDir, `logs-${now}.json`),
        JSON.stringify(fullLogsData, null, 2),
        "utf-8"
      );
      console.log(
        `[CRON][SAVE] Arquivo logs-${now}.json exportado com sucesso!`
      );

      const results = Object.values(saveResults);
      const allSuccess =
        results.length > 0 && results.every((result) => result.success);
      const totalSaved = results.reduce(
        (total, result) => total + result.count,
        0
      );
      const totalDuplicates = results.reduce(
        (total, result) => total + (result.duplicates || 0),
        0
      );

      if (allSuccess) {
        console.log(
          `[CRON][SAVE] ${totalSaved} logs salvos com sucesso no MongoDB!`
        );
        if (totalDuplicates > 0) {
          console.log(
            `[CRON][SAVE] ${totalDuplicates} logs ignorados por serem duplicados`
          );
        }
      } else {
        console.error("[CRON][SAVE] Alguns logs não foram salvos no MongoDB!");
        console.error("[CRON][SAVE] Detalhes:", saveResults);
      }

      return { totalSaved, totalDuplicates };
    } catch (error) {
      console.error("[CRON][SAVE] Erro durante o salvamento:", error);
      throw error;
    }
  }

  private logNextExecution() {
    try {
      const cronExpression = systemConfig.cronExpression; // '0 * * * *'
      const interval = CronExpressionParser.parse(cronExpression, {
        currentDate: new Date(),
        tz: "America/Sao_Paulo",
      });

      const nextRun = interval.next().toDate();

      const formattedNextRun = nextRun.toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      console.log(`[CRON][NEXT] Próxima execução será em: ${formattedNextRun}`);
    } catch (error) {
      console.error("[CRON][NEXT] Erro ao calcular próxima execução:", error);
    }
  }

  private async runJob() {
    try {
      console.log(
        `[CRON][START] Iniciando processamento às ${new Date().toLocaleString(
          "pt-BR",
          {
            timeZone: "America/Sao_Paulo",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }
        )}`
      );

      const rawLogs = await this.fetchRawLogs();
      const standardizedLogs = this.standardizeLogs(rawLogs);
      const saveStats = await this.saveLogs(rawLogs, standardizedLogs);

      const assistantCount = Object.keys(rawLogs.assistants).length;
      const totalStandardizedLogs = Object.values(standardizedLogs).reduce(
        (total, logs) => total + logs.length,
        0
      );

      console.log("[CRON][STATS] Resumo do processamento:");
      console.log(
        `[CRON][STATS] Total de assistants processados: ${assistantCount}`
      );
      console.log(
        `[CRON][STATS] Total de logs padronizados: ${totalStandardizedLogs}`
      );
      console.log(
        `[CRON][STATS] Total de logs salvos no MongoDB: ${saveStats.totalSaved}`
      );

      if (saveStats.totalDuplicates > 0) {
        console.log(
          `[CRON][STATS] Total de logs duplicados ignorados: ${saveStats.totalDuplicates}`
        );
      }

      console.log("[CRON][END] Processamento finalizado com sucesso!");
      this.logNextExecution();
    } catch (error) {
      console.error("[CRON][ERROR] Erro durante o processamento:", error);
      this.logNextExecution();
    }
  }

  private async runAuditJob() {
    try {
      console.log(
        `[AUDIT][START] Iniciando auditoria às ${new Date().toLocaleString(
          "pt-BR",
          {
            timeZone: "America/Sao_Paulo",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }
        )}`
      );

      // Pega a data de ontem
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const auditReport = await this.logAuditService.auditLogsForDay(yesterday);

      console.log("[AUDIT][STATS] Resumo da auditoria:");
      console.log(
        `[AUDIT][STATS] Total de logs verificados: ${auditReport.summary.totalLogs}`
      );
      console.log(
        `[AUDIT][STATS] Logs incluídos: ${auditReport.summary.includedLogs}`
      );
      console.log(
        `[AUDIT][STATS] Logs faltantes: ${auditReport.summary.missingLogs}`
      );
      console.log(`[AUDIT][STATS] Status: ${auditReport.syncStatus.status}`);

      console.log("[AUDIT][END] Auditoria finalizada com sucesso!");
    } catch (error) {
      console.error("[AUDIT][ERROR] Erro durante a auditoria:", error);
    }
  }

  public async startJobs() {
    if (!CronJobs.hasStarted) {
      const shouldStart = await this.promptForStart();
      if (!shouldStart) {
        console.log(
          "[CRON][INIT] CronJob não iniciado por escolha do usuário."
        );
        return;
      }
      CronJobs.hasStarted = true;
    }

    // Job de coleta e persistência
    const collectionJob = new CronJob(
      systemConfig.cronExpression,
      () => {
        console.log("[CRON][SCHEDULE] Iniciando job de coleta...");
        this.runJob();
      },
      null,
      true,
      "America/Sao_Paulo",
      this,
      false
    );

    // Job de auditoria
    const auditJob = new CronJob(
      systemConfig.audit.cronExpression,
      () => {
        console.log("[AUDIT][SCHEDULE] Iniciando job de auditoria...");
        this.runAuditJob();
      },
      null,
      true,
      "America/Sao_Paulo",
      this,
      false // Não executa imediatamente ao iniciar
    );

    collectionJob.start();
    auditJob.start();
    console.log("[CRON][INIT] Jobs iniciados com sucesso");
  }
}
