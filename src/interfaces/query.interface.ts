import { FastifyRequest } from "fastify";

export interface QueryParams {
  startDate?: string;
  endDate?: string;
}

// Define o tipo para a request
export type LogsRequest = FastifyRequest<{
  Querystring: QueryParams;
}>;
