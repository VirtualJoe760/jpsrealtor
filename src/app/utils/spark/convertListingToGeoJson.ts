import type { MapListing } from "@/types/types";

export function listingsToGeoJSONPoints(listings: MapListing[]) {
  return listings.map((listing) => ({
    type: "Feature",
    properties: {
      cluster: false,
      ...listing,
    },
    geometry: {
      type: "Point",
      coordinates: [listing.longitude, listing.latitude],
    },
  }));
}