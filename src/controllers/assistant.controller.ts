import { FastifyReply, FastifyRequest } from "fastify";
import { IAssistantService } from "../interfaces/assistant.interface";
import { QueryParams } from "../interfaces/query.interface";

export class AssistantController {
  constructor(private readonly assistantService: IAssistantService) {}

  async listAssistants(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    try {
      const assistants = await this.assistantService.listAssistants();
      return reply.send(assistants);
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async getAllLogs(
    request: FastifyRequest<{ Querystring: QueryParams }>,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    try {
      // Pega parâmetros da query com valores default
      const startDate = request.query.startDate
        ? new Date(request.query.startDate)
        : new Date(Date.now() - 24 * 60 * 60 * 1000); // último dia por padrão

      const endDate = request.query.endDate
        ? new Date(request.query.endDate)
        : new Date();

      // Valida as datas
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return reply.status(400).send({
          error:
            "Invalid date format. Use ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)",
        });
      }

      const allLogs = await this.assistantService.getAllAssistantsLogs(
        startDate,
        endDate
      );

      // Converte o Map para um objeto para melhor serialização
      const logsObject = Object.fromEntries(allLogs);

      return reply.send({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        assistants: logsObject,
      });
    } catch (error) {
      console.error("Error fetching logs:", error);
      return reply.status(500).send({
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }
}
