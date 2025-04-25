import { LogCollection } from './../schemas/logs.schema';
import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { IAssistantService } from "../interfaces/assistant.interface";
import { QueryParams } from "../interfaces/query.interface";
import { getTimeInterval } from "../utils/timeParser";
import {
  LogsResponse,
  LogsResponseSchema,
} from "../schemas/logs.response.schema";
import { LogSanitizer } from "../utils/sanitizer";

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

      for(const [assistantName, LogCollection] of allLogs.entries()) {
        allLogs.set(assistantName, LogSanitizer.sanitizeLogs(LogCollection));
      }

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

  async getAllLogsForCron(): Promise<LogsResponse> {
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

      for (const [assistantName, logCollection] of allLogs.entries()) {
        allLogs.set(assistantName, LogSanitizer.sanitizeLogs(logCollection));
      }

      // Converte o Map para um objeto para melhor serialização
      const logsObject = Object.fromEntries(allLogs);

      // Validação com Zod
      const result = LogsResponseSchema.parse({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        assistants: logsObject,
      });

      return result;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        throw new Error("Invalid log data structure");
      }
      console.error("Error fetching logs:", error);
      throw error;
    }
  }
}
