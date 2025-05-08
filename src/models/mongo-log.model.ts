import mongoose, { Schema } from "mongoose";

const userSchema = new mongoose.Schema(
  {
    session_id: { type: String, required: true },
    chapa: { type: String },
    emplid: { type: String },
  },
  { _id: false }
);

const standardizedLogSchemaMongo = new Schema({
  log_id: { type: String, required: true, unique: true },
  conversation_id: {
    type: String,
    required: true,
  },
  user: userSchema,
  context: { type: Object },
  input: { type: String },
  intents: [Schema.Types.Mixed],
  entities: [Schema.Types.Mixed],
  output: { type: Array, required: false },
  timestamp: {
    type: Date,
    required: true,
  },
});

// Índice composto único para evitar duplicatas
standardizedLogSchemaMongo.index(
  { conversation_id: 1, timestamp: 1 },
  { unique: true }
);

export function getAssistantModel(assistantName: string) {
  const collectionName = assistantName.toLowerCase(); // Ex: 'geduc'
  if (mongoose.models[collectionName]) {
    return mongoose.models[collectionName];
  }
  // O terceiro argumento força o nome exato da collection
  return mongoose.model(
    collectionName,
    standardizedLogSchemaMongo,
    collectionName
  );
}
