// utils/spark/stringify.ts

const FLATTENABLE_FEATURE_KEYS = [
  "Cooling",
  "Heating",
  "Flooring",
  "View",
  "SpaFeatures",
  "PoolFeatures",
  "InteriorFeatures",
  "DoorFeatures",
  "FoundationDetails",
  "KitchenAppliances",
  "LotFeatures",
  "ParkingFeatures",
  "PatioAndPorchFeatures",
  "SecurityFeatures",
  "Utilities",
  "AssociationFeeIncludes",
  "AssociationAmenities",
  "Levels",
  "ListingTerms",
];

export function extractFeatureStringsFromListing(listing: Record<string, any>): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const key of FLATTENABLE_FEATURE_KEYS) {
    const subObject = listing[key];
    if (subObject && typeof subObject === "object" && !Array.isArray(subObject)) {
      const values = Object.entries(subObject)
        .filter(([, val]) => val === true)
        .map(([k]) => k);

      if (values.length) {
        result[key] = values;
      }
    }
  }

  return result;
}
