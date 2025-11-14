import type { MapListing } from "@/types/types";

export interface GroupedListing {
  subdivision: string;
  listings: MapListing[];
}

/**
 * Groups listings by subdivision name
 * Sorts by price within each subdivision (low to high)
 * Puts listings without subdivision in "Other" group at end
 * @param listings - Array of listings to group
 * @param prioritySubdivision - Optional subdivision name to prioritize at the top
 */
export function groupListingsBySubdivision(
  listings: MapListing[],
  prioritySubdivision?: string | null
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

  // Normalize priority subdivision for comparison
  const normalizedPriority = prioritySubdivision?.toLowerCase().trim() || null;

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
    // Sort subdivisions with priority at top, then alphabetically, with "Other" at end
    .sort((a, b) => {
      const aLower = a.subdivision.toLowerCase();
      const bLower = b.subdivision.toLowerCase();

      // Priority subdivision comes first
      if (normalizedPriority) {
        if (aLower === normalizedPriority) return -1;
        if (bLower === normalizedPriority) return 1;
      }

      // "Other" always at end
      if (a.subdivision === "Other") return 1;
      if (b.subdivision === "Other") return -1;

      // Alphabetically otherwise
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
  if (subdivision.toLowerCase() === "not applicable") return "Non-HOA";
  return subdivision;
}
