import { AssistantController } from "./../controllers/assistant.controller";
import { AssistantService } from "../services/assistant.service";
import { PersistanceService } from "../services/persistance.service";
import { LogService } from "../services/log.service";
import { LogAuditService } from "../services/log-audit.service";
import { systemConfig } from "../config/system.config";
import { LogsResponse } from "../schemas/logs.response.schema";
import { stdin as input, stdout as output } from "process";
import { promises as fs, truncate } from "fs";
import readline from "readline";
import path from "path";
import { CronJob } from "cron";
import CronExpressionParser from "cron-parser";
import { getTimeInterval } from "../utils/timeParser";
import { EmailService } from "../services/email.service";

export class CronJobs {
  private static instance: CronJobs;
  private assistantController: AssistantController;
  private PersistanceService: PersistanceService;
  private logAuditService: LogAuditService;
  private emailService: EmailService;
  private static hasStarted: boolean = false;

  private constructor() {
    this.assistantController = AssistantController.getInstance();
    this.PersistanceService = PersistanceService.getInstance();
    this.logAuditService = new LogAuditService();
    this.emailService = EmailService.getInstance();
  }

  public static getInstance(): CronJobs {
    if (!CronJobs.instance) {
      CronJobs.instance = new CronJobs();
    }
    return CronJobs.instance;
  }

  private async showMenu(): Promise<void> {
    const rl = readline.createInterface({ input, output });

    while (true) {
      console.log("\n=== Menu de Opções ===");
      console.log("1. Executar Auditoria para Data Específica");
      console.log("2. Verificar Auditorias em Período");
      console.log("3. Verificar Status dos Jobs");
      console.log("4. Sair");
      console.log("===================");

      const answer = await new Promise<string>((resolve) => {
        rl.question("Escolha uma opção (1-4): ", resolve);
      });

      switch (answer) {
        case "1":
          await this.runAuditForSpecificDate(rl);
          break;
        case "2":
          await this.checkAuditsInPeriod(rl);
          break;
        case "3":
          this.checkJobsStatus();
          break;
        case "4":
          console.log("Encerrando programa...");
          rl.close();
          return;
        default:
          console.log(
            "Opção inválida. Por favor, escolha uma opção entre 1 e 4."
          );
      }
    }
  }

  private async runAuditForSpecificDate(rl: readline.Interface): Promise<void> {
    try {
      const dateStr = await new Promise<string>((resolve) => {
        rl.question("Digite a data desejada (DD/MM/YYYY): ", resolve);
      });

      const [day, month, year] = dateStr.split("/").map(Number);
      const date = new Date(year, month - 1, day);

      if (isNaN(date.getTime())) {
        console.log("Data inválida. Por favor, use o formato DD/MM/YYYY.");
        return;
      }

      console.log(`\nIniciando auditoria para a data: ${dateStr}`);
      const auditReport = await this.logAuditService.auditLogsForDay(date);

      console.log("\n[AUDIT][STATS] Resumo da auditoria:");
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
    } catch (error) {
      console.error("[AUDIT][ERROR] Erro durante a auditoria:", error);
    }
  }

  private async checkAuditsInPeriod(rl: readline.Interface): Promise<void> {
    try {
      const startDateStr = await new Promise<string>((resolve) => {
        rl.question("Digite a data inicial (DD/MM/YYYY): ", resolve);
      });

      const endDateStr = await new Promise<string>((resolve) => {
        rl.question("Digite a data final (DD/MM/YYYY): ", resolve);
      });

      const [startDay, startMonth, startYear] = startDateStr
        .split("/")
        .map(Number);
      const [endDay, endMonth, endYear] = endDateStr.split("/").map(Number);

      const startDate = new Date(startYear, startMonth - 1, startDay);
      const endDate = new Date(endYear, endMonth - 1, endDay);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.log("Data inválida. Por favor, use o formato DD/MM/YYYY.");
        return;
      }

      console.log(
        `\nVerificando auditorias no período: ${startDateStr} até ${endDateStr}`
      );
      await this.logAuditService.checkPreviousAudits(startDate, endDate);
    } catch (error) {
      console.error("[AUDIT][ERROR] Erro ao verificar auditorias:", error);
    }
  }

  private async startCronJobs(): Promise<void> {
    if (!CronJobs.hasStarted) {
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

      // Envia email de notificação de erro
      await this.emailService.sendErrorNotification(error as Error, {
        jobName: "processLogs",
        timestamp: new Date().toISOString(),
      });

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

      // Formata a data para exibição consistente
      const auditDate = yesterday.toLocaleDateString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      });

      console.log(`[AUDIT][INFO] Iniciando auditoria para o dia ${auditDate}`);
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

  private checkJobsStatus(): void {
    console.log("\n=== Status dos Jobs ===");
    console.log(
      `CronJob de Coleta: ${CronJobs.hasStarted ? "Ativo" : "Inativo"}`
    );

    if (CronJobs.hasStarted) {
      try {
        const cronExpression = systemConfig.cronExpression;
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

        console.log(`Próxima execução do CronJob: ${formattedNextRun}`);
      } catch (error) {
        console.error("Erro ao calcular próxima execução:", error);
      }
    }
    console.log("=====================");
  }

  public async startJobs() {
    // Inicia os cronjobs automaticamente
    await this.startCronJobs();
    // Mostra o menu
    await this.showMenu();
  }
}
