import type { MapListing } from "@/types/types";

export interface GroupedListing {
  subdivision: string;
  listings: MapListing[];
}

/**
 * Groups listings by subdivision name
 * Sorts by price within each subdivision (low to high)
 * Puts listings without subdivision in "Other" group at end
 */
export function groupListingsBySubdivision(
  listings: MapListing[]
): GroupedListing[] {
  const grouped: Record<string, MapListing[]> = {};

  listings.forEach((listing) => {
    // Support multiple field names for subdivision
    const subdivision =
      (listing as any).subdivisionName ||
      (listing as any).subdivision ||
      "Other";

    if (!grouped[subdivision]) {
      grouped[subdivision] = [];
    }
    grouped[subdivision].push(listing);
  });

  // Convert to array and sort
  const result = Object.entries(grouped)
    .map(([subdivision, listings]) => ({
      subdivision,
      // Sort by price within each subdivision (low to high)
      listings: listings.sort((a, b) => {
        const priceA = a.listPrice ?? 0;
        const priceB = b.listPrice ?? 0;
        return priceA - priceB;
      }),
    }))
    // Sort subdivisions alphabetically, with "Other" at end
    .sort((a, b) => {
      if (a.subdivision === "Other") return 1;
      if (b.subdivision === "Other") return -1;
      return a.subdivision.localeCompare(b.subdivision);
    });

  return result;
}

/**
 * Get user-friendly display name for subdivision
 */
export function getSubdivisionDisplayName(
  subdivision: string | null | undefined
): string {
  if (!subdivision) return "Other Areas";
  if (subdivision.toLowerCase() === "other") return "Other Areas";
  return subdivision;
}
