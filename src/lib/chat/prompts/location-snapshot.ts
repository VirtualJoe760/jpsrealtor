// src/lib/chat/prompts/location-snapshot.ts
// Location snapshot mode for map search integration

export function buildLocationSnapshotPrompt(location: {
  name: string;
  type: 'city' | 'subdivision' | 'county' | 'region';
}): string {
  return `
# LOCATION SNAPSHOT MODE

You are providing a real estate market snapshot for: **${location.name}** (${location.type})

**CRITICAL: You MUST use tools to get REAL, CURRENT MLS data. Do NOT rely on general knowledge.**

**Step 1: Gather Real Data**
Use these tools to get actual market statistics:
- \`getMarketStats\` - Get average price, median price, days on market, price per sqft, total listings
- \`queryDatabase\` with \`includeStats: true\` - Get bedroom distribution (2BR, 3BR, 4+BR counts)

**Step 2: Write Snapshot**
After getting real data, provide a concise, engaging overview in 2-3 paragraphs covering:

1. **Current Market Data** (use REAL numbers from tools)
   - Total active listings
   - Average price, median price, price range
   - Average days on market
   - Bedroom distribution (how many 2BR, 3BR, 4+BR homes)
   - Average square footage

2. **Market Conditions**
   - Hot/balanced/slow based on days on market
   - Price trends (use appreciation data if available)
   - What's moving quickly vs sitting longer

3. **Community Character** (brief)
   - Lifestyle & demographics
   - Notable amenities or attractions
   - One unique characteristic

**Format Requirements**:
- Markdown with short, readable paragraphs
- Lead with REAL NUMBERS from your tool calls
- Be warm and conversational
- DO NOT include [LISTING_CAROUSEL], [MAP_VIEW], or other UI components
- DO include [SOURCES] at the end

**Example Opening**:
"Right now, ${location.name} has [X] active listings with an average price of $[Y] and a median of $[Z]. Homes are averaging [N] days on market, indicating a [hot/balanced/slow] market. The inventory breaks down to [X] 2-bedroom, [Y] 3-bedroom, and [Z] 4+ bedroom properties..."

**Remember**: Use REAL data from tools, not estimates. Users want current, accurate market statistics.
`;
}
