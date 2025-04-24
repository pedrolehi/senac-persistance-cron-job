import cron from "node-cron";
import { AssistantService } from "../services/assistant.service";

export class CronJobs {
  private static instance: CronJobs;
  private assistantService: AssistantService;

  private constructor() {
    this.assistantService = AssistantService.getInstance();
  }

  public static getInstance(): CronJobs {
    if (!CronJobs.instance) {
      CronJobs.instance = new CronJobs();
    }
    return CronJobs.instance;
  }

  private async fetchLogsJob() {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 60 * 60 * 1000); // últimos 60 minutos

    try {
      const logsMap = await this.assistantService.getAllAssistantsLogs(
        startDate,
        endDate
      );
      console.log(
        `[CRON] Logs coletados com sucesso às ${new Date().toISOString()}`
      );
      console.log(`[CRON] Total de assistants processados: ${logsMap.size}`);
    } catch (error) {
      console.error("[CRON] Erro ao coletar logs:", error);
    }
  }

  public startJobs() {
    // Agenda o job para rodar a cada 50 minutos
    cron.schedule("*/50 * * * *", () => {
      console.log("[CRON] Iniciando job de coleta de logs...");
      this.fetchLogsJob();
    });

    // Executa imediatamente ao iniciar a aplicação (opcional)
    console.log("[CRON] Executando coleta inicial de logs...");
    this.fetchLogsJob();
  }
}
