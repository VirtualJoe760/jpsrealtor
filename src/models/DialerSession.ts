import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import { DIALER_OUTCOMES, MAX_SESSION_CONTACTS } from '@/lib/dialer/session-contract';

const ItemSchema = new Schema({
  contactId: { type: Schema.Types.ObjectId, ref: 'Contact', required: true },
  phone: { type: String, required: true },
  notes: { type: String, default: '', maxlength: 10000 },
  outcome: { type: String, enum: DIALER_OUTCOMES },
}, { _id: false });

// Bounded embedded queues make the initial simulation checkpoint one atomic write.
// Attempts are separate records; live orchestration still needs separate queue rows.
const DialerSessionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  creationKey: { type: String, required: true, maxlength: 80 },
  selectionHash: { type: String, required: true },
  name: { type: String, required: true, maxlength: 120 },
  provider: { type: String, enum: ['simulation'], default: 'simulation' },
  status: { type: String, enum: ['ready', 'running', 'wrap-up', 'paused', 'completed'], default: 'ready' },
  activeAttemptId: { type: Schema.Types.ObjectId, ref: 'DialerAttempt', default: null },
  version: { type: Number, default: 0 },
  items: { type: [ItemSchema], validate: (items: unknown[]) => items.length > 0 && items.length <= MAX_SESSION_CONTACTS },
}, { timestamps: true });
DialerSessionSchema.index({ userId: 1, creationKey: 1 }, { unique: true });
DialerSessionSchema.index({ userId: 1, updatedAt: -1 });
type DialerSessionRecord = InferSchemaType<typeof DialerSessionSchema>;
const DialerSession = (mongoose.models.DialerSession as Model<DialerSessionRecord>)
  || mongoose.model<DialerSessionRecord>('DialerSession', DialerSessionSchema);
export default DialerSession;
