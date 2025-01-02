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

const quarterlyData: Record<"q1" | "q2" | "q3" | "q4", Record<string, AreaData>> = {
  q1: q1Data,
  q2: q2Data,
  q3: q3Data,
  q4: q4Data,
};

export async function fetchCityAreaData(
  city: City,
  quarter: "q1" | "q2" | "q3" | "q4" = "q1",
  year: string = "2024"
) {
  const results: Record<string, AreaData> = {};

  if (!city.areas || city.areas.length === 0) {
    console.error(`No areas defined for city: ${city.name}`);
    return results;
  }

  const dataForQuarter = quarterlyData[quarter];

  for (const area of city.areas) {
    if (dataForQuarter[area]) {
      results[area] = dataForQuarter[area];
      console.log(`Successfully loaded data for ${area} in ${quarter} ${year}.`);
    } else {
      console.warn(`No data found for ${area} in ${quarter} ${year}.`);
    }
  }

  return results;
}
