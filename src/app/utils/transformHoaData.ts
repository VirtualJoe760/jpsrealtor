// utils/transformHoaData.ts
import { Hoa } from "@/types/hoa";

export function transformHoaData(rawData: any[]): Hoa[] {
  return rawData.map((item) => ({
    "Subdivision/Countryclub": item["Subdivision/Countryclub"] || "Unknown",
    "Management Company": item["Management Company"] || "Unknown",
    Address: item.Address || "Unknown Address",
    "City, State, Zip": item["City, State, Zip"] || "Unknown",
    Phone: item.Phone || null,
    Fax: item.Fax || null,
    City: item.City || "Unknown City",
    State: item.State || "Unknown State",
    Zip: item.Zip || "00000",
    id: item.id || `unknown-${Math.random().toString(36).substring(2, 10)}`,
    count: item.count || 0,
    slug: item.slug || item["Subdivision/Countryclub"].toLowerCase().replace(/\s+/g, "-"),
  }));
}
