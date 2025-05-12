/**
 * @file index.ts
 * @description Ponto de entrada principal da aplicação - Serviço de Cron Jobs
 * @module index
 */

import { connectToMongoDB } from "./config/database";
import "./config/watson.config";
import { CronJobs } from "./jobs/cron";

/**
 * Função principal que inicia o serviço de cron jobs
 * @async
 * @function start
 * @returns {Promise<void>}
 * @throws {Error} Se houver erro ao iniciar o serviço
 */

async function start() {
  try {
    // Conecta ao MongoDB
    await connectToMongoDB();
    console.log("Connected to MongoDB");

    // Inicia os cron jobs
    const cronJobs = CronJobs.getInstance();
    await cronJobs.startJobs();
    console.log("Cron jobs started successfully");
  } catch (err) {
    console.error("Error starting service:", err);
    process.exit(1);
  }
}

// Inicia a aplicação
start();
