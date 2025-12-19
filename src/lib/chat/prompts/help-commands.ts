// src/lib/chat/prompts/help-commands.ts
// Dual help system: customer-friendly and technical

/**
 * CUSTOMER-FRIENDLY HELP
 * Simple, approachable guide for end users
 * Triggered by: "help", "get started", "what can you do"
 */
export const CUSTOMER_HELP = `
# 👋 Welcome! I'm your AI Real Estate Assistant

I'm here to help you explore homes and neighborhoods in Southern California. Here's what I can do:

## 🏠 Find Your Perfect Home

**Search for homes:**
• "Show me homes in Palm Desert"
• "3 bedroom homes under $800k"
• "Homes with a pool in Indian Wells"
• "What's new in La Quinta?"

**I can filter by:**
✓ Bedrooms & bathrooms
✓ Price range
✓ Property type (house, condo, townhouse)
✓ Amenities (pool, spa, views, garage)
✓ Age & condition

## 🗺️ Explore Neighborhoods

**Learn about areas:**
• "Tell me about PGA West"
• "What's Indian Wells like?"
• "Does Palm Desert Country Club allow short-term rentals?"
• "What's the HOA fee in Trilogy?"

**I know about:**
✓ Subdivisions & communities
✓ HOA fees & restrictions
✓ Golf courses & amenities
✓ Rental policies
✓ Community features

## 📊 Market Insights

**Get market data:**
• "How have homes appreciated in Palm Springs?"
• "What's the average price in La Quinta?"
• "How fast do homes sell in Indian Wells?"
• "Show me price trends for Rancho Mirage"

**Market info includes:**
✓ Home appreciation rates
✓ Average prices & price per sqft
✓ Days on market
✓ Market trends over time

## 💡 Quick Tips

**Be specific:** The more details you provide, the better I can help!
**Ask naturally:** Just talk to me like you would a real estate agent
**Follow up:** I remember our conversation, so feel free to ask follow-up questions

## 🚀 Ready to Start?

Try asking me:
• "Show me homes in [your favorite city]"
• "Tell me about [a neighborhood you're interested in]"
• "What's the market like in [location]?"

---

**Type \`examples\` to see more examples, or just start asking questions!**

For developers/technical users, type \`/**help\` for detailed documentation.
`;

/**
 * TECHNICAL HELP (DEVELOPER MODE)
 * Detailed tool documentation for developers and power users
 * Triggered by: "/**help", "technical help", "dev help"
 */
