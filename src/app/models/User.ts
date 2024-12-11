// src\app\models\User.ts

import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId; // Add _id explicitly
  email: string;
  password: string; // Hashed password
  name: string;
  role: 'agent' | 'client';
  subtype?: 'local'; // Applies only to clients
  brokerName?: string; // For agents
  dreNumber?: string; // For US agents
  foreignLicenseNumber?: string; // For foreign national agents
  isForeignNational?: boolean; // Flag for foreign nationals
  interests?: string[]; // e.g., "buy", "sell", "co-brand", "open houses"
  createdAt: Date;
  updatedAt: Date;
}

const userSchema: Schema<IUser> = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['agent', 'client'],
      required: true,
    },
    subtype: {
      type: String,
      enum: ['local'],
      required: false,
    },
    brokerName: {
      type: String,
      required: function() { return this.role === 'agent'; },
    },
    dreNumber: {
      type: String,
      required: function() { return this.role === 'agent' && !this.isForeignNational; },
    },
    foreignLicenseNumber: {
      type: String,
      required: function() { return this.role === 'agent' && this.isForeignNational; },
    },
    isForeignNational: {
      type: Boolean,
      default: false,
    },
    interests: {
      type: [String],
      enum: ['buy', 'sell', 'co-brand', 'open houses'],
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export default User;
