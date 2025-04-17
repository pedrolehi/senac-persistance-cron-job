import { FastifyInstance } from "fastify";

import { fetchAndSaveLogs } from "../controllers/logs.controller";

export async function logsRoute(app: FastifyInstance) {
  app.post("/webhook/logs", fetchAndSaveLogs);
}
