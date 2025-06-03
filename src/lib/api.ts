// src/lib/api.ts

import { IListing } from "@/models/listings";

export interface MapListing extends IListing {
  primaryPhotoUrl: string;
}

export async function getListingsWithCoords(): Promise<MapListing[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mls-listings`, {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("❌ API response error:", res.status);
      return [];
    }

    const data = await res.json();
    const rawListings: any[] = data.listings || [];

    const filtered = rawListings.filter(
      (l) =>
        l.propertyType === "A" &&
        typeof l.latitude === "number" &&
        typeof l.longitude === "number"
    );

    console.log(`📦 Loaded ${filtered.length} residential listings with coordinates`);

    const listingsWithPhotos: MapListing[] = filtered.map((l) => ({
      ...l,
      primaryPhotoUrl: l.primaryPhotoUrl ?? "/images/no-photo.png",
    }));

    return listingsWithPhotos;
  } catch (error) {
    console.error("❌ Failed to fetch listings from API:", error);
    return [];
  }
}
