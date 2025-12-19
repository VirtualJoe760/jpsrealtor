// src/lib/chat/utils/listing-data.ts
// Fetch individual listing data for AI queries

import UnifiedListing from "@/models/unified-listing";
import connectToDatabase from "@/lib/mongodb";
import { getSubdivisionData, checkShortTermRentals } from "./subdivision-data";

export interface ListingDataResult {
  found: boolean;
  listing?: {
    address: string;
    city: string;
    stateOrProvince: string;
    postalCode: string;
    subdivisionName?: string;

    // Pricing
    currentPrice?: number;
    listPrice?: number;
    originalListPrice?: number;
    pricePerSquareFoot?: number;

    // Property details
    bedroomsTotal?: number;
    bathroomsTotalInteger?: number;
    bathroomsTotalDecimal?: number;
    livingArea?: number;
    lotSizeAcres?: number;
    lotSizeSquareFeet?: number;
    yearBuilt?: number;
    propertyType?: string;
    propertyClass?: string;

    // Features
    poolYN?: boolean;
    spaYN?: boolean;
    viewYN?: boolean;
    fireplaceYN?: boolean;
    golfCourseYN?: boolean;

    // HOA
    associationYN?: boolean;
    associationFee?: number;
    associationFeeFrequency?: string;

    // Short-term rentals
    shortTermRentalsAllowed?: string;
    shortTermRentalDetails?: string;

    // MLS
    mlsSource?: string;
    mlsStatus?: string;
    listingId?: string;
    onMarketDate?: string;
    daysOnMarket?: number;

    // Photos
    photosCount?: number;
    primaryPhoto?: string;

    // Listing description
    publicRemarks?: string;
  };
  subdivisionInfo?: {
    shortTermRentalsAllowed?: string;
    shortTermRentalDetails?: string;
    hoaMonthlyMin?: number;
    hoaMonthlyMax?: number;
  };
  error?: string;
}

/**
 * Get listing data by address
 *
 * @param address - Property address (partial match supported)
 * @param includeSubdivisionData - Also fetch subdivision data for context
 * @returns Listing data or error
 *
 * @example
 * const data = await getListingData("82223 Vandenberg", true);
 * if (data.found) {
 *   console.log(data.listing.associationFee); // HOA fee
 *   console.log(data.subdivisionInfo.shortTermRentalsAllowed); // From subdivision
 * }
 */
