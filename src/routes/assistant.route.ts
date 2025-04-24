import { FastifyInstance } from "fastify";
import { AssistantController } from "../controllers/assistant.controller";
import { AssistantService } from "../services/assistant.service";
import { QueryParams } from "../interfaces/query.interface";

export async function assistantRoute(fastify: FastifyInstance) {
  const assistantService = AssistantService.getInstance();
  const assistantController = new AssistantController(assistantService);

  // Rota para listar assistants
  fastify.get("/assistant", (request, reply) =>
    assistantController.listAssistants(request, reply)
  );

  // Rota para logs com tipo específico
  fastify.get<{ Querystring: QueryParams }>(
    "/assistant/logs",
    (request, reply) => assistantController.getAllLogs(request, reply)
  );
}
