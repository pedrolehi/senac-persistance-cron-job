import mongoose from 'mongoose';

const syncPointSchema = new mongoose.Schema({
  assistantId: { type: String, required: true },
  lastSyncTimestamp: { type: Date, required: true },
  lastLogId: { type: String, required: true }
});

export const SyncPoint = mongoose.model('SyncPoint', syncPointSchema, 'syncPoint');
