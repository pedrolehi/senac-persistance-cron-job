// src/config/watson.config.ts
import dotenv from "dotenv";

dotenv.config();

export const watsonConfig = {
  apiKey: process.env.IBM_APIKEY,
  serviceUrl: process.env.IBM_URL,
  version: process.env.IBM_VERSION,
};

// Validação inicial da configuração
if (!watsonConfig.apiKey || !watsonConfig.serviceUrl || !watsonConfig.version) {
  throw new Error(
    "Missing IBM Watson API configuration in environment variables"
  );
}
