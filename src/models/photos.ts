import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Photo Model - DEPRECATED
 *
 * Photos are now stored directly in unified_listings.media field.
 * Use /api/listings/[listingKey]/photos endpoint instead.
 *
 * This model is kept for backward compatibility only.
 */
export interface IPhoto extends Document {
  listingKey: string;
  mediaKey: string;
  order?: number;
  uri800?: string;
  uri1024?: string;
  primary?: boolean;
}

const PhotoSchema: Schema<IPhoto> = new Schema({
  listingKey: { type: String, required: true, index: true },
  mediaKey: { type: String, required: true },
  order: Number,
  uri800: String,
  uri1024: String,
  primary: Boolean,
});

PhotoSchema.index({ listingKey: 1, order: 1 });

// ✅ Avoid model recompilation in development
export default (mongoose.models.Photo ||
  mongoose.model<IPhoto>('Photo', PhotoSchema)) as Model<IPhoto>;
