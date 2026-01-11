import mongoose from 'mongoose';

const locationIndexSchema = new mongoose.Schema({
  // Entity identification
  name: { type: String, required: true, index: true },
  normalizedName: { type: String, required: true, index: true },
  type: {
    type: String,
    enum: ['city', 'subdivision', 'county', 'region'],
    required: true,
    index: true
  },

  // Geographic data
  latitude: Number,
  longitude: Number,
  bounds: {
    north: Number,
    south: Number,
    east: Number,
    west: Number
  },

  // Hierarchy
  city: String,          // For subdivisions
  county: String,        // For cities
  region: String,        // For counties

  // Stats (cached for autocomplete)
  listingCount: { type: Number, default: 0 },
  activeListingCount: { type: Number, default: 0 },

  // Metadata
  slug: { type: String, index: true },
  aliases: [String],     // ["PDCC", "Palm Desert Country Club"]

  // Timestamps
  lastUpdated: { type: Date, default: Date.now }
}, {
  collection: 'location_index'
});

// Compound indexes for fast lookups
locationIndexSchema.index({ type: 1, normalizedName: 1 });
locationIndexSchema.index({ type: 1, listingCount: -1 });
locationIndexSchema.index({ normalizedName: 1, type: 1 });

export default (mongoose.models.LocationIndex ||
  mongoose.model('LocationIndex', locationIndexSchema)) as mongoose.Model<any>;
