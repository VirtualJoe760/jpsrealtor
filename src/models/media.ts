import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMedia extends Document {
  slug: string;
  topic: string;
  date: string;

  audioLocal?: string;
  audioUrl?: string;
  videoUrl?: string;
  publicId?: string;

  status?: "pending" | "completed" | "failed";
  deletedFromCloudinary?: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

const MediaSchema = new Schema<IMedia>(
  {
    slug: { type: String, required: true },
    topic: { type: String, required: true },
    date: { type: String, required: true },

    audioLocal: String,
    audioUrl: String,
    videoUrl: String,
    publicId: String,

    status: { type: String, default: "pending" },
    deletedFromCloudinary: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  }
);

export const Media: Model<IMedia> =
  mongoose.models.Media || mongoose.model<IMedia>("Media", MediaSchema);
