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
import { Logger, RateLimitHeaders } from "../schemas/logger.schema";
import {
  WatsonError,
  ValidationError,
  ConfigurationError,
} from "../utils/errors";
import { LoggerImpl } from "../utils";

export class AssistantService {
  private static instance: AssistantService;
  private assistant: AssistantV2;
  private readonly logger: Logger;

  private constructor() {
    this.logger = LoggerImpl.getInstance();
    this.validateConfig();
    this.assistant = new AssistantV2({
      version: watsonConfig.version!,
      authenticator: new IamAuthenticator({
        apikey: watsonConfig.apiKey!,
      }),
      serviceUrl: watsonConfig.serviceUrl,
    });
  }

  private validateConfig(): void {
    if (
      !watsonConfig.version ||
      !watsonConfig.apiKey ||
      !watsonConfig.serviceUrl
    ) {
      throw new ConfigurationError("Missing required Watson configuration");
    }
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
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        this.logger.error("Validation error in listAssistants", error.errors);
        throw new ValidationError("Invalid response format from Watson API");
      }
      const watsonError = error as { statusCode?: number; headers?: any };
      throw new WatsonError(
        "Failed to list assistants",
        watsonError.statusCode,
        watsonError.headers
      );
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
        const params = {
          assistantId,
          pageLimit,
          filter: `request_timestamp>=${startDate.toISOString()},request_timestamp<=${endDate.toISOString()}`,
          ...(cursor && { cursor }),
        };

        currentResponse = await this.assistant.listLogs(params);

        // Converte os headers para o tipo RateLimitHeaders
        const rateLimitHeaders: Partial<RateLimitHeaders> = {
          "x-ratelimit-remaining": Array.isArray(
            currentResponse.headers["x-ratelimit-remaining"]
          )
            ? currentResponse.headers["x-ratelimit-remaining"][0]
            : currentResponse.headers["x-ratelimit-remaining"],
          "x-ratelimit-limit": Array.isArray(
            currentResponse.headers["x-ratelimit-limit"]
          )
            ? currentResponse.headers["x-ratelimit-limit"][0]
            : currentResponse.headers["x-ratelimit-limit"],
          "x-ratelimit-reset": Array.isArray(
            currentResponse.headers["x-ratelimit-reset"]
          )
            ? currentResponse.headers["x-ratelimit-reset"][0]
            : currentResponse.headers["x-ratelimit-reset"],
        };

        this.logger.logRateLimit(rateLimitHeaders, "IBM Watson Rate Limit");

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
      if (error.headers) {
        // Converte os headers do erro para o tipo RateLimitHeaders
        const rateLimitHeaders: Partial<RateLimitHeaders> = {
          "x-ratelimit-remaining": Array.isArray(
            error.headers["x-ratelimit-remaining"]
          )
            ? error.headers["x-ratelimit-remaining"][0]
            : error.headers["x-ratelimit-remaining"],
          "x-ratelimit-limit": Array.isArray(error.headers["x-ratelimit-limit"])
            ? error.headers["x-ratelimit-limit"][0]
            : error.headers["x-ratelimit-limit"],
          "x-ratelimit-reset": Array.isArray(error.headers["x-ratelimit-reset"])
            ? error.headers["x-ratelimit-reset"][0]
            : error.headers["x-ratelimit-reset"],
        };

        this.logger.logRateLimit(rateLimitHeaders, "IBM Watson Rate Limit");
      }
      this.logger.error(
        `Error fetching logs for assistant environment_id ${assistantId}`,
        error
      );
      throw new WatsonError(
        "Failed to fetch assistant logs",
        error.statusCode,
        error.headers
      );
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
      if (excludedAssistants.includes(assistant.name)) {
        this.logger.info("Skipping excluded assistant:", assistant.name);
        continue;
      }

      this.logger.info("Fetching data from assistant:", assistant.name);

      const liveEnv = assistant.assistant_environments.find(
        (env) => env.name === "live"
      );
      if (!liveEnv) {
        this.logger.warn(
          `Assistant ${assistant.name} does not have a 'live' environment.`,
          assistant.name
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
        console.log("Error caught in getAllAssistantsLogs:", error);
        this.logger.error(
          `Failed to fetch logs for assistant ${assistant.name}`,
          error
        );
        // Não propagamos o erro para não interromper o processamento dos outros assistentes
        // Mas mantemos o log completo do erro para facilitar o debug
      }
    }
    return logsMap;
  }
}
