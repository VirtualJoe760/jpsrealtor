// src/types/cma.ts
// Comparative Market Analysis Types

export interface ComparableProperty {
  listingKey: string;
  address: string;
  city: string;
  listPrice: number;
  soldPrice?: number;
  soldDate?: Date;
  daysOnMarket?: number;
  bedroomsTotal?: number;
  bathroomsTotalInteger?: number;
  livingArea?: number;
  lotSizeArea?: number;
  yearBuilt?: number;
  latitude?: number;
  longitude?: number;
  primaryPhotoUrl?: string;
  standardStatus: string;
  distanceFromSubject?: number; // in miles
  pricePerSqFt?: number;
  similarity?: number; // 0-100 similarity score
}

export interface SubjectProperty extends ComparableProperty {
  estimatedValue?: number;
  estimatedValueLow?: number;
  estimatedValueHigh?: number;
}

export interface PriceTrendData {
  date: string;
  averagePrice: number;
  medianPrice: number;
  listingCount: number;
  soldCount?: number;
}

export interface MarketStatistics {
  averageListPrice: number;
  medianListPrice: number;
  averageSoldPrice: number;
  medianSoldPrice: number;
  averageDaysOnMarket: number;
  medianDaysOnMarket?: number; // median days on market
  averagePricePerSqFt: number;
  medianPricePerSqFt?: number; // median price per square foot
  listToSoldRatio: number; // percentage
  totalComparables: number;
  totalActiveListings?: number; // count of active listings
  totalSoldListings?: number; // count of sold listings
}

export interface CMAReport {
  subjectProperty: SubjectProperty;
  comparableProperties: ComparableProperty[];
  marketStatistics: MarketStatistics;
  priceTrends: PriceTrendData[];
  generatedAt: Date;
  radius: number; // search radius in miles
  timeframe: number; // months of data analyzed
}

export interface CMAFilters {
  radius?: number; // miles
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  maxBeds?: number;
  minBaths?: number;
  maxBaths?: number;
  minSqft?: number;
  maxSqft?: number;
  minYearBuilt?: number;
  maxYearBuilt?: number;
  standardStatus?: string[];
  timeframe?: number; // months
  maxComps?: number; // maximum number of comparables
  requirePool?: boolean; // only match properties with pools
}

export interface CMAChartData {
  priceComparison: {
    labels: string[];
    values: number[];
    colors: string[];
  };
  priceTrends: {
    dates: string[];
    avgPrices: number[];
    medianPrices: number[];
  };
  pricePerSqFt: {
    labels: string[];
    values: number[];
  };
  daysOnMarket: {
    labels: string[];
    values: number[];
  };
}
