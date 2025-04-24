import { FastifyReply, FastifyRequest } from "fastify";
import { IAssistantService } from "../interfaces/assistant.interface";
import { QueryParams } from "../interfaces/query.interface";
import { getTimeInterval } from "../utils/timeParser";

export class AssistantController {
  private static instance: AssistantController;

  constructor(private readonly assistantService: IAssistantService) {}

  public static getInstance(
    assistantService: IAssistantService
  ): AssistantController {
    if (!AssistantController.instance) {
      AssistantController.instance = new AssistantController(assistantService);
    }
    return AssistantController.instance;
  }

  async listAssistants(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    try {
      const assistants = await this.assistantService.listAssistants();
      return reply.send(assistants);
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async getAllLogs(
    request: FastifyRequest<{ Querystring: QueryParams }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    try {
      const { startDate, endDate } = getTimeInterval();

      // Valida as datas
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return reply.status(400).send({
          error:
            "Invalid date format. Use ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)",
        });
      }

      const allLogs = await this.assistantService.getAllAssistantsLogs(
        startDate,
        endDate
      );

      // Converte o Map para um objeto para melhor serialização
      const logsObject = Object.fromEntries(allLogs);

      return reply.send({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        assistants: logsObject,
      });
    } catch (error) {
      console.error("Error fetching logs:", error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async getAllLogsForCron(): Promise<{
    startDate: string;
    endDate: string;
    assistants: Record<string, any>;
  }> {
    try {
      const { startDate, endDate } = getTimeInterval();

      // Valida as datas
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error("Invalid date format in time interval calculation");
      }

      const allLogs = await this.assistantService.getAllAssistantsLogs(
        startDate,
        endDate
      );

      // Converte o Map para um objeto para melhor serialização
      const logsObject = Object.fromEntries(allLogs);

      return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        assistants: logsObject,
      };
    } catch (error) {
      console.error("Error fetching logs:", error);
      throw error; // Re-throw para ser tratado no CronJobs
    }
  }
}
