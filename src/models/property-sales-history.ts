// src/models/property-sales-history.ts

import mongoose, { Schema, Document, Model, Types } from "mongoose";

/**
 * PropertySalesHistory Model
 *
 * Purpose: Track multiple sales of the same property over time for appreciation analysis.
 *
 * Key Features:
 * - Chronological sales tracking for same property
 * - Automatic appreciation calculation between consecutive sales
 * - CAGR (Compound Annual Growth Rate) calculation
 * - Flip detection (multiple sales within short timeframe)
 * - Links to UnifiedClosedListing documents for full details
 *
 * Use Cases:
 * - Calculate appreciation between consecutive sales
 * - Identify investment properties (frequent flips)
 * - Historical price trend analysis per property
 * - Answer questions like "How much has this property appreciated?"
 */

// -----------------------------
// Sale Event Interface
// -----------------------------

export interface ISaleEvent {
  saleId: Types.ObjectId; // Reference to UnifiedClosedListing document
  closePrice: number;
  closeDate: Date;
  daysOnMarket?: number;
  mlsSource: string; // GPS or CRMLS
  listingKey: string; // For direct lookup

  // Appreciation metrics (calculated from previous sale)
  appreciationFromPrevious?: number; // Percentage increase/decrease
  dollarGainFromPrevious?: number; // Absolute dollar change
  yearsSincePrevious?: number; // Time between sales
  annualizedAppreciation?: number; // Annual rate based on CAGR
}

// -----------------------------
// Property Sales History Interface
// -----------------------------

export interface IPropertySalesHistory extends Document {
  // Property Identification
  address: string; // Normalized address (canonical form)
  streetNumber: string;
  streetName: string;
  city: string;
  stateOrProvince: string;
  postalCode: string;

  // Geographic
  latitude?: number;
  longitude?: number;
  coordinates?: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };

  // Property Details (from most recent sale)
  beds?: number;
  baths?: number;
  sqft?: number;
  propertyType?: string;
  subdivisionName?: string;
  apn?: string; // Assessor's Parcel Number (best unique identifier)

  // Sales History (chronological, oldest to newest)
  sales: ISaleEvent[];

  // Aggregate Statistics
  totalSales: number;
  firstSaleDate?: Date;
  lastSaleDate?: Date;
  firstSalePrice?: number;
  lastSalePrice?: number;

  // Overall Performance Metrics
  cagr?: number; // Compound annual growth rate (first to last sale)
  overallAppreciation?: number; // Total appreciation percentage (first to last)
  totalDollarGain?: number; // Total dollar gain (first to last)
  averageHoldPeriod?: number; // Average years between sales

  // Investment Indicators
  isFlip: boolean; // True if multiple sales within 2 years
  flipCount?: number; // Number of rapid turnovers
  totalYearsTracked?: number; // Years from first to last sale
}

// -----------------------------
// Sale Event Schema
// -----------------------------

const SaleEventSchema = new Schema<ISaleEvent>({
  saleId: { type: Schema.Types.ObjectId, required: true, ref: "UnifiedClosedListing" },
  closePrice: { type: Number, required: true },
  closeDate: { type: Date, required: true },
  daysOnMarket: Number,
  mlsSource: { type: String, required: true },
  listingKey: { type: String, required: true },

  // Appreciation metrics (calculated)
  appreciationFromPrevious: Number,
  dollarGainFromPrevious: Number,
  yearsSincePrevious: Number,
  annualizedAppreciation: Number,
});

// -----------------------------
// Property Sales History Schema
// -----------------------------

const PropertySalesHistorySchema = new Schema<IPropertySalesHistory>(
  {
    // Property Identification
    address: { type: String, required: true, index: true, unique: true },
    streetNumber: { type: String, required: true },
    streetName: { type: String, required: true },
    city: { type: String, required: true, index: true },
    stateOrProvince: { type: String, required: true },
    postalCode: { type: String, required: true },

    // Geographic
    latitude: Number,
    longitude: Number,
    coordinates: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        index: "2dsphere",
      },
    },

    // Property Details
    beds: Number,
    baths: Number,
    sqft: Number,
    propertyType: { type: String, index: true },
    subdivisionName: { type: String, index: true },
    apn: { type: String, index: true, sparse: true }, // Best unique identifier

    // Sales History (chronological array)
    sales: {
      type: [SaleEventSchema],
      required: true,
      validate: {
        validator: function (sales: ISaleEvent[]) {
          return sales.length > 0;
        },
        message: "Property must have at least one sale",
      },
    },

    // Aggregate Statistics
    totalSales: { type: Number, required: true, min: 1 },
    firstSaleDate: Date,
    lastSaleDate: { type: Date, index: true },
    firstSalePrice: Number,
    lastSalePrice: Number,

    // Overall Performance Metrics
    cagr: Number,
    overallAppreciation: Number,
    totalDollarGain: Number,
    averageHoldPeriod: Number,

    // Investment Indicators
    isFlip: { type: Boolean, default: false, index: true },
    flipCount: Number,
    totalYearsTracked: Number,
  },
  {
    timestamps: true,
    collection: "property_sales_history",
  }
);

