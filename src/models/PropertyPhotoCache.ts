import mongoose, { Schema } from 'mongoose';
export const ExternalPropertyPhotoSchema = new Schema({
  url: { type: String, required: true }, source: String, sourcePage: String, caption: String, order: Number, discoveredAt: Date,
}, { _id: false });
const PropertyPhotoCacheSchema = new Schema({
  addressKey: { type: String, required: true, unique: true },
  photos: { type: [ExternalPropertyPhotoSchema], default: [] },
  checkedAt: Date, retryAfter: Date, leaseUntil: Date, leaseToken: String, message: String,
}, { timestamps: true });
const PropertyPhotoCache: mongoose.Model<any> = mongoose.models.PropertyPhotoCache || mongoose.model('PropertyPhotoCache', PropertyPhotoCacheSchema);
export default PropertyPhotoCache;
