import southPalmSpringsEnd from "./palm-springs-south-end.json";
import southCathedralCity from "./south-cathedral-city.json"; // Import the new file
import northCathedralCity from "./cathedral-city-north.json"

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
    sale_price?: {
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
  "south-cathedral-city": southCathedralCity, // Add the new area
  "north-cathedral-city": northCathedralCity,
};
