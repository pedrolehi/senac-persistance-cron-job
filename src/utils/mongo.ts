import mongoose from 'mongoose';

export async function connectToMongoDB() {
  try {
    await mongoose.connect(process.env.DB_URI || 'mongodb://ibm_cloud_9ffbe8b6_5eb1_4954_8256_0c84ab674ebd:2e7964719a0255f91e0c31e38db092d1d606cf5f00dfc8095d0d8260a7f5c7ca@e60618f7-9b54-46d8-98ec-4916dbaffb51-0.br37s45d0p54n73ffbr0.databases.appdomain.cloud:31951/ibmclouddb', {
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
