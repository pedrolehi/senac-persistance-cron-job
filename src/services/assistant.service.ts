// src/services/assistant.service.ts
import AssistantV2 from "ibm-watson/assistant/v2";
import { IamAuthenticator } from "ibm-watson/auth";
import { IAssistantService } from "../interfaces/assistant.interface";
import { watsonConfig } from "../config/watson.config";
import {
  AssistantResponse,
  AssistantResponseSchema,
} from "../schemas/assistant.schema";
import { LogCollection } from "../schemas/logs.schema";
import { z } from "zod";

export class AssistantService implements IAssistantService {
  private static instance: AssistantService;
  private assistant: AssistantV2;

  private constructor() {
    this.assistant = new AssistantV2({
      version: watsonConfig.version!,
      authenticator: new IamAuthenticator({
        apikey: watsonConfig.apiKey!,
      }),
      serviceUrl: watsonConfig.serviceUrl,
    });
  }

  public static getInstance(): AssistantService {
    if (!AssistantService.instance) {
      AssistantService.instance = new AssistantService();
    }
    return AssistantService.instance;
  }

  async listAssistants(): Promise<AssistantResponse> {
    try {
      const response = await this.assistant.listAssistants();

      const transformedResponse = {
        assistants: response.result.assistants.map((assistant) => ({
          name: assistant.name,
          language: assistant.language,
          description: assistant.description || "",
          assistant_id: assistant.assistant_id,
          assistant_skills: assistant.assistant_skills || [],
          assistant_environments: assistant.assistant_environments || [],
        })),
        pagination: response.result.pagination,
      };

      const parsedResponse = AssistantResponseSchema.parse(transformedResponse);
      return parsedResponse;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        throw new Error("Invalid response format from Watson API");
      }
      throw error;
    }
  }

  async getAssistantLogs(
    assistantId: string,
    startDate: Date,
    endDate: Date,
    pageLimit: number = 100
  ): Promise<LogCollection> {
    try {
      const response = await this.assistant.listLogs({
        assistantId,
        pageLimit,
        // filter: `request_timestamp>=${startDate.toISOString()},request_timestamp<=${endDate.toISOString()}`,
      });
      return response.result;
    } catch (error) {
      console.error(
        `Error fetching logs for assistant environment_id ${assistantId}`,
        error
      );
      throw error;
    }
  }

  async getAllAssistantsLogs(
    startDate: Date,
    endDate: Date
  ): Promise<Map<string, LogCollection>> {
    const assistants = await this.listAssistants();
    const logsMap = new Map();

    console.log("Assistants:", assistants);
    for (const assistant of assistants.assistants) {
      // Procura o environment "live"
      const liveEnv = assistant.assistant_environments.find(
        (env) => env.name === "live"
      );
      console.log(liveEnv);

      if (!liveEnv) {
        console.warn(
          `Assistant ${assistant.name} does not have a 'live' environment.`
        );
        continue;
      }
      try {
        const logs = await this.getAssistantLogs(
          liveEnv.environment_id,
          startDate,
          endDate
        );
        logsMap.set(assistant.name, logs);
      } catch (error) {
        console.error(
          `Failed to fetch logs for assistant ${liveEnv.environment_id} (live):`,
          error instanceof Error ? error.message : error
        );
      }
    }
    return logsMap;
  }
}
