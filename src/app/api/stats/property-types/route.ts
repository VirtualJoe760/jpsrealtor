import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import UnifiedListing from "@/models/unified-listing";

/**
 * GET /api/stats/property-types
 *
 * Returns comparative statistics across all property types
 *
 * Response includes side-by-side comparison of:
 * - Residential Sale (A)
 * - Rental (B)
 * - Multi-Family (C)
 * - Land (D)
 *
 * Perfect for dashboards and market overview pages
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    console.log('[property-types-stats] Calculating comparative stats for all property types...');

    const startTime = Date.now();

    // Aggregate stats for all property types in a single query
    const stats = await UnifiedListing.aggregate([
      {
        $match: {
          standardStatus: "Active",
          propertyType: { $in: ["A", "B", "C", "D"] }
        }
      },
      {
        $group: {
          _id: "$propertyType",
          count: { $sum: 1 },
          avgPrice: { $avg: "$listPrice" },
          minPrice: { $min: "$listPrice" },
          maxPrice: { $max: "$listPrice" },
          prices: { $push: "$listPrice" }
        }
      },
      {
        $sort: { _id: 1 } // Sort by property type code (A, B, C, D)
      }
    ]);

    const duration = Date.now() - startTime;
    console.log(`[property-types-stats] Aggregation completed in ${duration}ms`);

    // Process results and calculate median for each type
    const propertyTypes: Record<string, any> = {
      A: null,
      B: null,
      C: null,
      D: null
    };

    stats.forEach((result) => {
      const prices = result.prices.sort((a: number, b: number) => a - b);
      const medianPrice = prices.length % 2 === 0
        ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
        : prices[Math.floor(prices.length / 2)];

      propertyTypes[result._id] = {
        code: result._id,
        name: getPropertyTypeName(result._id),
        description: getPropertyTypeDescription(result._id),
        count: result.count,
        medianPrice: Math.round(medianPrice),
        avgPrice: Math.round(result.avgPrice),
        minPrice: result.minPrice,
        maxPrice: result.maxPrice,
        // Calculate market share
        marketShare: 0 // Will be calculated after we have totals
      };
    });

    // Calculate total count for market share
    const totalCount = Object.values(propertyTypes)
      .filter(type => type !== null)
      .reduce((sum, type: any) => sum + type.count, 0);

    // Update market share percentages
    Object.keys(propertyTypes).forEach(code => {
      if (propertyTypes[code]) {
        propertyTypes[code].marketShare = Number(
          ((propertyTypes[code].count / totalCount) * 100).toFixed(2)
        );
      }
    });

    // Fill in missing types with zero data
    Object.keys(propertyTypes).forEach(code => {
      if (!propertyTypes[code]) {
        propertyTypes[code] = {
          code,
          name: getPropertyTypeName(code),
          description: getPropertyTypeDescription(code),
          count: 0,
          medianPrice: 0,
          avgPrice: 0,
          minPrice: 0,
          maxPrice: 0,
          marketShare: 0
        };
      }
    });

    console.log('[property-types-stats] Stats calculated:', {
      totalListings: totalCount,
      residential: propertyTypes.A?.count || 0,
      rental: propertyTypes.B?.count || 0,
      multiFamily: propertyTypes.C?.count || 0,
      land: propertyTypes.D?.count || 0
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          summary: {
            totalListings: totalCount,
            activePropertyTypes: stats.length,
            lastUpdated: new Date().toISOString()
          },
          propertyTypes: {
            residential: propertyTypes.A,
            rental: propertyTypes.B,
            multiFamily: propertyTypes.C,
            land: propertyTypes.D
          },
          // Also provide as array for easier iteration
          comparison: [
            propertyTypes.A,
            propertyTypes.B,
            propertyTypes.C,
            propertyTypes.D
          ]
        },
        metadata: {
          cached: false,
          source: 'calculated',
          calculationTime: `${duration}ms`,
          generatedAt: new Date().toISOString()
        }
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' // 30 min cache
        }
      }
    );

  } catch (error) {
    console.error('[property-types-stats] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch property type statistics",
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

/**
 * Get human-readable property type name
 */
function getPropertyTypeName(code: string): string {
  const names: Record<string, string> = {
    A: 'Residential Sale',
    B: 'Rental',
    C: 'Multi-Family',
    D: 'Land'
  };
  return names[code] || 'Unknown';
}

/**
 * Get property type description
 */
function getPropertyTypeDescription(code: string): string {
  const descriptions: Record<string, string> = {
    A: 'Single-family homes, condos, and residential properties for sale',
    B: 'Properties available for rent',
    C: 'Apartment buildings, duplexes, and multi-unit properties',
    D: 'Vacant land, lots, and developable parcels'
  };
  return descriptions[code] || 'Unknown property type';
}
