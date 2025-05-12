/**
 * @file assistant.controller.ts
 * @description Controlador para gerenciar as interações com o Watson Assistant
 */

import { z } from "zod";
import {
  LogsResponse,
  LogsResponseSchema,
} from "../schemas/logs.response.schema";
import { LogService } from "../services/log.service";
import { AssistantService } from "../services/assistant.service";

export class AssistantController {
  private static instance: AssistantController;

  private constructor(private readonly assistantService: AssistantService) {}

  public static getInstance(): AssistantController {
    if (!AssistantController.instance) {
      AssistantController.instance = new AssistantController(
        AssistantService.getInstance()
      );
    }
    return AssistantController.instance;
  }

  async getAllLogsForPeriod(
    startDate: Date,
    endDate: Date
  ): Promise<LogsResponse> {
    try {
      console.log("Fetching all logs between", startDate, "and", endDate);

      // Valida as datas
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error("Invalid date format in time interval calculation");
      }

      const allLogs = await this.assistantService.getAllAssistantsLogs(
        startDate,
        endDate
      );

      for (const [assistantName, logCollection] of allLogs.entries()) {
        allLogs.set(assistantName, LogService.sanitizeLogs(logCollection));
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
