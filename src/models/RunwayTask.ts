// src\models\RunwayTask.ts

import mongoose, { Schema, models, model, Model, Document } from "mongoose";

export interface IRunwayTask extends Document {
  imageUrl: string;
  prompt?: string;
  status: "pending" | "processing" | "complete" | "failed";
  videoUrl?: string;
  predictionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RunwayTaskSchema = new Schema<IRunwayTask>(
  {
    imageUrl: { type: String, required: true },
    prompt: { type: String },
    status: {
      type: String,
      enum: ["pending", "processing", "complete", "failed"],
      default: "pending",
    },
    videoUrl: String,
    predictionId: String,
  },
  { timestamps: true }
);

// ❗ Named export with type safety
export const RunwayTask: Model<IRunwayTask> =
  models.RunwayTask || model<IRunwayTask>("RunwayTask", RunwayTaskSchema);
