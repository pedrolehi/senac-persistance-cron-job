import { AssistantController } from "./../controllers/assistant.controller";
import { AssistantService } from "../services/assistant.service";
import { PersistanceService } from "../services/persistance.service";
import { LogTransformer } from "./logTransformer";
import { systemConfig } from "../config/system.config";
import { LogsResponse } from "../schemas/logs.response.schema";
import { stdin as input, stdout as output } from "process";
import { promises as fs } from "fs";
import readline from "readline";
import path from "path";
import { CronJob } from "cron";
import CronExpressionParser from "cron-parser";

export class CronJobs {
  private static instance: CronJobs;
  private assistantController: AssistantController;
  private PersistanceService: PersistanceService;
  private static hasStarted: boolean = false;

  private constructor() {
    const assistantService = AssistantService.getInstance();
    this.assistantController =
      AssistantController.getInstance(assistantService);
    this.PersistanceService = PersistanceService.getInstance();
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
    const rawLogs = await this.assistantController.getAllLogsForCron();
    console.log("[CRON][FETCH] Logs brutos coletados com sucesso!");
    return rawLogs;
  }

  private standardizeLogs(rawLogs: LogsResponse) {
    console.log("[CRON][STANDARDIZE] Iniciando padronização dos logs...");
    const standardizedLogs = LogTransformer.processAllAssistants(rawLogs);
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

    const cronExpression = systemConfig.cronExpression;

    const job = new CronJob(
      `${cronExpression}`,
      () => {
        console.log("[CRON][SCHEDULE] Iniciando job agendado...");
        this.runJob();
      },
      null,
      true,
      "America/Sao_Paulo",
      this,
      true // runOnInit: true - executa imediatamente ao iniciar
    );

    job.start();
    console.log("[CRON][INIT] Job iniciado com execução imediata");
  }
}
