import { fastify } from "fastify";
import { connectToMongoDB } from "./utils/mongo";
import { assistantRoute } from "./routes/assistant.route";
import "./config/watson.config";
const app = fastify();

app.register(assistantRoute);

async function start() {
  try {
    await connectToMongoDB();
    await app.listen({ port: 3000 });
    console.log("Server running on port 3000");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

start();
