import { FastifyRequest, FastifyReply } from "fastify";
import { LogsRequestSchema } from "../schemas/logs.schema";
import dotenv from "dotenv";
import axios from "axios";

const IBM_API_KEY = process.env.IBM_API_KEY;

export async function fetchAndSaveLogs(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const parseResult = LogsRequestSchema.safeParse(request.body);

  if (!parseResult.success) {
    return reply
      .status(400)
      .send({ error: "Requisição inválida", details: parseResult.error });
  }

  try {
    const { data } = await axios.get(IBM_API_KEY!, {
      params: {},
      headers: {
        Authorization: `Bearer ${process.env.IBM_API_KEY}`,
      },
    });

    console.log("Logs recebidos:", data);
  } catch (error) {}
}
