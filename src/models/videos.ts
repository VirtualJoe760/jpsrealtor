import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVideo extends Document {
  listingId: string;
  videoId: string;
  name?: string;
  caption?: string;
  type?: string;
  objectHtml?: string;
}

const VideoSchema: Schema<IVideo> = new Schema({
  listingId: { type: String, required: true, index: true },
  videoId: { type: String, required: true, unique: true },
  name: String,
  caption: String,
  type: String,
  objectHtml: String,
});

const Video: Model<IVideo> = mongoose.models.Video || mongoose.model<IVideo>('Video', VideoSchema);

export default Video;
