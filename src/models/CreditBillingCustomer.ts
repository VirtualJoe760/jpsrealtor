import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true },
  mode: { type: String, enum: ['test', 'live'], required: true },
  customerId: { type: String, required: true },
}, { timestamps: true });
schema.index({ userId: 1, mode: 1 }, { unique: true });
type RecordType = InferSchemaType<typeof schema>;
export default (mongoose.models.CreditBillingCustomer as Model<RecordType>)
  || mongoose.model<RecordType>('CreditBillingCustomer', schema);
