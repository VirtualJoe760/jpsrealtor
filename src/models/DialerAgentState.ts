import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true },
  activeSessionId: { type: Schema.Types.ObjectId, default: null },
  activeAttemptId: { type: Schema.Types.ObjectId, default: null },
}, { timestamps: true });
schema.index({ userId: 1 }, { unique: true });
// No TTL: an expired browser/tab does not resolve an unfinished attempt.
type AgentState = InferSchemaType<typeof schema>;
export default (mongoose.models.DialerAgentState as Model<AgentState>) || mongoose.model<AgentState>('DialerAgentState', schema);
