import { FastifyReply, FastifyRequest } from "fastify";
import { IAssistantService } from "../interfaces/assistant.interface";
import { AssistantResponse } from "../schemas/assistant.schema";

export class AssistantController {
  constructor(private readonly assistantService: IAssistantService) {}

  async listAssistants(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    try {
      const assistants: AssistantResponse =
        await this.assistantService.listAssistants();
      return reply.send(assistants);
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }
}
