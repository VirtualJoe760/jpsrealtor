// src/models/JobApplication.ts
//
// An application to an open role on /join. Resume and cover-letter files are
// stored IN this document (Buffer), not on Cloudinary: résumés are personal
// data, and Cloudinary uploads here are public URLs. Size is capped by the
// upload route (4 MB total, Vercel's body limit), well under Mongo's 16 MB.
// `data` is select:false so listing applications never pulls the files.

import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStoredFile {
  filename: string;
  contentType: string;
  size: number;
  data: Buffer;
}

export interface IJobApplication extends Document {
  userId: mongoose.Types.ObjectId;
  roleSlug: string;
  roleTitle: string;
  name: string;
  email: string;
  phone?: string;
  linkedin?: string;
  answers: { questionId: string; question: string; answer: string }[];
  coverLetterText?: string;
  resume: IStoredFile;
  coverLetterFile?: IStoredFile;
  status: "new" | "reviewing" | "interview" | "declined" | "hired";
  createdAt: Date;
  updatedAt: Date;
}

const StoredFileSchema = new Schema<IStoredFile>(
  {
    filename: { type: String, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true, select: false },
  },
  { _id: false }
);

const JobApplicationSchema = new Schema<IJobApplication>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    roleSlug: { type: String, required: true },
    roleTitle: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    linkedin: { type: String },
    answers: [
      {
        _id: false,
        questionId: { type: String, required: true },
        question: { type: String, required: true },
        answer: { type: String, required: true },
      },
    ],
    coverLetterText: { type: String },
    resume: { type: StoredFileSchema, required: true },
    coverLetterFile: { type: StoredFileSchema },
    status: { type: String, enum: ["new", "reviewing", "interview", "declined", "hired"], default: "new" },
  },
  { timestamps: true, collection: "job_applications" }
);

// One application per person per role.
JobApplicationSchema.index({ userId: 1, roleSlug: 1 }, { unique: true });

export default (mongoose.models.JobApplication ||
  mongoose.model<IJobApplication>("JobApplication", JobApplicationSchema)) as Model<IJobApplication>;
