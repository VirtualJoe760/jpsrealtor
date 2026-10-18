import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true },
  key: { type: String, required: true, maxlength: 100 },
  attemptId: { type: Schema.Types.ObjectId, required: true },
  amountMilliCredits: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
  settledMilliCredits: { type: Number, min: 0, validate: Number.isSafeInteger },
  state: { type: String, enum: ['held', 'settled', 'released'], default: 'held', required: true },
}, { timestamps: true });
schema.index({ userId: 1, key: 1 }, { unique: true });
schema.index({ userId: 1, state: 1, createdAt: 1 });
// No TTL: elapsed time is not proof an external call stopped incurring charges.
type Reservation = InferSchemaType<typeof schema>;
export default (mongoose.models.CreditReservation as Model<Reservation>)
  || mongoose.model<Reservation>('CreditReservation', schema);