export async function getListingData(
  address: string,
  includeSubdivisionData: boolean = true
): Promise<ListingDataResult> {
  try {
    await connectToDatabase();

    // Normalize address for search
    const normalized = address.toLowerCase().trim();

    // Try to find listing by unparsedFirstLineAddress or streetNumber + streetName
    const listing = await UnifiedListing.findOne({
      $or: [
        { unparsedFirstLineAddress: { $regex: new RegExp(address, 'i') } },
        { unparsedAddress: { $regex: new RegExp(address, 'i') } },
        { slugAddress: { $regex: new RegExp(normalized.replace(/\s+/g, '-'), 'i') } }
      ]
    }).lean();

    if (!listing) {
      return {
        found: false,
        error: `Listing not found for address "${address}"`
      };
    }

    // Calculate days on market if available
    let daysOnMarket: number | undefined;
    if (listing.onMarketDate) {
      const onMarket = new Date(listing.onMarketDate);
      const today = new Date();
      daysOnMarket = Math.floor((today.getTime() - onMarket.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Build result
    const result: ListingDataResult = {
      found: true,
      listing: {
        address: listing.unparsedFirstLineAddress || `${listing.streetNumber} ${listing.streetName}`,
        city: listing.city,
        stateOrProvince: listing.stateOrProvince,
        postalCode: listing.postalCode,
        subdivisionName: listing.subdivisionName,

        // Pricing
        currentPrice: listing.currentPrice,
        listPrice: listing.listPrice,
        originalListPrice: listing.originalListPrice,
        pricePerSquareFoot: undefined, // Not in UnifiedListing model

        // Property details
        bedroomsTotal: listing.bedroomsTotal,
        bathroomsTotalInteger: listing.bathroomsTotalInteger,
        bathroomsTotalDecimal: listing.bathroomsTotalDecimal,
        livingArea: listing.livingArea,
        lotSizeAcres: listing.lotSizeAcres,
        lotSizeSquareFeet: listing.lotSizeSqft,
        yearBuilt: listing.yearBuilt,
        propertyType: listing.propertyTypeLabel || listing.propertyType,
        propertyClass: listing.propertyClass,

        // Features
        poolYN: listing.poolYn,
        spaYN: listing.spaYn,
        viewYN: listing.viewYn,
        fireplaceYN: listing.fireplacesTotal ? listing.fireplacesTotal > 0 : undefined,
        golfCourseYN: undefined, // Not in UnifiedListing model

        // HOA
        associationYN: listing.associationYn,
        associationFee: listing.associationFee,
        associationFeeFrequency: listing.associationFeeFrequency,

        // Short-term rentals (not in UnifiedListing - would come from subdivision)
        shortTermRentalsAllowed: undefined,
        shortTermRentalDetails: undefined,

        // MLS
        mlsSource: listing.mlsSource,
        mlsStatus: listing.status,
        listingId: listing.listingId,
        onMarketDate: listing.onMarketDate?.toString(),
        daysOnMarket,

        // Photos
        photosCount: undefined, // Not in UnifiedListing model
        primaryPhoto: listing.primaryPhotoUrl,

        // Description
        publicRemarks: listing.publicRemarks,
      }
    };

    // Optionally include subdivision data for additional context
    if (includeSubdivisionData && listing.subdivisionName && listing.subdivisionName !== "Not Applicable") {
      const subdivisionData = await getSubdivisionData(listing.subdivisionName);

      if (subdivisionData.found) {
        result.subdivisionInfo = {
          shortTermRentalsAllowed: subdivisionData.subdivision?.shortTermRentalsAllowed,
          shortTermRentalDetails: subdivisionData.subdivision?.shortTermRentalDetails,
          hoaMonthlyMin: subdivisionData.subdivision?.hoaMonthlyMin,
          hoaMonthlyMax: subdivisionData.subdivision?.hoaMonthlyMax,
        };
      }
    }

    return result;
  } catch (error: any) {
    console.error("[listing-data] Error fetching listing:", error);
    return {
      found: false,
      error: error.message || "Failed to fetch listing data"
    };
  }
}

/**
 * Check short-term rental status for a specific listing
 *
 * Strategy:
 * 1. Check listing's shortTermRentalsAllowed field
 * 2. If not available, check subdivision's shortTermRentalsAllowed
 * 3. If still unknown, use checkShortTermRentals() to check nearby listings
 * 4. Return "inconclusive" if data unavailable
 *
 * @param address - Property address
 * @returns STR status with source and confidence
 */
export async function checkListingShortTermRentals(address: string): Promise<{
  allowed: "yes-unrestricted" | "yes-limited" | "no-hoa" | "no-city" | "unknown" | "inconclusive";
  details?: string;
  source: "listing" | "subdivision" | "subdivision-model" | "nearby-listings" | "inconclusive";
  confidence: "high" | "medium" | "low";
}> {
  try {
    const listingData = await getListingData(address, true);

    if (!listingData.found) {
      return {
        allowed: "inconclusive",
        details: `Could not find listing for "${address}"`,
        source: "inconclusive",
        confidence: "low"
      };
    }

    // STEP 1: Check listing's own data (field doesn't exist in UnifiedListing, skip to subdivision)
    // Note: Individual listings don't have STR fields - this info comes from subdivision/city level

    // STEP 2: Check subdivision data
    if (listingData.subdivisionInfo?.shortTermRentalsAllowed &&
        listingData.subdivisionInfo.shortTermRentalsAllowed !== "unknown") {
      return {
        allowed: listingData.subdivisionInfo.shortTermRentalsAllowed as any,
        details: listingData.subdivisionInfo.shortTermRentalDetails,
        source: "subdivision",
        confidence: "high"
      };
    }

    // STEP 3: Check nearby listings (if listing has subdivision)
    if (listingData.listing?.subdivisionName && listingData.listing.subdivisionName !== "Not Applicable") {
      const subdivisionSTR = await checkShortTermRentals(listingData.listing.subdivisionName);

      if (subdivisionSTR.allowed !== "inconclusive") {
        return {
          allowed: subdivisionSTR.allowed,
          details: subdivisionSTR.details,
          source: subdivisionSTR.source,
          confidence: subdivisionSTR.confidence
        };
      }
    }

    // STEP 4: Inconclusive
    return {
      allowed: "inconclusive",
      details: `Limited short-term rental data available for this property. Many listings (especially non-GPS MLS sources) don't include STR information. We recommend checking with the ${listingData.listing?.city} city regulations and/or the subdivision's HOA CC&Rs.`,
      source: "inconclusive",
      confidence: "low"
    };

  } catch (error: any) {
    console.error("[listing-data] Error checking listing STR:", error);
    return {
      allowed: "inconclusive",
      details: "Error checking short-term rental status",
      source: "inconclusive",
      confidence: "low"
    };
  }
}
