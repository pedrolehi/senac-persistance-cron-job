import { FastifyInstance } from 'fastify';
import { SyncPoint } from '../schemas/sync-point.schema';

export async function syncRoute(fastify: FastifyInstance) {
  fastify.get('/sync/status', async (request, reply) => {
    const syncPoints = await SyncPoint.find();
    return syncPoints;
  });

  fastify.post('/assistants/:id/sync', async (request, reply) => {
    const { id } = request.params as { id: string };
    // Implement sync logic for specific assistant
    return { message: 'Sync started' };
  });
}
