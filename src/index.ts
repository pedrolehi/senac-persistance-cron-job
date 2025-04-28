import { fastify } from "fastify";
import { connectToMongoDB } from "./utils/mongo";
import { assistantRoute } from "./routes/assistant.route";
import "./config/watson.config";
import { CronJobs } from "./utils/cron";
const app = fastify();

app.register(assistantRoute);

async function start() {
  try {
    await connectToMongoDB();
    await app.listen({ port: 3000 });
    console.log("Server running on port 3000");

    // Inicia os cron jobs
    const cronJobs = CronJobs.getInstance();
    await cronJobs.startJobs();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

start();
