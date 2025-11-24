import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Listing from "@/models/listings";

/**
 * AI-Powered Comparative Market Analysis (CMA) Generator
 *
 * POST /api/ai/cma
 *
 * Generates real-time CMAs for property investors
 * Analyzes comparable properties and calculates investment metrics
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    const body = await req.json();
    const {
      subjectProperty, // The property being analyzed (listingKey or address)
      selectedProperties, // Multiple properties to analyze as a group
      city,
      subdivision,
      radius = 1, // miles (default 1 mile radius)
      bedroomRange = 0, // Exact match on bedrooms
      bathroomRange = 0, // Exact match on bathrooms
      sqftRange = 400, // +/- 400 sqft (as flat value, not percentage)
      maxComps = 20,
      includeClosedListings = true, // Include closed/sold properties
      includeInvestmentAnalysis = true,
      assumptions = {} // User-provided assumptions for calculations
    } = body;

    console.log("📊 Generating CMA for:", {
      subjectProperty: subjectProperty || null,
      selectedPropertiesCount: selectedProperties?.length || 0,
      city,
      subdivision
    });

    await connectDB();

    // Step 1: Get subject property details if provided
    let subjectListing = null;
    let subjectListings: any[] = [];

    if (selectedProperties && selectedProperties.length > 0) {
      // Use selected properties as the basis for comps
      subjectListings = selectedProperties;
      // Use first property as reference for calculations
      subjectListing = selectedProperties[0];
      console.log(`📋 Using ${selectedProperties.length} selected properties as basis for CMA`);
    } else if (subjectProperty) {
      subjectListing = await Listing.findOne({
        $or: [
          { listingKey: subjectProperty },
          { slugAddress: subjectProperty }
        ]
      }).lean();

      if (!subjectListing) {
        return NextResponse.json(
          { error: "Subject property not found" },
          { status: 404 }
        );
      }
      subjectListings = [subjectListing];
    }

    // Step 2: Build query for comparable properties
    const query: any = {
      propertyType: "A", // Residential only
    };

    // Include both Active and Closed/Sold listings for better comps
    if (includeClosedListings) {
      query.standardStatus = {
        $in: ["Active", "Closed", "Sold", "Pending"]
      };
    } else {
      query.standardStatus = "Active";
    }

    // Location filters
    if (city) {
      query.city = { $regex: new RegExp(city, 'i') };
    }
    if (subdivision) {
      query.subdivisionName = { $regex: new RegExp(subdivision, 'i') };
    }

    // If we have a subject property, filter by similar characteristics
    if (subjectListing) {
      const beds = subjectListing.beds || subjectListing.bedroomsTotal || 3;
      const baths = subjectListing.baths || subjectListing.bathroomsTotalInteger || 2;
      const sqft = subjectListing.sqft || subjectListing.livingArea || 1500;
      const hasPool = subjectListing.poolYn || subjectListing.pool || false;
      const hasSpa = subjectListing.spaYn || subjectListing.spa || false;

      // Exact bed/bath match (bedroomRange = 0 by default)
      if (bedroomRange === 0) {
        query.bedroomsTotal = beds;
      } else {
        query.bedroomsTotal = {
          $gte: Math.max(0, beds - bedroomRange),
          $lte: beds + bedroomRange
        };
      }

      if (bathroomRange === 0) {
        query.bathroomsTotalInteger = baths;
      } else {
        query.bathroomsTotalInteger = {
          $gte: Math.max(0, baths - bathroomRange),
          $lte: baths + bathroomRange
        };
      }

      // Sqft range as flat value (+/- 400 sqft by default)
      query.livingArea = {
        $gte: sqft - sqftRange,
        $lte: sqft + sqftRange
      };

      // Pool/Spa filtering - match if subject property has these features
      if (hasPool) {
        query.poolYn = true;
      }
      if (hasSpa) {
        query.spaYn = true;
      }

      // Geographic proximity using coordinates (1 mile radius by default)
      if (subjectListing.latitude && subjectListing.longitude) {
        const lat = subjectListing.latitude;
        const lng = subjectListing.longitude;
        const latDelta = radius / 69; // 1 degree latitude ≈ 69 miles
        const lngDelta = radius / (69 * Math.cos(lat * Math.PI / 180));

        query.latitude = {
          $gte: lat - latDelta,
          $lte: lat + latDelta
        };
        query.longitude = {
          $gte: lng - lngDelta,
          $lte: lng + lngDelta
        };

        console.log('🗺️ Geographic filter applied:', {
          centerLat: lat,
          centerLng: lng,
          radiusMiles: radius,
          latRange: [lat - latDelta, lat + latDelta],
          lngRange: [lng - lngDelta, lng + lngDelta]
        });
      } else {
        console.log('⚠️ No coordinates available, using city/subdivision filter only');
      }

      // Exclude the subject properties themselves
      if (subjectListings.length > 0) {
        const excludeIds = subjectListings
          .map(s => s.id || s.listingId || s.listingKey)
          .filter(Boolean);
        if (excludeIds.length > 0) {
          query.listingKey = { $nin: excludeIds };
        }
      }
    }

    console.log("🔍 CMA Query:", JSON.stringify(query, null, 2));

    // Step 3: Fetch comparable properties
    const comparables = await Listing.find(query)
      .sort({
        standardStatus: -1, // Active first, then Closed
        onMarketDate: -1 // Most recent first
      })
      .limit(maxComps)
      .select({
        listingKey: 1,
        slugAddress: 1,
        address: 1,
        unparsedAddress: 1,
        city: 1,
        postalCode: 1,
        subdivisionName: 1,
        listPrice: 1,
        originalListPrice: 1,
        closePrice: 1,
        closeDate: 1,
        livingArea: 1,
        bedroomsTotal: 1,
        bathroomsTotalInteger: 1,
        bathroomsTotalDecimal: 1,
        lotSizeSquareFeet: 1,
        yearBuilt: 1,
        garageSpaces: 1,
        poolYN: 1,
        spaYN: 1,
        onMarketDate: 1,
        daysOnMarket: 1,
        standardStatus: 1,
        mlsStatus: 1,
        mlsSource: 1,
        latitude: 1,
        longitude: 1,
        taxAnnualAmount: 1,
        associationFee: 1,
        propertySubType: 1,
        propertyType: 1,
      })
      .lean();

    console.log(`✅ Found ${comparables.length} comparable properties`);
    console.log(`📊 Breakdown: ${comparables.filter(c => c.standardStatus === 'Active').length} Active, ${comparables.filter(c => c.standardStatus === 'Closed' || c.standardStatus === 'Sold').length} Closed`);

    // Step 4: Calculate CMA metrics
    // Use closePrice for closed listings, listPrice for active listings
    const pricesPerSqft = comparables
      .filter(c => c.livingArea && (c.closePrice || c.listPrice))
      .map(c => {
        const price = c.closePrice || c.listPrice || 0;
        return price / c.livingArea!;
      });

    const daysOnMarket = comparables
      .filter(c => c.daysOnMarket)
      .map(c => c.daysOnMarket!);

    const priceReductions = comparables.filter(c =>
      c.originalListPrice && c.listPrice && c.originalListPrice > c.listPrice
    );

    const allPrices = comparables.map(c => c.closePrice || c.listPrice || 0);

    const cmaMetrics = {
      comparablesCount: comparables.length,
      activeCount: comparables.filter(c => c.standardStatus === 'Active').length,
      closedCount: comparables.filter(c => c.standardStatus === 'Closed' || c.standardStatus === 'Sold').length,
      medianPricePerSqft: median(pricesPerSqft),
      averagePricePerSqft: average(pricesPerSqft),
      minPricePerSqft: Math.min(...pricesPerSqft),
      maxPricePerSqft: Math.max(...pricesPerSqft),
      averageDaysOnMarket: average(daysOnMarket),
      medianDaysOnMarket: median(daysOnMarket),
      priceReductionRate: (priceReductions.length / comparables.length) * 100,
      averagePriceReduction: average(
        priceReductions.map(c =>
          ((c.originalListPrice! - c.listPrice!) / c.originalListPrice!) * 100
        )
      ),
      priceRange: {
        min: Math.min(...allPrices),
        max: Math.max(...allPrices),
        median: median(allPrices),
        average: average(allPrices)
      }
    };

    // Step 5: Investment Analysis (if requested)
    let investmentAnalysis = null;
    if (includeInvestmentAnalysis && subjectListing) {
      const {
        downPaymentPercent = 20,
        interestRate = 7.0,
        loanTermYears = 30,
        estimatedRent = null,
        rentToValueRatio = 0.008, // 0.8% default
        propertyTaxRate = 1.25, // % of value
        insuranceAnnual = 1200,
        maintenancePercent = 1, // % of value annually
        vacancyRate = 8, // % of rent
        propertyManagementFee = 10, // % of rent
      } = assumptions;

      const purchasePrice = subjectListing.listPrice || 0;
      const downPayment = purchasePrice * (downPaymentPercent / 100);
      const loanAmount = purchasePrice - downPayment;

      // Monthly mortgage payment (P&I)
      const monthlyRate = (interestRate / 100) / 12;
      const numPayments = loanTermYears * 12;
      const monthlyMortgage = loanAmount *
        (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
        (Math.pow(1 + monthlyRate, numPayments) - 1);

      // Estimate monthly rent
      const monthlyRent = estimatedRent || (purchasePrice * rentToValueRatio);

      // Monthly expenses
      const monthlyPropertyTax = (purchasePrice * (propertyTaxRate / 100)) / 12;
      const monthlyInsurance = insuranceAnnual / 12;
      const monthlyMaintenance = (purchasePrice * (maintenancePercent / 100)) / 12;
      const monthlyHOA = subjectListing.associationFee || 0;
      const monthlyVacancy = monthlyRent * (vacancyRate / 100);
      const monthlyPropManagement = monthlyRent * (propertyManagementFee / 100);

      const totalMonthlyExpenses =
        monthlyMortgage +
        monthlyPropertyTax +
        monthlyInsurance +
        monthlyMaintenance +
        monthlyHOA +
        monthlyVacancy +
        monthlyPropManagement;

      const monthlyCashFlow = monthlyRent - totalMonthlyExpenses;
      const annualCashFlow = monthlyCashFlow * 12;

      // Calculate key metrics
      const totalCashInvested = downPayment + (purchasePrice * 0.03); // Assume 3% closing
      const cashOnCashReturn = (annualCashFlow / totalCashInvested) * 100;

      const annualNOI = (monthlyRent * 12) - (
        (monthlyPropertyTax * 12) +
        (monthlyInsurance * 12) +
        (monthlyMaintenance * 12) +
        (monthlyHOA * 12) +
        (monthlyVacancy * 12) +
        (monthlyPropManagement * 12)
      );
      const capRate = (annualNOI / purchasePrice) * 100;

      const onePercentTest = monthlyRent >= (purchasePrice * 0.01);
      const grm = purchasePrice / (monthlyRent * 12);
      const dscr = annualNOI / (monthlyMortgage * 12);

      investmentAnalysis = {
        purchasePrice,
        downPayment,
        loanAmount,
        monthlyMortgage,
        estimatedMonthlyRent: monthlyRent,
        monthlyExpenses: {
          mortgage: monthlyMortgage,
          propertyTax: monthlyPropertyTax,
          insurance: monthlyInsurance,
          maintenance: monthlyMaintenance,
          hoa: monthlyHOA,
          vacancy: monthlyVacancy,
          propertyManagement: monthlyPropManagement,
          total: totalMonthlyExpenses
        },
        monthlyCashFlow,
        annualCashFlow,
        metrics: {
          cashOnCashReturn: {
            value: cashOnCashReturn,
            rating: cashOnCashReturn >= 8 ? 'excellent' : cashOnCashReturn >= 5 ? 'good' : 'poor',
            description: 'Annual pre-tax cash flow as % of total cash invested'
          },
          capRate: {
            value: capRate,
            rating: capRate >= 7 ? 'excellent' : capRate >= 4 ? 'good' : 'poor',
            description: 'Net operating income as % of property value'
          },
          onePercentRule: {
            passes: onePercentTest,
            value: (monthlyRent / purchasePrice) * 100,
            description: 'Monthly rent should be ≥ 1% of purchase price'
          },
          grossRentMultiplier: {
            value: grm,
            rating: grm <= 7 ? 'excellent' : grm <= 10 ? 'good' : 'poor',
            description: 'Years of gross rent to pay off property'
          },
          debtServiceCoverageRatio: {
            value: dscr,
            rating: dscr >= 1.25 ? 'excellent' : dscr >= 1.0 ? 'acceptable' : 'risky',
            description: 'Ability to cover mortgage from operating income'
          }
        },
        assumptions: {
          downPaymentPercent,
          interestRate,
          loanTermYears,
          rentToValueRatio,
          propertyTaxRate,
          insuranceAnnual,
          maintenancePercent,
          vacancyRate,
          propertyManagementFee
        }
      };
    }

    // Step 6: Market context
    const marketContext = {
      inventoryLevel: comparables.length < 5 ? 'low' : comparables.length < 15 ? 'moderate' : 'high',
      marketType: cmaMetrics.averageDaysOnMarket < 30 ? "seller's market" :
                  cmaMetrics.averageDaysOnMarket < 60 ? 'balanced market' : "buyer's market",
      competitiveness: cmaMetrics.priceReductionRate < 15 ? 'highly competitive' :
                       cmaMetrics.priceReductionRate < 30 ? 'moderately competitive' : 'less competitive'
    };

    // Step 7: Estimated value for subject property
    let estimatedValue = null;
    if (subjectListing && cmaMetrics.medianPricePerSqft && subjectListing.livingArea) {
      const estimatedPrice = cmaMetrics.medianPricePerSqft * subjectListing.livingArea;
      const currentPrice = subjectListing.listPrice || 0;
      const variance = ((estimatedPrice - currentPrice) / currentPrice) * 100;

      estimatedValue = {
        estimatedPrice,
        currentListPrice: currentPrice,
        variance,
        recommendation: variance > 5 ? 'overpriced' : variance < -5 ? 'underpriced' : 'fairly priced'
      };
    }

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      subjectProperty: subjectListing ? {
        address: subjectListing.address || subjectListing.unparsedAddress,
        city: subjectListing.city,
        listPrice: subjectListing.price || subjectListing.listPrice,
        beds: subjectListing.beds || subjectListing.bedroomsTotal,
        baths: subjectListing.baths || subjectListing.bathroomsTotalInteger,
        sqft: subjectListing.sqft || subjectListing.livingArea,
        yearBuilt: subjectListing.yearBuilt,
        pool: subjectListing.poolYn || subjectListing.pool,
        spa: subjectListing.spaYn || subjectListing.spa,
      } : null,
      selectedProperties: subjectListings.map(s => ({
        id: s.id || s.listingId || s.listingKey,
        address: s.address || s.unparsedAddress,
        city: s.city,
        price: s.price || s.listPrice,
        beds: s.beds || s.bedroomsTotal,
        baths: s.baths || s.bathroomsTotalInteger,
        sqft: s.sqft || s.livingArea,
        subdivision: s.subdivision || s.subdivisionName,
      })),
      cmaMetrics,
      comparables: comparables.map(c => ({
        listingKey: c.listingKey,
        slugAddress: c.slugAddress,
        address: c.address || c.unparsedAddress,
        city: c.city,
        listPrice: c.listPrice,
        closePrice: c.closePrice,
        finalPrice: c.closePrice || c.listPrice, // Use close price if available
        pricePerSqft: (c.closePrice || c.listPrice) && c.livingArea
          ? (c.closePrice || c.listPrice) / c.livingArea
          : null,
        beds: c.bedroomsTotal,
        baths: c.bathroomsTotalInteger || c.bathroomsTotalDecimal,
        sqft: c.livingArea,
        lotSize: c.lotSizeSquareFeet,
        daysOnMarket: c.daysOnMarket,
        yearBuilt: c.yearBuilt,
        subdivision: c.subdivisionName,
        status: c.standardStatus || c.mlsStatus,
        mlsSource: c.mlsSource,
        pool: c.poolYN,
        spa: c.spaYN,
        garageSpaces: c.garageSpaces,
        closeDate: c.closeDate,
      })),
      estimatedValue,
      investmentAnalysis,
      marketContext,
      user: session?.user?.email || 'anonymous'
    };

    console.log("✅ CMA generated successfully");
    return NextResponse.json(response);

  } catch (error: any) {
    console.error("❌ CMA Generation Error:", error);
    return NextResponse.json(
      { error: "Failed to generate CMA", details: error.message },
      { status: 500 }
    );
  }
}

// Helper functions
function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}
