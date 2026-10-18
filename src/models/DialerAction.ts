import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true },
  sessionId: { type: Schema.Types.ObjectId, required: true },
  key: { type: String, required: true, maxlength: 100 },
  requestHash: { type: String, required: true },
  command: { type: String, enum: ['start', 'answer', 'end', 'save'], required: true },
  attemptId: { type: Schema.Types.ObjectId, default: null },
}, { timestamps: true });
schema.index({ userId: 1, key: 1 }, { unique: true });
type Action = InferSchemaType<typeof schema>;
export default (mongoose.models.DialerAction as Model<Action>) || mongoose.model<Action>('DialerAction', schema);
