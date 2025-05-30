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
    return data.listings || [];
  } catch (error) {
    console.error("❌ Failed to fetch listings from API:", error);
    return [];
  }
}
