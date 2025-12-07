import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICaliforniaStats extends Document {
  count: number;
  medianPrice: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  lastUpdated: Date;
}

const CaliforniaStatsSchema = new Schema<ICaliforniaStats>(
  {
    count: {
      type: Number,
      required: true,
      default: 0
    },
    medianPrice: {
      type: Number,
      required: true,
      default: 0
    },
    avgPrice: {
      type: Number,
      required: true,
      default: 0
    },
    minPrice: {
      type: Number,
      required: true,
      default: 0
    },
    maxPrice: {
      type: Number,
      required: true,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

const CaliforniaStats: Model<ICaliforniaStats> =
  mongoose.models.CaliforniaStats ||
  mongoose.model<ICaliforniaStats>("CaliforniaStats", CaliforniaStatsSchema);

export default CaliforniaStats;
