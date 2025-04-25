import { AssistantController } from "./../controllers/assistant.controller";
import cron from "node-cron";
import { systemConfig } from "../config/system.config";
import { AssistantService } from "../services/assistant.service";
import { promises as fs } from "fs";

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

  private async fetchLogsJob() {
    try {
      const allLogs = await this.assistantController.getAllLogsForCron();
      console.log(allLogs);

      await fs.writeFile(
        "logs-cron.json",
        JSON.stringify(allLogs, null, 2), // formata com 2 espaços
        "utf-8"
      );
      console.log("Arquivo logs-cron.json exportado com sucesso!");

      console.log(
        `[CRON] Coleta de logs realizada às ${new Date().toLocaleString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })}`
      );
      
      const assistantCount = Object.keys(allLogs.assistants).length;
      console.log(`[CRON] Total de assistants processados: ${assistantCount}`);
    } catch (error) {
      console.error("[CRON] Erro ao coletar logs:", error);
    }
  }

  public startJobs() {
    const cronInterval = systemConfig.cronInterval; // Intervalo em minutos
    // Agenda o job para rodar a cada 50 minutos
    cron.schedule(`*/${cronInterval} * * * *`, () => {
      console.log("[CRON] Iniciando job de coleta de logs...");
      this.fetchLogsJob();
    });

    // Executa imediatamente ao iniciar a aplicação (opcional)
    console.log("[CRON] Executando coleta inicial de logs...");
    this.fetchLogsJob();
  }
}
