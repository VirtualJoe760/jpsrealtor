// src/lib/message-parser.ts
// Parse AI responses for component markers [LISTING_CAROUSEL] and [MAP_VIEW]

export interface ParsedMessage {
  text: string;
  carousel: {
    title: string;
    listings: any[];
  } | null;
  map: {
    listings: any[];
    center: { lat: number; lng: number };
    zoom: number;
  } | null;
}

/**
 * Parse AI response content for component markers
 * Extracts [LISTING_CAROUSEL] and [MAP_VIEW] JSON data and returns cleaned text
 */
export function parseAIResponse(content: string): ParsedMessage {
  let carousel = null;
  let map = null;

  // Safe carousel parsing
  try {
    const carouselMatch = content.match(/\[LISTING_CAROUSEL\](.*?)\[\/LISTING_CAROUSEL\]/s);
    if (carouselMatch) {
      carousel = JSON.parse(carouselMatch[1]);
      // Validate structure
      if (!carousel.listings || !Array.isArray(carousel.listings)) {
        console.error("Invalid carousel structure - missing or invalid listings array");
        carousel = null;
      }
    }
  } catch (e) {
    console.error("Carousel parse error:", e);
    carousel = null;
  }

  // Safe map parsing
  try {
    const mapMatch = content.match(/\[MAP_VIEW\](.*?)\[\/MAP_VIEW\]/s);
    if (mapMatch) {
      map = JSON.parse(mapMatch[1]);
      // Validate structure
      if (!map.listings || !Array.isArray(map.listings)) {
        console.error("Invalid map structure - missing or invalid listings array");
        map = null;
      }
    }
  } catch (e) {
    console.error("Map parse error:", e);
    map = null;
  }

  // Always return clean text even if parsing fails
  const cleanText = content
    .replace(/\[LISTING_CAROUSEL\].*?\[\/LISTING_CAROUSEL\]/gs, '')
    .replace(/\[MAP_VIEW\].*?\[\/MAP_VIEW\]/gs, '')
    .trim();

  return { text: cleanText, carousel, map };
}
