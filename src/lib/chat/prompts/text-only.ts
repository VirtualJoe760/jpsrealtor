// src/lib/chat/prompts/text-only.ts
// Text-only mode for map digests (background AI queries)

export function buildTextOnlyPrompt(): string {
  return `
# TEXT-ONLY MODE (Map Digest)

This is a background query while the user is viewing the map. Provide a concise, engaging markdown response about the location:

**Guidelines:**
- Write 2-3 short paragraphs in markdown format
- Include unique facts about the area (demographics, amenities, lifestyle)
- Mention market insights from our data (price trends, popular features)
- Use a warm, informative tone
- DO NOT include [LISTING_CAROUSEL] or other UI components
- DO include [SOURCES] block if you use market data

**Purpose:** User will read this when they switch from map to chat view, and it should spark questions/engagement.

**Example response:**
"Palm Springs is known for its mid-century modern architecture and desert lifestyle. The area attracts both retirees and young professionals who love the year-round sunshine.

The current market shows a median price of $725K, with strong demand for homes near the historic Tennis Club neighborhood. Most buyers are looking for properties with pool access and mountain views.

Fun fact: Palm Springs has over 300 days of sunshine per year and hosts the famous Modernism Week every February!"`;
}
