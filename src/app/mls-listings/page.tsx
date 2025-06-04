// src/app/mls-listings/page.tsx
import dynamic from "next/dynamic";
import { Suspense } from "react";
import type { MapListing } from "@/types/types";

// Dynamically import the client-only map component
const MapPageClient = dynamic(() => import("@/app/components/mls/map/MapPageClient"), {
  ssr: false,
});

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-64px)] w-full bg-black">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-zinc-400 text-sm">Loading map and listings...</p>
      </div>
    </div>
  );
}

export default async function SearchMapPage() {
  const MAX_BATCHES = 6; // assuming ~3000 listings, 500 per batch
  const allListings: MapListing[] = [];

  try {
    for (let i = 0; i < MAX_BATCHES; i++) {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mls-listings?batch=${i}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        console.warn(`⚠️ Batch ${i} failed with status ${res.status}`);
        break;
      }

      const data = await res.json();
      const listings = (data.listings || []) as any[];

      const mapped: MapListing[] = listings
        .filter((l) => l.latitude && l.longitude && l.listPrice && l.slug)
        .map((l) => ({
          _id: String(l._id),
          latitude: l.latitude,
          longitude: l.longitude,
          listPrice: l.listPrice,
          address: l.address ?? "Unknown address",
          unparsedFirstLineAddress: l.address ?? "Unknown address",
          primaryPhotoUrl: l.primaryPhotoUrl || "/images/no-photo.png",
          bedroomsTotal: l.bedroomsTotal ?? undefined,
          bathroomsFull: l.bathroomsFull ?? undefined,
          livingArea: l.livingArea ?? undefined,
          lotSizeSqft: l.lotSizeSqft ?? undefined,
          pool: l.pool ?? false,
          spa: l.spa ?? false,
          listingId: l.listingId,
          slugAddress: l.slugAddress ?? undefined,
          slug: l.slug,
          publicRemarks: l.publicRemarks ?? undefined,
        }));

      allListings.push(...mapped);

      // Stop early if we got less than 500
      if (listings.length < 500) break;
    }

    return (
      <Suspense fallback={<LoadingFallback />}>
        <MapPageClient listings={allListings} />
      </Suspense>
    );
  } catch (error) {
    console.error("❌ Failed to load map listings:", error);
    return (
      <div className="p-8 text-red-500 text-center">
        Failed to load listings. Please try again later.
      </div>
    );
  }
}
