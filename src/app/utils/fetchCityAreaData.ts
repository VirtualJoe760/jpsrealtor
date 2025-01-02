import { q1Data } from "@/app/constants/comps/2024/q1";
import { q2Data } from "@/app/constants/comps/2024/q2";
import { q3Data } from "@/app/constants/comps/2024/q3";
import { q4Data } from "@/app/constants/comps/2024/q4";
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
  price_ranges: Record<string, number>;
  total_sales: number;
  expired_listings: number;
  highest_sale_price: number;
  lowest_sale_price: number;
}

export async function fetchCityAreaData(city: City) {
  const results: Record<string, Record<string, AreaData>> = {};

  // Ensure city.areas is defined and not empty
  if (!city.areas || city.areas.length === 0) {
    console.error(`No areas defined for city: ${city.name}`);
    return results; // Return empty results to handle gracefully
  }

  const allQuarterlyData = { q1: q1Data, q2: q2Data, q3: q3Data, q4: q4Data };

  for (const area of city.areas) {
    results[area] = {}; // Initialize area data for all quarters

    for (const [quarter, data] of Object.entries(allQuarterlyData)) {
      if (data[area]) {
        results[area][quarter] = data[area];
        console.log(`Data loaded for ${area} in ${quarter}`);
      } else {
        console.warn(`No data found for ${area} in ${quarter}`);
      }
    }
  }

  console.log("Final Results:", results);
  return results;
}
