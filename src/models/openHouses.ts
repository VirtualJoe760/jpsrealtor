import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOpenHouse extends Document {
  listingId: string;
  openHouseId: string;
  date?: string;
  startTime?: string;
  endTime?: string;
}

const OpenHouseSchema: Schema<IOpenHouse> = new Schema({
  listingId: { type: String, required: true, index: true },
  openHouseId: { type: String, required: true, unique: true },
  date: String,
  startTime: String,
  endTime: String,
});

// Compound index for optimized open house lookups
OpenHouseSchema.index({ listingId: 1, date: 1 });

const OpenHouse: Model<IOpenHouse> = mongoose.models.OpenHouse || mongoose.model<IOpenHouse>('OpenHouse', OpenHouseSchema);

export default OpenHouse;