// -----------------------------
// Indexes for Queries
// -----------------------------

// Compound indexes
PropertySalesHistorySchema.index({ city: 1, totalSales: 1 });
PropertySalesHistorySchema.index({ subdivisionName: 1, totalSales: 1 });
PropertySalesHistorySchema.index({ isFlip: 1, lastSaleDate: 1 });
PropertySalesHistorySchema.index({ cagr: 1, totalSales: 1 }); // Find top appreciating properties

// -----------------------------
// Helper Methods
// -----------------------------

/**
 * Calculate CAGR between two prices over a period
 */
function calculateCAGR(startPrice: number, endPrice: number, years: number): number {
  if (startPrice <= 0 || years <= 0) return 0;
  const cagr = (Math.pow(endPrice / startPrice, 1 / years) - 1) * 100;
  return Number(cagr.toFixed(2));
}

/**
 * Calculate appreciation percentage
 */
function calculateAppreciation(startPrice: number, endPrice: number): number {
  if (startPrice <= 0) return 0;
  return Number((((endPrice - startPrice) / startPrice) * 100).toFixed(2));
}

/**
 * Calculate years between two dates
 */
function yearsBetween(startDate: Date, endDate: Date): number {
  const ms = endDate.getTime() - startDate.getTime();
  const years = ms / (1000 * 60 * 60 * 24 * 365.25);
  return Number(years.toFixed(2));
}

// -----------------------------
// Pre-save Middleware: Calculate Metrics
// -----------------------------

PropertySalesHistorySchema.pre("save", function (next) {
  // Sort sales chronologically (oldest to newest)
  this.sales.sort((a, b) => a.closeDate.getTime() - b.closeDate.getTime());

  // Update total sales count
  this.totalSales = this.sales.length;

  // Calculate appreciation between consecutive sales
  for (let i = 1; i < this.sales.length; i++) {
    const prevSale = this.sales[i - 1];
    const currentSale = this.sales[i];

    const years = yearsBetween(prevSale.closeDate, currentSale.closeDate);
    const dollarGain = currentSale.closePrice - prevSale.closePrice;
    const appreciation = calculateAppreciation(prevSale.closePrice, currentSale.closePrice);
    const annualized = years > 0 ? calculateCAGR(prevSale.closePrice, currentSale.closePrice, years) : 0;

    currentSale.yearsSincePrevious = years;
    currentSale.dollarGainFromPrevious = dollarGain;
    currentSale.appreciationFromPrevious = appreciation;
    currentSale.annualizedAppreciation = annualized;
  }

  // Set aggregate fields
  if (this.sales.length > 0) {
    this.firstSaleDate = this.sales[0].closeDate;
    this.lastSaleDate = this.sales[this.sales.length - 1].closeDate;
    this.firstSalePrice = this.sales[0].closePrice;
    this.lastSalePrice = this.sales[this.sales.length - 1].closePrice;

    // Calculate overall metrics (first to last sale)
    if (this.sales.length >= 2) {
      const totalYears = yearsBetween(this.firstSaleDate!, this.lastSaleDate!);
      this.totalYearsTracked = totalYears;
      this.cagr = calculateCAGR(this.firstSalePrice!, this.lastSalePrice!, totalYears);
      this.overallAppreciation = calculateAppreciation(this.firstSalePrice!, this.lastSalePrice!);
      this.totalDollarGain = this.lastSalePrice! - this.firstSalePrice!;

      // Calculate average hold period
      const holdPeriods = this.sales.slice(1).map((sale, idx) =>
        yearsBetween(this.sales[idx].closeDate, sale.closeDate)
      );
      this.averageHoldPeriod = Number(
        (holdPeriods.reduce((sum, years) => sum + years, 0) / holdPeriods.length).toFixed(2)
      );
    }
  }

  // Detect flips (sales within 2 years of each other)
  let flipCount = 0;
  for (let i = 1; i < this.sales.length; i++) {
    const years = this.sales[i].yearsSincePrevious || 0;
    if (years < 2) {
      flipCount++;
    }
  }

  this.flipCount = flipCount;
  this.isFlip = flipCount > 0;

  next();
});

// -----------------------------
// Model Export
// -----------------------------

const PropertySalesHistory: Model<IPropertySalesHistory> =
  mongoose.models.PropertySalesHistory ||
  mongoose.model<IPropertySalesHistory>("PropertySalesHistory", PropertySalesHistorySchema);

export default PropertySalesHistory;
