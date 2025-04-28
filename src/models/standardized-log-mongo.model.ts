import mongoose, {Schema} from "mongoose";

const userSchema = new mongoose.Schema(
  {
    session_id: { type: String, required: true },
    chapa: { type: String },
    emplid: { type: String },
  },
  { _id: false }
);

const standardizedLogSchemaMongo = new mongoose.Schema({
  conversation_id: { type: String, required: true },
  user: userSchema,
  context: { type: Object },
  input: { type: String },
  intents: [mongoose.Schema.Types.Mixed],
  entities: [mongoose.Schema.Types.Mixed],
  output: { type: Object, required: false, default: null },
  timestamp: { type: Schema.Types.Mixed, required: true },
});

export interface IStandardizedLog {
  conversation_id: string;
  user: {
    session_id: string;
    chapa?: string;
    emplid?: string;
  };
  context: Record<string, any>;
  input: string;
  intents: any[];
  entities: any[];
  output?: Record<string, any> | null;
  timestamp: string | Date;
}

export function getAssistantModel(assistantName: string) {
  const collectionName = assistantName.toLowerCase();

  if (mongoose.models[collectionName]) {
    return mongoose.models[collectionName];
  }

  return mongoose.model(collectionName, standardizedLogSchemaMongo);
}
