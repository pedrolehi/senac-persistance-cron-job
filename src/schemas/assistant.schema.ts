import mongoose from 'mongoose';

const assistantSchema = new mongoose.Schema({
  assistantId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  collectionName: { type: String, required: true }
});

export const Assistant = mongoose.model('Assistant', assistantSchema);
