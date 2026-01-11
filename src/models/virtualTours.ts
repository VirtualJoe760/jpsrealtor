import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVirtualTour extends Document {
  listingId: string;
  virtualTourId: string;
  name?: string;
  uri?: string;
  type?: string;
}

const VirtualTourSchema: Schema<IVirtualTour> = new Schema({
  listingId: { type: String, required: true, index: true },
  virtualTourId: { type: String, required: true, unique: true },
  name: String,
  uri: String,
  type: String,
});

export default (mongoose.models.VirtualTour ||
  mongoose.model<IVirtualTour>('VirtualTour', VirtualTourSchema)) as Model<IVirtualTour>;
