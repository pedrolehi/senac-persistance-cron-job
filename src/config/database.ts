import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

export async function connectToMongoDB() {
  try {
    await mongoose.connect(process.env.DB_URI!, {
      socketTimeoutMS: 120000,
      connectTimeoutMS: 120000,
      serverSelectionTimeoutMS: 120000,
      maxPoolSize: 10,
    });

    console.log("✅ MongoDB conectado");
  } catch (error) {
    console.error("❌ Erro ao conectar ao MongoDB", error);
    process.exit(1);
  }
}
