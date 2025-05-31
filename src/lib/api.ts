// src/lib/api/

import { IListing } from "@/models/listings";

export async function getListingsWithCoords(): Promise<IListing[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mls-listings`, {
      method: "GET",
      cache: "no-store", // Ensure fresh data
    });

    if (!res.ok) {
      console.error("❌ API response error:", res.status);
      return [];
    }

    const data = await res.json();

    const listings: IListing[] = data.listings || [];

    // ✅ Filter for valid coordinates and propertyType "A"
    const filtered = listings.filter(
      (l) =>
        l.propertyType === "A" &&
        typeof l.latitude === "number" &&
        typeof l.longitude === "number"
    );

    console.log(`📦 Loaded ${filtered.length} residential listings with coordinates`);

    return filtered;
  } catch (error) {
    console.error("❌ Failed to fetch listings from API:", error);
    return [];
  }
}
