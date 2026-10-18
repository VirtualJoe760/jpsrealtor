import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true },
  jobId: { type: Schema.Types.ObjectId, required: true },
  sessionId: { type: Schema.Types.ObjectId, required: true },
  attemptId: { type: Schema.Types.ObjectId, required: true },
  provider: { type: String, enum: ['twilio'], required: true },
  providerCallId: { type: String, required: true },
  sequence: { type: Number, min: 0, required: true },
  status: { type: String, enum: ['queued', 'initiated', 'ringing', 'in-progress', 'completed', 'busy', 'failed', 'no-answer', 'canceled'], required: true },
  durationSeconds: { type: Number, min: 0, default: null },
  payloadHash: { type: String, required: true },
}, { timestamps: true });
// Retain delivery evidence for reconciliation; do not put raw phone/body data here.
schema.index({ jobId: 1, providerCallId: 1, sequence: 1 }, { unique: true });
schema.index({ userId: 1, attemptId: 1, createdAt: 1 });
type ProviderEvent = InferSchemaType<typeof schema>;
export default (mongoose.models.DialerProviderEvent as Model<ProviderEvent>) || mongoose.model<ProviderEvent>('DialerProviderEvent', schema);
