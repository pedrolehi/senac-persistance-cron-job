import mongoose from 'mongoose';

export async function connectToMongoDB() {
  try {

    await mongoose.connect(process.env.DB_URI!, {
      socketTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      ssl: true,
      sslValidate: false
    });

    console.log("✅ MongoDB conectado");
  } catch (error) {
    console.error("❌ Erro ao conectar ao MongoDB", error);
    process.exit(1);
  }
}
