import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPhoto extends Document {
  listingId: string; // foreign key to listing
  photoId: string;
  caption?: string;
  uriThumb?: string;
  uri300?: string;
  uri640?: string;
  uri800?: string;
  uri1024?: string;
  uri1280?: string;
  uri1600?: string;
  uri2048?: string;
  uriLarge?: string;
  primary?: boolean;
}

const PhotoSchema: Schema<IPhoto> = new Schema({
  listingId: { type: String, required: true, index: true },
  photoId: { type: String, required: true, unique: true },
  caption: String,
  uriThumb: String,
  uri300: String,
  uri640: String,
  uri800: String,
  uri1024: String,
  uri1280: String,
  uri1600: String,
  uri2048: String,
  uriLarge: String,
  primary: Boolean,
});

// Compound index for optimized photo lookups
PhotoSchema.index({ listingId: 1, primary: -1, Order: 1 });

// ✅ Avoid model recompilation in development
const Photo: Model<IPhoto> = mongoose.models.Photo || mongoose.model<IPhoto>('Photo', PhotoSchema);

export default Photo;
