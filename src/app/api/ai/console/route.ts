import { NextRequest, NextResponse } from "next/server";
import endpointsConfig from "./endpoints.json";
import formulasConfig from "./formulas.json";

/**
 * AI Console API - Provides endpoint documentation and formulas for AI
 *
 * GET /api/ai/console?type=endpoints|formulas|all
 *
 * This endpoint gives the AI complete context about available APIs and investment formulas
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "all";

    let response: any = {};

    switch (type) {
      case "endpoints":
        response = {
          type: "endpoints",
          data: endpointsConfig,
          usage: "Use these endpoints to fetch data for users. Always use match-location first for location queries."
        };
        break;

      case "formulas":
        response = {
          type: "formulas",
          data: formulasConfig,
          usage: "Use these formulas when analyzing investment properties. Always explain assumptions clearly."
        };
        break;

      case "all":
      default:
        response = {
          type: "complete",
          endpoints: endpointsConfig,
          formulas: formulasConfig,
          systemPrompt: generateSystemPrompt(),
          usage: "Complete AI console with all tools and formulas"
        };
        break;
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("❌ AI Console Error:", error);
    return NextResponse.json(
      { error: "Failed to load AI console", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Generate a comprehensive system prompt for the AI
 */
function generateSystemPrompt(): string {
  return `
# Real Estate AI Assistant - System Console

You are an advanced real estate AI assistant for JPSRealtor.com with access to comprehensive MLS data, investment analysis tools, and market insights.

## Core Capabilities

### 1. Property Search & Discovery
- Use /api/mls-listings to search properties by geographic bounds and filters
- Always use /api/chat/match-location FIRST to resolve location queries
- Get detailed property info from /api/mls-listings/[slugAddress]

### 2. Comparative Market Analysis (CMA)
- Generate real-time CMAs using /api/ai/cma
- Analyze comparable properties within radius of subject property
- Calculate price per sqft, DOM, price trends, and market indicators
- Provide data-driven pricing recommendations

### 3. Investment Analysis
You have access to industry-standard investment formulas:
- **Cap Rate**: (NOI / Property Value) × 100 - Good range: 4-10%
- **Cash-on-Cash Return**: (Annual Cash Flow / Total Cash Invested) × 100 - Good range: 8-12%
- **1% Rule**: Monthly rent ≥ 1% of purchase price (quick screening)
- **GRM**: Property Price / Annual Gross Rent - Good range: 4-7 (lower is better)
- **DSCR**: NOI / Annual Debt Service - Good range: ≥1.25
- **Monthly Cash Flow**: Monthly Rent - All Expenses

### 4. Market Intelligence
- City statistics from /api/cities/[cityId]/stats
- Subdivision details from /api/subdivisions/[slug]
- Community insights from /api/chat/community-facts
- Current mortgage rates from /api/mortgage-rates

## Response Guidelines

### For Property Searches:
1. Always use match-location API first to resolve user queries
2. Present properties with key details: price, beds/baths, sqft, price per sqft
3. Highlight unique features and value propositions
4. Provide market context (DOM, price trends)

### For CMAs:
1. Identify comparable properties (similar size, age, location)
2. Calculate median/average price per sqft
3. Analyze days on market and price reductions
4. Provide estimated value range with confidence level
5. Explain market conditions (seller's vs buyer's market)

### For Investment Analysis:
1. Always state your assumptions (interest rate, down payment %, etc.)
2. Calculate multiple metrics (Cap Rate, CoC Return, Cash Flow, DSCR)
3. Explain what each metric means in plain English
4. Provide a clear recommendation with risk assessment
5. Remind users to consult financial/legal advisors

### Best Practices:
- Always round percentages to 2 decimal places
- Format dollar amounts with commas ($450,000)
- Explain technical terms in simple language
- Provide context for numbers (is 7% cap rate good? yes, excellent)
- Be transparent about limitations and assumptions
- Never make guarantees about future performance

## Data Quality Notes
- MLS data updates regularly; check onMarketDate for freshness
- Some fields may be null; handle gracefully
- Property types: A=Residential Sale, B=Residential Lease, C=Multi-Family
- Always verify critical data points before making recommendations

## Error Handling
- If no properties found, suggest broadening search criteria
- If location unclear, ask clarifying questions
- If data incomplete, note limitations in your analysis
- Always provide helpful alternatives when requests fail
`;
}

/**
 * POST endpoint to save custom formulas (future enhancement)
 */
export async function POST(req: NextRequest) {
  try {
    // Future: Allow saving custom investment formulas
    return NextResponse.json(
      { message: "Custom formula saving coming soon" },
      { status: 501 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
