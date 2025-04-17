import { FastifyInstance } from "fastify";
import dotenv from "dotenv";
import axios from "axios";
dotenv.config();

// URL da API que já contém a chave de API
const url = process.env.IBM_API!;
const auth = process.env.IBM_AUTH!;

export async function testIBMRoute(app: FastifyInstance) {
  app.get("/test-ibm", async (request, reply) => {
    try {
      const response = await axios.get(url, {
        headers: {
          Authorization: auth,
          "Content-Type": "application/json",
        },
      });
      return reply.send(response.data);
    } catch (error) {
      console.error("Error fetching data from IBM API:", error);
      return reply.status(500).send({ error: "Failed to fetch data" });
    }
  });
}
