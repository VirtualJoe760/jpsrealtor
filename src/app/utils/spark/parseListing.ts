import type { IUnifiedListing } from "@/models/unified-listing";

export function parseListing(raw: any): Partial<IUnifiedListing> {
  const sf = raw?.StandardFields ?? {};
  const custom = raw?.CustomFields ?? [];

  const getCustomValue = (section: string, label: string): any => {
    const group = custom.find((g: any) => g[section]);
    if (!group) return undefined;
    const item = group[section].find((entry: any) => Object.keys(entry)[0] === label);
    return item?.[label];
  };

  const parseBool = (value: any): boolean | undefined => {
    if (typeof value === "string") return value.toLowerCase() === "yes";
    if (typeof value === "boolean") return value;
    return undefined;
  };

  const parseNumber = (value: any): number | undefined => {
    const num = parseFloat(value);
    return isNaN(num) ? undefined : num;
  };

  const parseDate = (value: any): Date | undefined => {
    if (!value) return undefined;
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  };

  return {
    listingId: sf.ListingId,
    listingKey: sf.ListingKey,
    slug: sf.ListingId?.toLowerCase(),
    slugAddress: sf.UnparsedAddress ?? `${sf.StreetNumber} ${sf.StreetName}`.toLowerCase().replace(/\s+/g, "-"),
    address: sf.UnparsedAddress,
    latitude: sf.Latitude,
    longitude: sf.Longitude,
    listPrice: sf.ListPrice,
    bedroomsTotal: sf.BedroomsTotal,
    bathroomsFull: sf.BathroomsFull,
    bathroomsHalf: sf.BathroomsHalf,
    livingArea: sf.LivingArea,
    yearBuilt: sf.YearBuilt,
    lotSizeSqft: sf.LotSizeSquareFeet,
    subdivisionName: sf.SubdivisionName,
    apn: sf.ParcelNumber,
    countyOrParish: sf.CountyOrParish,
    publicRemarks: sf.PublicRemarks,
    supplement: sf.Supplement,
    modificationTimestamp: parseDate(sf.ModificationTimestamp),
    listingContractDate: parseDate(sf.ListingContractDate),
    statusChangeTimestamp: parseDate(sf.StatusChangeTimestamp),
    status: sf.StandardStatus,

    // Preferred date fields
    onMarketDate: parseDate(sf.OnMarketDate),
    originalOnMarketTimestamp: parseDate(sf.OriginalOnMarketTimestamp),

    // Property type
    propertyType: sf.PropertyType,
    propertySubType: sf.PropertySubType,

    // Features
    pool: sf.PoolYN ?? parseBool(getCustomValue("Main", "Pool")),
    spa: sf.SpaYN ?? parseBool(getCustomValue("Main", "Spa")),
    garageSpaces: sf.GarageSpaces ?? parseNumber(getCustomValue("Main", "Garage Spaces")),
    stories: sf.StoriesTotal ?? parseNumber(getCustomValue("Main", "Stories")),
    view: sf.View,
    rvAccess: parseBool(getCustomValue("Main", "RV Access")),
    flooring: getCustomValue("Main", "Flooring"),
    heating: getCustomValue("Main", "Heating"),
    cooling: getCustomValue("Main", "Cooling"),
    furnished: getCustomValue("Main", "Furnished"),
    laundryFeatures: getCustomValue("Main", "Laundry Features"),
    landType: getCustomValue("Main", "Land Type"),
    hoaFee: parseNumber(getCustomValue("Main", "HOA Fee")),
    hoaFeeFrequency: getCustomValue("Main", "HOA Frequency"),
    gatedCommunity: parseBool(getCustomValue("Main", "Gated Community")),

    terms: Array.isArray(sf.Terms)
      ? sf.Terms
      : sf.Terms?.split(",").map((t: string) => t.trim()),

    schoolDistrict: getCustomValue("Main", "School District"),
    elementarySchool: getCustomValue("Main", "Elementary School"),
    middleSchool: getCustomValue("Main", "Middle School"),
    highSchool: getCustomValue("Main", "High School"),
  };
}
