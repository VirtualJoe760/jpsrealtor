import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import { DIALER_OUTCOMES } from '@/lib/dialer/session-contract';

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true },
  sessionId: { type: Schema.Types.ObjectId, ref: 'DialerSession', required: true },
  contactId: { type: Schema.Types.ObjectId, ref: 'Contact', required: true },
  phone: { type: String, required: true },
  provider: { type: String, enum: ['simulation'], default: 'simulation', required: true },
  state: { type: String, enum: ['ringing', 'connected', 'wrap-up', 'completed'], required: true },
  startedAt: { type: Date, required: true },
  answeredAt: Date,
  endedAt: Date,
  completedAt: Date,
  notes: { type: String, default: '', maxlength: 10000 },
  outcome: { type: String, enum: DIALER_OUTCOMES },
}, { timestamps: true });
schema.index({ userId: 1, sessionId: 1, createdAt: -1 });
schema.index({ userId: 1, contactId: 1, createdAt: -1 });
type Attempt = InferSchemaType<typeof schema>;
export default (mongoose.models.DialerAttempt as Model<Attempt>) || mongoose.model<Attempt>('DialerAttempt', schema);