export const TECHNICAL_HELP = `
# 🛠️ JPSRealtor AI Assistant - Technical Documentation

## System Architecture

**Component-First Architecture:**
- Tools return parameters (not data)
- Frontend components fetch their own data
- Tool execution: ~50ms (200x faster than old system)
- Zero MongoDB timeout errors

**Available Tools:** 11 user-first tools
**Intent Classification:** Pattern-based with entity recognition
**Streaming:** SSE (Server-Sent Events) for real-time responses

---

## 🔧 Available Tools

### 1. searchHomes
**Purpose:** Property search with filters
**Parameters:**
- \`location\` (required): city, subdivision, ZIP
- \`beds\`: minimum bedrooms
- \`baths\`: minimum bathrooms
- \`maxPrice\`: maximum price
- \`minPrice\`: minimum price
- \`pool\`: must have pool
- \`propertyType\`: "house" | "condo" | "townhouse"

**Returns:** Search parameters for ListingCarousel component
**Performance:** 50ms execution

**Examples:**
- "Show me homes in Palm Desert"
- "3 bed homes under $800k with a pool"

---

### 2. getSubdivisionInfo
**Purpose:** Subdivision data (HOA, amenities, rentals)
**Parameters:**
- \`subdivisionName\` (required)
- \`field\`: "shortTermRentals" | "hoa" | "amenities" | "all"

**Returns:** Subdivision details including:
- Short-term rental policies
- HOA fees & includes
- Amenities (golf, tennis, pools)
- Security type

**Examples:**
- "Does PDCC allow short-term rentals?"
- "What's the HOA fee in PGA West?"

---

### 3. getListingInfo
**Purpose:** Specific property details
**Parameters:**
- \`address\` (required)
- \`field\`: "shortTermRentals" | "hoa" | "details" | "all"

**Examples:**
- "What's the HOA for 82223 Vandenberg?"
- "Tell me about 123 Desert Willow Drive"

---

### 4. getAppreciation
**Purpose:** Historical appreciation analytics
**Parameters:**
- \`location\` (required): city, subdivision, or county
- \`period\`: "1y" | "3y" | "5y" | "10y"

**Returns:** Component parameters for AppreciationContainer
**Output:** Closed sales chart with appreciation rates

**Examples:**
- "How have homes appreciated in Palm Springs?"
- "5-year trends for Indian Wells"

---

### 5. searchNewListings
**Purpose:** Recent listings with time filter
**Parameters:**
- \`location\` (required)
- \`timeframe\`: "today" | "week" | "month"

**Examples:**
- "New listings in La Quinta this week"
- "What's new in Palm Desert?"

---

### 6. getMarketOverview
**Purpose:** General market information
**Parameters:**
- \`location\` (required)

**Examples:**
- "Tell me about Palm Desert"
- "What's Indian Wells like?"

---

### 7. getPricing
**Purpose:** Price statistics for area
**Parameters:**
- \`location\` (required)

**Examples:**
- "How much are homes in La Quinta?"
- "Average price in Indian Wells"

---

### 8. getMarketTrends
**Purpose:** Market health & trends
**Parameters:**
- \`location\` (required)

**Examples:**
- "Is the Palm Springs market going up?"
- "Market trends for Rancho Mirage"

---

### 9. compareLocations
**Purpose:** Side-by-side location comparison
**Parameters:**
- \`location1\` (required)
- \`location2\` (required)

**Examples:**
- "Compare Palm Desert vs Indian Wells"
- "Palm Springs or La Quinta?"

---

### 10. findNeighborhoods
**Purpose:** Neighborhood discovery
**Parameters:**
- \`city\` (required)
- \`criteria\`: "golf" | "55+" | "family" | "luxury"

**Examples:**
- "What neighborhoods are in Palm Desert?"
- "Best golf communities"

---

### 11. searchArticles
**Purpose:** Blog article search
**Parameters:**
- \`query\` (required)

**Examples:**
- "What is an HOA?"
- "First-time buyer tips"

---

## 🎯 Intent Classification

**Priority System:**
1. Entity recognition override (subdivision/address queries)
2. Priority keywords ("appreciation", "roi")
3. Pattern matching (60+ patterns)

**Confidence Scores:**
- 5.0: Very specific patterns
- 4.0: Strong patterns
- 3.0: Priority keywords
- 2.0: Weak patterns
- 1.0: Fallback

**File:** \`src/lib/chat/intent-classifier.ts\` (283 lines)

---

## 📦 Component Markers

Tools return component markers that trigger frontend rendering:

- \`[LISTING_CAROUSEL]\` - searchHomes, searchNewListings
- \`[APPRECIATION]\` - getAppreciation
- \`[MARKET_STATS]\` - getMarketStats
- \`[SUBDIVISION_INFO]\` - getSubdivisionInfo

**Frontend:** \`ChatResultsContainer.tsx\` parses markers and renders components

---

## 🚀 Performance Metrics

**Tool Execution:** ~50ms (vs 10+ seconds in old system)
**AI Streaming:** ~1000ms
**Component Data Fetch:** ~500ms
**Total E2E:** ~1.5-2 seconds

**Optimization:**
- Component-first architecture
- Parameter return (no data in tools)
- Parallel data fetching
- 2-minute tool caching

---

## 📚 Documentation

Full docs available at:
- \`docs/chat/README.md\` - Overview
- \`docs/chat/ARCHITECTURE.md\` - System design
- \`docs/chat/INTENT_CLASSIFICATION.md\` - Intent patterns
- \`docs/chat/TOOLS.md\` - Tool development
- \`docs/chat/TESTING.md\` - Testing guide
- \`docs/chat/TROUBLESHOOTING.md\` - Common issues

---

## 🔍 Debugging

**Add logging:**
\`\`\`typescript
console.log('[toolName] Args:', args);
console.log('[toolName] Result:', result);
\`\`\`

**Test with cURL:**
\`\`\`bash
curl -X POST http://localhost:3000/api/chat/stream \\
  -H "Content-Type: application/json" \\
  -d '{"messages":[{"role":"user","content":"YOUR QUERY"}],"userId":"test","userTier":"premium"}'
\`\`\`

**Check logs:** \`local-logs/chat-records/\`

---

**For customer-friendly help, type \`help\` or \`get started\`**
`;

