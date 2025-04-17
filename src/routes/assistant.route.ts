import { FastifyInstance } from 'fastify';
import { Assistant } from '../schemas/assistant.schema';

export async function assistantRoute(fastify: FastifyInstance) {
  fastify.get('/assistants', async (request, reply) => {
    const assistants = await Assistant.find();
    return assistants;
  });

  fastify.get('/assistants/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const assistant = await Assistant.findOne({ assistantId: id });
    return assistant;
  });
}
