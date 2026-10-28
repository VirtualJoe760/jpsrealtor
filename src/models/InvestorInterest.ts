// src/models/InvestorInterest.ts
//
// A NON-BINDING indication of interest in ChatRealty's planned pre-seed
// community round (/invest). Under Regulation Crowdfunding's testing-the-waters
// rule the company may gauge interest before filing a Form C, but may not take
// money or commitments — so this stores an amount someone *might* invest and
// nothing more. No payment is ever attached to one of these.

import mongoose, { Schema, Document, Model } from "mongoose";

export interface IInvestorInterest extends Document {
  userId: mongoose.Types.ObjectId;
  name?: string;
  email: string;
  amount: number; // whole USD
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvestorInterestSchema = new Schema<IInvestorInterest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    name: { type: String },
    email: { type: String, required: true },
    amount: { type: Number, required: true, min: 100 },
    note: { type: String, maxlength: 1000 },
  },
  { timestamps: true, collection: "investor_interest" }
);

export default (mongoose.models.InvestorInterest ||
  mongoose.model<IInvestorInterest>("InvestorInterest", InvestorInterestSchema)) as Model<IInvestorInterest>;
