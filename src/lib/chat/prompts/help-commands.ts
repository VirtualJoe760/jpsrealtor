// src/lib/chat/prompts/help-commands.ts
// Help command system - directory-style tool discovery

/**
 * User-friendly help content for the AI assistant
 * Triggered when user types "help" or "ls"
 */
export const HELP_DIRECTORY = `
# 🏠 JPSRealtor AI Assistant - Available Commands

I have access to these tools to help you with real estate:

## 🔍 Search & Discovery

**🏘️ Property Search** - \`search [location]\` or just ask naturally
   Find homes by city, neighborhood, or ZIP code
   Examples:
   • "Show me homes in Palm Desert"
   • "3 bed, 2 bath homes under $800k in Indian Wells"
   • "New listings in La Quinta this week"

**📍 Neighborhood Info** - Ask about any area
   Get details about subdivisions, communities, and HOAs
   Examples:
   • "Tell me about PGA West"
   • "What's it like in Indian Wells Country Club?"
   • "Browse neighborhoods in Palm Desert"

**📝 Articles & Guides** - Ask questions about real estate topics
   Search our blog for expert advice and local insights
   Examples:
   • "What are the hidden costs of homeownership?"
   • "Tell me about energy costs in Coachella Valley"
   • "Tips for first-time home buyers"

## 📊 Market Analysis

**📈 Market Trends** - \`trends [location]\` or ask about the market
   Get appreciation data, price trends, and market health
   Examples:
   • "How much have homes appreciated in Palm Springs?"
   • "Is the Indian Wells market going up or down?"
   • "Show me 5-year trends for La Quinta"

**📉 Market Statistics** - Ask about market conditions
   Get days on market, price per sqft, HOA fees, property taxes
   Examples:
   • "How fast do homes sell in Palm Desert?"
   • "What's the average price per square foot in Rancho Mirage?"
   • "What are HOA fees like in PGA West?"

**🌴 Regional Overview** - \`regional stats\` or ask about Coachella Valley
   See all cities in the valley with breakdowns
   Examples:
   • "Show me new listings in Coachella Valley"
   • "Compare all desert cities"
   • "What's available in the valley?"

## 🎯 Specialized Tools

**🔎 Subdivision Lookup** - When you're not sure of exact names
   Fuzzy search for subdivision names
   Examples:
   • "Find subdivisions with 'vintage' in the name"
   • "Is there an Indian Wells Country Club?"

**🔗 Browse Pages** - Get direct links to explore
   Links to city and neighborhood pages
   Examples:
   • "Show me the Palm Desert neighborhoods page"
   • "Link to browse Orange County homes"

## 💡 Tips

• **Natural Language**: Just ask questions naturally - I'll figure out which tools to use!
• **Be Specific**: The more details you provide (beds, baths, price range), the better results
• **Filters**: I can search by property type, amenities (pool, spa, view), age, and more
• **Recent Listings**: Use words like "new", "latest", or "recent" to see just-listed homes
• **Compare**: Ask me to compare cities or neighborhoods for market analysis

## 🆘 Help Commands

• \`help\` or \`ls\` - Show this directory (what you're reading now!)
• \`tools\` - See detailed tool descriptions
• \`examples\` - Show example queries for each tool

---

**Ready to help!** What would you like to know about real estate in Southern California?
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
 * Detect if user is requesting help/directory
 */
export function isHelpCommand(message: string): string | null {
  const normalized = message.toLowerCase().trim();

  if (normalized === 'help' || normalized === 'ls' || normalized === '?') {
    return 'help';
  }

  if (normalized === 'tools' || normalized === 'commands') {
    return 'tools';
  }

  if (normalized === 'examples' || normalized === 'samples') {
    return 'examples';
  }

  return null;
}

/**
 * Get the appropriate help content based on command
 */
export function getHelpContent(command: string): string {
  switch (command) {
    case 'help':
      return HELP_DIRECTORY;
    case 'tools':
      return TOOLS_REFERENCE;
    case 'examples':
      return EXAMPLES_GUIDE;
    default:
      return HELP_DIRECTORY;
  }
}
