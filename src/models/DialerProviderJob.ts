import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

// No TTL: uncertain provider requests must remain available for reconciliation.
const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true },
  sessionId: { type: Schema.Types.ObjectId, required: true },
  attemptId: { type: Schema.Types.ObjectId, required: true },
  key: { type: String, required: true, maxlength: 100 },
  requestHash: { type: String, required: true },
  provider: { type: String, enum: ['twilio'], required: true },
  providerAccountId: { type: String, required: true, match: /^AC[a-f\d]{32}$/i },
  command: { type: String, enum: ['create-call'], required: true },
  state: { type: String, enum: ['queued', 'leased', 'dispatching', 'unknown', 'succeeded'], default: 'queued', required: true },
  leaseToken: { type: String, default: null },
  leaseUntil: { type: Date, default: null },
  dispatchStartedAt: { type: Date, default: null },
  providerCallId: { type: String, default: null },
  completedAt: { type: Date, default: null },
}, { timestamps: true });
schema.index({ userId: 1, key: 1 }, { unique: true });
schema.index({ state: 1, leaseUntil: 1, createdAt: 1 });

type ProviderJob = InferSchemaType<typeof schema>;
export default (mongoose.models.DialerProviderJob as Model<ProviderJob>) || mongoose.model<ProviderJob>('DialerProviderJob', schema);
