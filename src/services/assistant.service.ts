/**
 * @file assistant.service.ts
 * @description Serviço para interação com a API do Watson Assistant
 */

import AssistantV2 from "ibm-watson/assistant/v2";
import { IamAuthenticator } from "ibm-watson/auth";
import { watsonConfig } from "../config/watson.config";
import {
  AssistantResponse,
  AssistantResponseSchema,
} from "../schemas/assistant.schema";
import { LogCollection } from "../schemas/logs.schema";
import { z } from "zod";
import { systemConfig } from "../config/system.config";

export class AssistantService {
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
    pageLimit: number = systemConfig.filesPerPage
  ): Promise<LogCollection> {
    try {
      let allLogs: LogCollection = { logs: [], pagination: { next_url: null } };
      let cursor: string | null = null;
      let currentResponse;

      do {
        const params: any = {
          assistantId,
          pageLimit,
          filter: `request_timestamp>=${startDate.toISOString()},request_timestamp<=${endDate.toISOString()}`,
        };
        if (cursor) params.cursor = cursor;

        currentResponse = await this.assistant.listLogs(params);

        // LOG DOS HEADERS DE RATE LIMIT
        const headers = currentResponse.headers;
        const resetDate = new Date(Number(headers["x-ratelimit-reset"]) * 1000);

        console.log(
          `[ASSISTANT][SERVICE] X-RateLimit-Remaining: ${headers["x-ratelimit-remaining"]}`
        );
        console.log(
          `[ASSISTANT][SERVICE] X-RateLimit-Limit: ${headers["x-ratelimit-limit"]}`
        );
        console.log(
          `[ASSISTANT][SERVICE] X-RateLimit-Reset: ${resetDate.toLocaleString(
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

        allLogs.logs = [...allLogs.logs, ...currentResponse.result.logs];

        if (currentResponse.result.pagination.next_url) {
          const cursorMatch =
            currentResponse.result.pagination.next_url.match(/cursor=([^&]+)/);
          cursor = cursorMatch ? cursorMatch[1] : null;
        } else {
          cursor = null;
        }
      } while (cursor !== null);

      allLogs.pagination = { next_url: null };

      return allLogs;
    } catch (error: any) {
      // Se o erro for 429, tente logar os headers também
      if (error.headers) {
        const resetDate = new Date(
          Number(error.headers["x-ratelimit-reset"]) * 1000
        );

        console.error(
          `[IBM Watson Rate Limit] X-RateLimit-Remaining: ${error.headers["x-ratelimit-remaining"]}`
        );
        console.error(
          `[IBM Watson Rate Limit] X-RateLimit-Limit: ${error.headers["x-ratelimit-limit"]}`
        );
        console.log(
          `[IBM Watson Rate Limit] X-RateLimit-Reset: ${resetDate.toLocaleString(
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
      }
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
    const { excludedAssistants } = systemConfig;

    for (const assistant of assistants.assistants) {
      // Pula os assistants que estão na lista de exclusão
      if (excludedAssistants.includes(assistant.name)) {
        console.log(`Skipping excluded assistant: ${assistant.name}`);
        continue;
      }

      console.log("Fetching data from assistant:", assistant.name);

      const liveEnv = assistant.assistant_environments.find(
        (env) => env.name === "live"
      );

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
