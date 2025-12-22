// src/lib/ai-community-research.ts
// AI-powered community facts research and auto-recording system

import dbConnect from './mongoose';
import Subdivision from '@/models/subdivisions';

interface ResearchQuestion {
  question: string;
  subdivisionName: string;
  city?: string;
}

interface ResearchResult {
  answer: string;
  factType: string;
  factValue: any;
  dataSource: string;
  confidence: 'high' | 'medium' | 'low';
  shouldRecord: boolean;
}

/**
 * Analyzes listings in a subdivision to extract facts
 * Example: "How many different HOAs exist in Indian Wells Country Club?"
 */
export async function analyzeListingsForFacts(
  subdivisionName: string,
  city?: string
): Promise<Record<string, any>> {
  await dbConnect();

  // Find the subdivision
  const subdivision = await Subdivision.findOne({
    name: new RegExp(`^${subdivisionName}$`, 'i'),
    ...(city && { city: new RegExp(`^${city}$`, 'i') }),
  });

  if (!subdivision) {
    throw new Error(`Subdivision ${subdivisionName} not found`);
  }

  // Import UnifiedListing model dynamically to avoid circular dependencies
  const { default: UnifiedListing } = await import('@/models/unified-listing');

  // Get all active listings in this subdivision
  const listings = await UnifiedListing.find({
    subdivisionName: new RegExp(`^${subdivisionName}$`, 'i'),
    ...(city && { city: new RegExp(`^${city}$`, 'i') }),
    status: { $in: ['Active', 'Pending', 'Active Under Contract'] },
  }).lean();

  // Analyze the data
  const facts: Record<string, any> = {
    totalListings: listings.length,

    // HOA Analysis
    hoaData: analyzeHOAFees(listings),

    // Price Analysis
    priceData: analyzePrices(listings),

    // Property Type Analysis
    propertyTypes: analyzePropertyTypes(listings),

    // Year Built Analysis
    yearBuiltData: analyzeYearBuilt(listings),

    // Size Analysis
    sizeData: analyzeSquareFootage(listings),

    // Amenities Analysis (from listing descriptions)
    amenities: analyzeAmenities(listings),
  };

  return facts;
}

/**
 * Analyzes HOA fees from listings
 */
function analyzeHOAFees(listings: any[]) {
  const hoaFees = listings
    .map(l => l.hoaFee || l.associationFee)
    .filter(fee => fee && fee > 0);

  if (hoaFees.length === 0) {
    return {
      hasData: false,
      message: 'No HOA fee data available in current listings',
    };
  }

  // Get unique HOA amounts (grouped by $10 ranges to account for slight variations)
  const hoaGroups = new Map<string, number>();
  hoaFees.forEach(fee => {
    const roundedFee = Math.round(fee / 10) * 10;
    const key = `$${roundedFee}`;
    hoaGroups.set(key, (hoaGroups.get(key) || 0) + 1);
  });

  const uniqueHOAs = Array.from(hoaGroups.entries())
    .sort((a, b) => parseInt(a[0].slice(1)) - parseInt(b[0].slice(1)))
    .map(([amount, count]) => ({ amount, count }));

  return {
    hasData: true,
    totalListingsWithHOA: hoaFees.length,
    uniqueHOACounts: uniqueHOAs.length,
    uniqueHOAs,
    minHOA: Math.min(...hoaFees),
    maxHOA: Math.max(...hoaFees),
    avgHOA: Math.round(hoaFees.reduce((a, b) => a + b, 0) / hoaFees.length),
    medianHOA: hoaFees.sort((a, b) => a - b)[Math.floor(hoaFees.length / 2)],
  };
}

/**
 * Analyzes price data
 */
function analyzePrices(listings: any[]) {
  const prices = listings
    .map(l => l.listPrice || l.currentPrice)
    .filter(price => price && price > 0);

  if (prices.length === 0) return { hasData: false };

  return {
    hasData: true,
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
    avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
    medianPrice: prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)],
  };
}

/**
 * Analyzes property types
 */
function analyzePropertyTypes(listings: any[]) {
  const typeCount = new Map<string, number>();

  listings.forEach(listing => {
    const type = listing.propertyType || listing.propertySubType || 'Unknown';
    typeCount.set(type, (typeCount.get(type) || 0) + 1);
  });

  return {
    hasData: typeCount.size > 0,
    types: Array.from(typeCount.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count, percentage: Math.round((count / listings.length) * 100) })),
  };
}

/**
 * Analyzes year built
 */
