import Fastify from "fastify";
import { logsRoute } from "./routes/logs.route";
import { testIBMRoute } from "./routes/test-ibm";
import { connectToMongoDB } from "./utils/mongo";

const app = Fastify({
  logger: true,
});

app.register(logsRoute);
app.register(testIBMRoute);

const start = async () => {
  await connectToMongoDB();
  await app.listen({ port: 3001 });
  console.log("🚀 Servidor rodando na porta 3001");
};

start();
