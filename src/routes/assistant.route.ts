import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { AssistantService } from "./../services/assistant.service";
import { AssistantController } from "../controllers/assistant.controller";

export async function assistantRoute(fastify: FastifyInstance) {
  const assistantService = AssistantService.getInstance();
  const assistantController = new AssistantController(assistantService);

  fastify.get(
    "/assistant",
    async (request: FastifyRequest, reply: FastifyReply) => {
      return assistantController.listAssistants(request, reply);
    }
  );
}
