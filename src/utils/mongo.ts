import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export async function connectToMongoDB() {
  try {
    await mongoose.connect(process.env.DB_URI!, {
      ssl: true,
      tlsInsecure: true, // use isso com cuidado — ideal apenas para testes locais
      socketTimeoutMS: 30000,
      connectTimeoutMS: 30000,
    });

    console.log("✅ MongoDB conectado");
  } catch (error) {
    console.error("❌ Erro ao conectar ao MongoDB", error);
    process.exit(1);
  }
}
