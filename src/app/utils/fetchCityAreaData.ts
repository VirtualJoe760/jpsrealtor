import { q1Data } from "@/app/constants/comps/2024/q1";
import { City } from "@/constants/cities";

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
  

export async function fetchCityAreaData(city: City, quarter: string = "q1", year: string = "2024") {
  const results: Record<string, AreaData> = {};

  if (!city.areas || city.areas.length === 0) {
    console.error(`No areas defined for city: ${city.name}`);
    return results;
  }

  for (const area of city.areas) {
    if (q1Data[area]) {
      results[area] = q1Data[area];
      console.log(`Successfully loaded data for: ${area}`);
    } else {
      console.warn(`Skipped missing area: ${area}`);
    }
  }

  return results;
}
