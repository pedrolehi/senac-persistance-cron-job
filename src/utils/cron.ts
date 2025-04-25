import { AssistantController } from "./../controllers/assistant.controller";
import cron from "node-cron";
import { systemConfig } from "../config/system.config";
import { AssistantService } from "../services/assistant.service";
import { promises as fs } from "fs";
import { LogTransformer } from "./logTransformer";

export class CronJobs {
  private static instance: CronJobs;
  private assistantController: AssistantController;

  private constructor() {
    const assistantService = AssistantService.getInstance();
    this.assistantController =
      AssistantController.getInstance(assistantService);
  }

  public static getInstance(): CronJobs {
    if (!CronJobs.instance) {
      CronJobs.instance = new CronJobs();
    }
    return CronJobs.instance;
  }

  // 1. Buscar logs brutos
  private async fetchRawLogs() {
    console.log("[CRON][FETCH] Iniciando coleta de logs brutos...");
    const rawLogs = await this.assistantController.getAllLogsForCron();
    console.log("[CRON][FETCH] Logs brutos coletados com sucesso!");
    return rawLogs;
  }

  // 2. Padronizar logs
  private standardizeLogs(rawLogs: any) {
    console.log("[CRON][STANDARDIZE] Iniciando padronização dos logs...");
    const validatedPayload = LogTransformer.validadeInitialPayload(rawLogs);
    const standardizedLogs =
      LogTransformer.processAllAssistants(validatedPayload);
    console.log("[CRON][STANDARDIZE] Logs padronizados com sucesso!");
    return standardizedLogs;
  }

  // 3. Salvar logs
  private async saveLogs(rawLogs: any, standardizedLogs: any) {
    console.log("[CRON][SAVE] Iniciando salvamento dos logs...");

    const fullLogsData = {
      timestamp: new Date().toISOString(),
      raw: rawLogs,
      standardized: standardizedLogs,
    };

    await fs.writeFile(
      "logs-cron.json",
      JSON.stringify(fullLogsData, null, 2),
      "utf-8"
    );
    console.log("[CRON][SAVE] Arquivo logs-cron.json exportado com sucesso!");
  }

  // 4. Método principal que executa o job
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

      // Executa as etapas em sequência
      const rawLogs = await this.fetchRawLogs();
      const standardizedLogs = this.standardizeLogs(rawLogs);
      await this.saveLogs(rawLogs, standardizedLogs);

      // Estatísticas finais
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
      console.log("[CRON][END] Processamento finalizado com sucesso!");
    } catch (error) {
      console.error("[CRON][ERROR] Erro durante o processamento:", error);
    }
  }

  public startJobs() {
    const cronInterval = systemConfig.cronInterval;

    cron.schedule(`*/${cronInterval} * * * *`, () => {
      console.log("[CRON][SCHEDULE] Iniciando job agendado...");
      this.runJob();
    });

    console.log("[CRON][INIT] Executando coleta inicial...");
    this.runJob();
  }
}
