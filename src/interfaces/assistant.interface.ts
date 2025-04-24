// src/interfaces/assistant.interface.ts
import { AssistantResponse } from "../schemas/assistant.schema";
import { LogCollection } from "../schemas/logs.schema";

export interface IAssistantService {
  listAssistants(): Promise<AssistantResponse>;
  getAllAssistantsLogs(
    startDate: Date,
    endDate: Date
  ): Promise<Map<string, LogCollection>>;
}
