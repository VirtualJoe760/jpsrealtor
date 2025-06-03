import MapPageClient from "@/app/components/mls/map/MapPageClient";
import { getListingsWithCoords } from "@/lib/api";
import type { IListing } from "@/models/listings";
import type { MapListing } from "@/types/types";

export default async function SearchMapPage() {
  try {
    const rawListings: IListing[] = await getListingsWithCoords();

    const listings: MapListing[] = rawListings
      .filter((l) => l.latitude && l.longitude && l.listPrice && l.slug)
      .map((l) => ({
        _id: String(l._id),
        latitude: l.latitude!,
        longitude: l.longitude!,
        listPrice: l.listPrice!,
        address: l.address ?? "Unknown address",
        unparsedFirstLineAddress: l.address ?? "Unknown address",
        primaryPhotoUrl: l.primaryPhotoUrl || "/images/no-photo.png", // ✅ use only cached photos
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

    return <MapPageClient listings={listings} />;
  } catch (error) {
    console.error("❌ Failed to load map listings:", error);
    return (
      <div className="p-8 text-red-500 text-center">
        Failed to load listings. Please try again later.
      </div>
    );
  }
}