function analyzeYearBuilt(listings: any[]) {
  const years = listings
    .map(l => l.yearBuilt)
    .filter(year => year && year > 1900 && year <= new Date().getFullYear());

  if (years.length === 0) return { hasData: false };

  return {
    hasData: true,
    minYear: Math.min(...years),
    maxYear: Math.max(...years),
    avgYear: Math.round(years.reduce((a, b) => a + b, 0) / years.length),
    yearRange: `${Math.min(...years)}-${Math.max(...years)}`,
  };
}

/**
 * Analyzes square footage
 */
function analyzeSquareFootage(listings: any[]) {
  const sizes = listings
    .map(l => l.livingArea || l.sqft)
    .filter(size => size && size > 0);

  if (sizes.length === 0) return { hasData: false };

  return {
    hasData: true,
    minSqft: Math.min(...sizes),
    maxSqft: Math.max(...sizes),
    avgSqft: Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length),
  };
}

/**
 * Analyzes amenities from listing descriptions and features
 */
function analyzeAmenities(listings: any[]) {
  const amenityKeywords = {
    pools: ['pool', 'spa', 'hot tub'],
    tennis: ['tennis court', 'tennis'],
    pickleball: ['pickleball'],
    golf: ['golf course', 'golf', 'fairway'],
    gym: ['fitness', 'gym', 'exercise'],
    clubhouse: ['clubhouse', 'club house'],
    gated: ['gated', 'guard gate', 'security gate'],
    lake: ['lake', 'lakefront', 'waterfront'],
  };

  const amenityCounts: Record<string, number> = {};

  listings.forEach(listing => {
    const text = [
      listing.publicRemarks,
      listing.privateRemarks,
      listing.amenities,
      listing.associationAmenities,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    Object.entries(amenityKeywords).forEach(([amenity, keywords]) => {
      if (keywords.some(keyword => text.includes(keyword))) {
        amenityCounts[amenity] = (amenityCounts[amenity] || 0) + 1;
      }
    });
  });

  return {
    hasData: Object.keys(amenityCounts).length > 0,
    amenities: Object.entries(amenityCounts)
      .filter(([, count]) => count >= listings.length * 0.3) // At least 30% mention it
      .map(([amenity, count]) => ({
        amenity,
        mentionedIn: count,
        percentage: Math.round((count / listings.length) * 100),
      }))
      .sort((a, b) => b.percentage - a.percentage),
  };
}

/**
 * Records discovered facts to the database
 */
export async function recordCommunityFact(
  subdivisionName: string,
  city: string,
  factType: string,
  factValue: any,
  dataSource: string
): Promise<boolean> {
  await dbConnect();

  try {
    const updateData: any = {
      [`communityFacts.${factType}`]: factValue,
      'communityFacts.dataSource': dataSource,
      'communityFacts.lastVerified': new Date(),
      hasManualData: true,
      lastUpdated: new Date(),
    };

    const result = await Subdivision.findOneAndUpdate(
      {
        name: new RegExp(`^${subdivisionName}$`, 'i'),
        city: new RegExp(`^${city}$`, 'i'),
      },
      { $set: updateData },
      { new: true }
    );

    if (!result) {
      console.error(`Subdivision ${subdivisionName} (${city}) not found for fact recording`);
      return false;
    }

    console.log(`✅ Recorded ${factType} for ${subdivisionName}: ${JSON.stringify(factValue)}`);
    return true;
  } catch (error) {
    console.error(`❌ Error recording fact for ${subdivisionName}:`, error);
    return false;
  }
}

/**
 * Interprets natural language questions and returns answers with recordable facts
 */
export async function answerCommunityQuestion(
  question: string,
  subdivisionName: string,
  city?: string
): Promise<ResearchResult> {
  const lowerQ = question.toLowerCase();

  try {
    // Analyze current listings
    const facts = await analyzeListingsForFacts(subdivisionName, city);

    // HOA-related questions
    if (lowerQ.includes('hoa') || lowerQ.includes('association fee')) {
      if (lowerQ.includes('how many') && lowerQ.includes('different')) {
        return {
          answer: `Based on current listings in ${subdivisionName}, there are ${facts.hoaData.uniqueHOACounts} different HOA fee amounts ranging from $${facts.hoaData.minHOA} to $${facts.hoaData.maxHOA} per month. This suggests there may be ${facts.hoaData.uniqueHOACounts} different neighborhoods or property types within the community.`,
          factType: 'hoaMonthlyMin',
          factValue: facts.hoaData.minHOA,
          dataSource: `Analyzed ${facts.hoaData.totalListingsWithHOA} active listings - ${new Date().toISOString().split('T')[0]}`,
          confidence: 'high',
          shouldRecord: true,
        };
      } else if (lowerQ.includes('range') || lowerQ.includes('cost')) {
        return {
          answer: `HOA fees in ${subdivisionName} range from $${facts.hoaData.minHOA} to $${facts.hoaData.maxHOA} per month, with an average of $${facts.hoaData.avgHOA}/month (based on ${facts.hoaData.totalListingsWithHOA} current listings).`,
          factType: 'hoaMonthlyMin',
          factValue: facts.hoaData.minHOA,
          dataSource: `Analyzed ${facts.hoaData.totalListingsWithHOA} active listings - ${new Date().toISOString().split('T')[0]}`,
          confidence: 'high',
          shouldRecord: true,
        };
      }
    }

    // Year built questions
    if (lowerQ.includes('built') || lowerQ.includes('year') || lowerQ.includes('age')) {
      if (facts.yearBuiltData.hasData) {
        return {
          answer: `Homes in ${subdivisionName} were built between ${facts.yearBuiltData.minYear} and ${facts.yearBuiltData.maxYear}, with an average build year of ${facts.yearBuiltData.avgYear} (based on ${facts.totalListings} current listings).`,
          factType: 'yearBuiltRange',
          factValue: facts.yearBuiltData.yearRange,
          dataSource: `Analyzed ${facts.totalListings} active listings - ${new Date().toISOString().split('T')[0]}`,
          confidence: 'high',
          shouldRecord: true,
        };
      }
    }

    // Price questions
    if (lowerQ.includes('price') || lowerQ.includes('cost') || lowerQ.includes('expensive')) {
      if (facts.priceData.hasData) {
        return {
          answer: `Current homes in ${subdivisionName} are listed from $${facts.priceData.minPrice.toLocaleString()} to $${facts.priceData.maxPrice.toLocaleString()}, with an average price of $${facts.priceData.avgPrice.toLocaleString()} (based on ${facts.totalListings} active listings).`,
          factType: 'avgPrice',
          factValue: facts.priceData.avgPrice,
          dataSource: `Analyzed ${facts.totalListings} active listings - ${new Date().toISOString().split('T')[0]}`,
          confidence: 'medium',
          shouldRecord: false, // Prices change too frequently
        };
      }
    }

    // Property type questions
    if (lowerQ.includes('property type') || lowerQ.includes('condos') || lowerQ.includes('single family')) {
      if (facts.propertyTypes.hasData) {
        const typesList = facts.propertyTypes.types.map((t: any) => `${t.type} (${t.percentage}%)`).join(', ');
        return {
          answer: `${subdivisionName} has the following property types: ${typesList} (based on ${facts.totalListings} current listings).`,
          factType: 'propertyTypes',
          factValue: facts.propertyTypes.types.reduce((acc: any, t: any) => {
            acc[t.type.toLowerCase().replace(/\s+/g, '')] = t.count;
            return acc;
          }, {}),
          dataSource: `Analyzed ${facts.totalListings} active listings - ${new Date().toISOString().split('T')[0]}`,
          confidence: 'high',
          shouldRecord: true,
        };
      }
    }

    // Default response with general facts
    return {
      answer: `Based on ${facts.totalListings} current listings in ${subdivisionName}, I found: ${JSON.stringify(facts, null, 2)}`,
      factType: 'general',
      factValue: facts,
      dataSource: `Analyzed ${facts.totalListings} active listings - ${new Date().toISOString().split('T')[0]}`,
      confidence: 'medium',
      shouldRecord: false,
    };
  } catch (error) {
    console.error('Error answering community question:', error);
    return {
      answer: `I encountered an error while researching ${subdivisionName}. ${error}`,
      factType: 'error',
      factValue: null,
      dataSource: 'Error',
      confidence: 'low',
      shouldRecord: false,
    };
  }
}

/**
 * Helper to count total homes in a subdivision using map addresses
 */
export async function countHomesInSubdivision(
  subdivisionName: string,
  city?: string
): Promise<number> {
  await dbConnect();

  // Import UnifiedListing model
  const { default: UnifiedListing } = await import('@/models/unified-listing');

  // Count unique addresses (both active and sold)
  const uniqueAddresses = await UnifiedListing.distinct('address', {
    subdivisionName: new RegExp(`^${subdivisionName}$`, 'i'),
    ...(city && { city: new RegExp(`^${city}$`, 'i') }),
  });

  return uniqueAddresses.length;
}