/**
 * Detailed tool descriptions for power users
 * Triggered when user types "tools"
 */
export const TOOLS_REFERENCE = `
# 🛠️ Tool Reference - Detailed Capabilities

## 1. queryDatabase
**Purpose**: Flexible property search with advanced filters
**Use Cases**: Any property search query
**Filters**:
- Location: city, subdivision, ZIP, county
- Property: beds, baths, sqft, year built, type
- Price: min/max price, price per sqft
- Amenities: pool, spa, view, garage, gated
- Time: days on market, listed after date, open houses

**Examples**:
- "3+ bed homes under $800k in Palm Desert"
- "New listings in La Quinta from the past week"
- "Homes with pools and mountain views in Indian Wells"
- "Condos under $500k in Rancho Mirage"

---

## 2. searchArticles
**Purpose**: Search blog articles and guides
**Use Cases**: Questions about real estate topics, tips, local insights
**Topics**: Market insights, buying/selling tips, local amenities, costs, HOAs

**Examples**:
- "What are the hidden costs of homeownership?"
- "Energy costs in Coachella Valley"
- "First-time home buyer tips"

---

## 3. getAppreciation
**Purpose**: Property appreciation analytics over time
**Use Cases**: Market growth, investment potential, price trends
**Periods**: 1 year, 3 years, 5 years (default), 10 years
**Output**: Annual rate, cumulative appreciation, trend analysis, confidence metrics

**Examples**:
- "How much have homes appreciated in Palm Springs?"
- "5-year trends for Indian Wells Country Club"
- "Is La Quinta a good investment?"

---

## 4. getMarketStats
**Purpose**: Comprehensive market statistics
**Use Cases**: Market health, competitive analysis, buying/selling decisions
**Metrics**:
- Days on Market (average, median, distribution)
- Price per Square Foot (average, median, range)
- HOA Fees (average, median, frequency breakdown)
- Property Tax (average, median, effective rate)

**Examples**:
- "How fast do homes sell in Palm Desert?"
- "Average price per sqft in Rancho Mirage?"
- "HOA fees in PGA West?"

---

## 5. getRegionalStats
**Purpose**: Regional overview with city-by-city breakdown
**Use Cases**: Broad market view, city comparison, valley-wide searches
**Output**: Regional summary + individual city stats

**Examples**:
- "Show me new listings in Coachella Valley"
- "Compare all desert cities"
- "What's the median price across the valley?"

---

## 6. lookupSubdivision
**Purpose**: Fuzzy search for subdivision names
**Use Cases**: Partial names, uncertain spelling, "the [name]" queries
**Output**: Best matching subdivision with confidence score

**Examples**:
- "Find 'Vintage' subdivisions"
- "Is there an Indian Wells CC?"
- "The Vintage" → "Vintage Country Club"

---

## 7. getNeighborhoodPageLink
**Purpose**: Direct links to browse neighborhoods
**Use Cases**: Exploration, no specific property in mind, fallback when no results
**Output**: URL + page description

**Examples**:
- "Show me Palm Desert neighborhoods page"
- "Browse subdivisions in Indian Wells"
- "Link to Orange County homes"

---

## 8. matchLocation (Deprecated)
**Note**: Use \`queryDatabase\` instead for all location queries

## 9. searchCity (Deprecated)
**Note**: Use \`queryDatabase\` instead for city searches

---

**Pro Tip**: You don't need to know these technical details! Just ask naturally, and I'll choose the right tools automatically. This reference is for those who want to understand what's happening behind the scenes.
`;

/**
 * Example queries organized by use case
 * Triggered when user types "examples"
 */
