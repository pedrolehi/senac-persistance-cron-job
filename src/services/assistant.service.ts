// src/services/assistant.service.ts
import AssistantV2, { AssistantCollection } from "ibm-watson/assistant/v2";
import { IamAuthenticator } from "ibm-watson/auth";
import { IAssistantService } from "../interfaces/assistant.interface";
import { watsonConfig } from "../config/watson.config";

export class AssistantService implements IAssistantService {
  private static instance: AssistantService;
  private assistant: AssistantV2;

  private constructor() {
    // Use apenas o watsonConfig
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

  async listAssistants(): Promise<AssistantCollection> {
    try {
      const response = await this.assistant.listAssistants();
      return response.result;
    } catch (error) {
      console.error("Error listing assistants:", error);
      throw error;
    }
  }
}
