import { AssistantCollection } from "ibm-watson/assistant/v2";

export interface IAssistantService {
  listAssistants(): Promise<AssistantCollection>;
}