export const EXAMPLES_GUIDE = `
# 💬 Example Queries - Get Started Fast

## 🏠 Finding Homes

**Basic Search**:
- "Show me homes in Palm Desert"
- "What's available in Indian Wells?"
- "Homes for sale in La Quinta"

**With Filters**:
- "3 bedroom homes under $700k in Palm Springs"
- "4 bed, 3 bath homes with a pool in Rancho Mirage"
- "Single-family homes between $500k-$900k in Cathedral City"

**New Listings**:
- "New listings in Palm Desert this week"
- "Latest homes in La Quinta"
- "What's new in Indian Wells from the past month?"

**Amenities**:
- "Homes with pools in PGA West"
- "Mountain view properties in Indian Wells"
- "Gated communities in Palm Desert"

**Property Types**:
- "Condos under $400k in Palm Springs"
- "Townhomes in La Quinta"
- "Single-family homes in Cathedral City"

## 📊 Market Research

**Appreciation & Trends**:
- "How much have homes appreciated in Palm Springs?"
- "Show me 10-year market trends for Indian Wells"
- "Is the La Quinta market going up or down?"
- "Investment potential of Rancho Mirage"

**Market Statistics**:
- "How fast do homes sell in Palm Desert?"
- "Average price per square foot in Indian Wells?"
- "What are property taxes like in La Quinta?"
- "HOA fees in PGA West?"
- "Market stats for Palm Springs"

**Regional Overview**:
- "Show me new listings in the Coachella Valley"
- "Compare all desert cities"
- "What's the median price across the valley?"
- "Which city has the most new listings?"

## 🏘️ Neighborhood Info

**General Info**:
- "Tell me about PGA West"
- "What's Indian Wells Country Club like?"
- "Information about The Vintage Club"

**Subdivision Search**:
- "Find subdivisions with 'vintage' in the name"
- "Neighborhoods in Palm Desert"
- "Communities in Indian Wells"

**Browse Options**:
- "Show me Palm Desert neighborhoods page"
- "Browse subdivisions in Indian Wells"
- "Link to La Quinta communities"

## 📝 Real Estate Knowledge

**Buying/Selling**:
- "Tips for first-time home buyers"
- "What are the hidden costs of homeownership?"
- "How to prepare my home for sale"

**Local Insights**:
- "Energy costs in Coachella Valley"
- "Property taxes in Palm Springs"
- "HOA fees explained"
- "What to know about desert living"

**Market Insights**:
- "Current market conditions in the valley"
- "Best time to buy a home"
- "Is now a good time to sell?"

## 🎯 Advanced Queries

**Multi-Filter Search**:
- "4+ bed homes under $1M with pool and mountain views in Indian Wells"
- "New single-family listings in gated communities in Palm Desert from the past 2 weeks"
- "3 bed condos built after 2010 with low HOA fees in Palm Springs"

**Comparative Analysis**:
- "Compare Palm Desert vs Indian Wells market stats"
- "Show me appreciation for Palm Springs and La Quinta"
- "Price per sqft in Rancho Mirage vs Cathedral City"

**Investment Analysis**:
- "Best ROI neighborhoods in Coachella Valley"
- "Which city has the highest appreciation?"
- "Market trends for investment properties in the desert"

---

**Remember**: These are just examples! I understand natural language, so feel free to ask in your own words. I'll figure out what you need and use the right tools to help you.

Type \`help\` to see the main directory, or just start asking questions!
`;

/**
 * Detect if user is requesting help
 * Returns the type of help requested or null
 */
export function isHelpCommand(message: string): string | null {
  const normalized = message.toLowerCase().trim();

  // Technical/Developer Help
  if (normalized === '/**help' || normalized === 'technical help' || normalized === 'dev help' || normalized === 'developer help') {
    return 'technical';
  }

  // Customer-Friendly Help (main help)
  if (normalized === 'help' || normalized === 'get started' || normalized === 'what can you do' || normalized === 'what can you do?' || normalized === '?') {
    return 'help';
  }

  // Natural language help requests
  if (normalized.includes('how do i') || normalized.includes('how can i') || normalized.includes('how to use')) {
    return 'help';
  }

  // Examples
  if (normalized === 'examples' || normalized === 'samples' || normalized === 'show examples') {
    return 'examples';
  }

  // Old tools reference (keep for backwards compatibility)
  if (normalized === 'tools' || normalized === 'commands' || normalized === 'ls') {
    return 'tools';
  }

  return null;
}

/**
 * Get the appropriate help content based on command type
 */
export function getHelpContent(command: string): string {
  switch (command) {
    case 'help':
      return CUSTOMER_HELP;
    case 'technical':
      return TECHNICAL_HELP;
    case 'tools':
      return TOOLS_REFERENCE;
    case 'examples':
      return EXAMPLES_GUIDE;
    default:
      return CUSTOMER_HELP;
  }
}
