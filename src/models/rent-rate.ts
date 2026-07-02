// src/models/rent-rate.ts
//
// The `rent_rates` collection is written by the VPS PyMongo cron — one doc per
// ZIP, keyed by a unique `postalCode`, holding the market "going rate" for
// rentals in that area (goingRate, byBedroom, active/rented/furnished/unfurnished
// blocks, quality.confidence). strict:false so we read exactly what the builder
// wrote without re-declaring the (evolving) shape.

import mongoose, { Schema, type Model } from "mongoose";

const RentRateSchema = new Schema({}, { strict: false, collection: "rent_rates" });

const RentRate: Model<any> =
  (mongoose.models.RentRate as Model<any>) || mongoose.model<any>("RentRate", RentRateSchema);

export default RentRate;
