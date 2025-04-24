import { AssistantController } from "./../controllers/assistant.controller";
import cron from "node-cron";
import { systemConfig } from "../config/system.config";
import { AssistantService } from "../services/assistant.service";
import { IAssistantService } from "../interfaces/assistant.interface";
import { assistantRoute } from "../routes/assistant.route";
import { all } from "axios";

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
      console.log(
        `[CRON] Coleta de logs realizada às ${new Date().toISOString()}`
      );
      console.log(
        `[CRON] Total de assistants processados: ${allLogs.assistants.length}`
      );
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
