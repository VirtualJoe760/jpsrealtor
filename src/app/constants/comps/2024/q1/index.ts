import southPalmSpringsEnd from "./palm-springs-south-end.json";
import southCathedralCity from "./south-cathedral-city.json";
import northCathedralCity from "./cathedral-city-north.json";
import centralPalmSprings from "./palm-springs-central.json";
import northPalmSprings from "./palm-springs-north-end.json";
import ranchoMirage from "./rancho-mirage.json";
import indianWells from "./indian-wells.json";
import bermudaDunes from "./bermuda-dunes.json";
import coachella from "./coachella.json";
import thermal from "./thermal.json"; // Add the new file

interface AreaData {
  area: string;
  quarter: string;
  slug: string;
  closed_data_metrics: {
    list_price: {
      average: number;
      median: number;
      min: number;
      max: number;
    };
    sale_price: {
      average: number;
      median: number;
      min: number;
      max: number;
    };
    days_on_market: {
      average: number;
      median: number;
      min: number;
      max: number;
    };
    list_price_per_sqft: {
      average: number;
      median: number;
      min: number;
      max: number;
    };
    sale_price_per_sqft: {
      average: number;
      median: number;
      min: number;
      max: number;
    };
  };
  expired_data_metrics?: {
    list_price?: {
      average: number;
      median: number;
      min: number;
      max: number;
    };
    days_on_market?: {
      average: number;
      median: number;
      min: number;
      max: number;
    };
    list_price_per_sqft?: {
      average: number;
      median: number;
      min: number;
      max: number;
    };
    square_footage?: {
      average: number;
      median: number;
      min: number;
      max: number;
    };
    lot_size?: {
      average: number;
      median: number;
      min: number;
      max: number;
    };
    bedrooms?: {
      average: number;
      median: number;
      min: number;
      max: number;
    };
    bathrooms?: {
      average: number;
      median: number;
      min: number;
      max: number;
    };
  };
  price_ranges: Record<string, number>;
  total_sales: number;
  expired_listings: number;
  highest_sale_price: number;
  lowest_sale_price: number;
}

export const q1Data: Record<string, AreaData> = {
  "palm-springs-south-end": southPalmSpringsEnd,
  "south-cathedral-city": southCathedralCity,
  "north-cathedral-city": northCathedralCity,
  "palm-springs-central": centralPalmSprings,
  "palm-springs-north-end": northPalmSprings,
  "rancho-mirage": ranchoMirage,
  "indian-wells": indianWells,
  "bermuda-dunes": bermudaDunes,
  "coachella": coachella,
  "thermal": thermal, // Add the new area
};
