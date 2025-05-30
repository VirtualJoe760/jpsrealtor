import MapPageClient from "@/app/components/mls/map/MapPageClient";
import { getListingsWithCoords } from "@/lib/api";
import { fetchListingPhotos } from "@/app/utils/spark/photos";
import type { IListing } from "@/models/listings";
import type { MapListing } from "@/types/types";
import pLimit from "p-limit";

export default async function SearchMapPage() {
  const rawListings: IListing[] = await getListingsWithCoords();

  const limitedListings = rawListings
    .filter((l) => l.latitude && l.longitude && l.listPrice && l.slug)
    .slice(0, 100);

  const limit = pLimit(5);

  const listings: MapListing[] = await Promise.all(
    limitedListings.map((l) =>
      limit(async () => {
        let photoUrl = "/images/no-photo.png";
        try {
          const photos = await fetchListingPhotos(l.slug);
          const firstPhoto = photos?.[0];
          photoUrl =
            firstPhoto?.Uri1024 ||
            firstPhoto?.Uri800 ||
            firstPhoto?.Uri640 ||
            firstPhoto?.UriThumb ||
            "/images/no-photo.png";
        } catch {
          console.warn("Failed to fetch photo for:", l.slug);
        }

        return {
          _id: String(l._id),
          latitude: l.latitude!,
          longitude: l.longitude!,
          listPrice: l.listPrice!,
          address: l.address ?? "Unknown address",
          unparsedFirstLineAddress: l.address ?? "Unknown address",
          primaryPhotoUrl: photoUrl,
          bedroomsTotal: l.bedroomsTotal ?? undefined,
          bathroomsFull: l.bathroomsFull ?? undefined,
          livingArea: l.livingArea ?? undefined,
          lotSizeSqft: l.lotSizeSqft ?? undefined,
          pool: l.pool ?? false,
          spa: l.spa ?? false,
          listingId: l.listingId,
          slugAddress: l.slugAddress ?? undefined,
          publicRemarks: l.publicRemarks ?? undefined,
        };
      })
    )
  );

  return <MapPageClient listings={listings} />;
}
