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

// Safe carousel parsing - handle both formats
try {
  // Try format with closing tag first: [LISTING_CAROUSEL]...[/LISTING_CAROUSEL]
  // Using [\s\S] instead of . with /s flag for compatibility
  let carouselMatch = content.match(/\[LISTING_CAROUSEL\]([\s\S]*?)\[\/LISTING_CAROUSEL\]/);

  // If not found, try format without closing tag: [LISTING_CAROUSEL]\n{...}
  if (!carouselMatch) {
    const startMarker = content.indexOf('[LISTING_CAROUSEL]');
    if (startMarker !== -1) {
      const jsonStart = content.indexOf('{', startMarker);
      if (jsonStart !== -1) {
        // Find the matching closing brace
        let braceCount = 0;
        let jsonEnd = jsonStart;
        for (let i = jsonStart; i < content.length; i++) {
          if (content[i] === '{') braceCount++;
          if (content[i] === '}') braceCount--;
          if (braceCount === 0) {
            jsonEnd = i + 1;
            break;
          }
        }
        const jsonStr = content.substring(jsonStart, jsonEnd);
        carousel = JSON.parse(jsonStr);
      }
    }
  } else {
    carousel = JSON.parse(carouselMatch[1]);
  }

  // Validate structure
  if (carousel && (!carousel.listings || !Array.isArray(carousel.listings))) {
    console.error("Invalid carousel structure - missing or invalid listings array");
    carousel = null;
  }
} catch (e) {
  console.error("Carousel parse error:", e);
  carousel = null;
}

  // Safe map parsing
  try {
    // Using [\s\S] instead of . with /s flag for compatibility
    const mapMatch = content.match(/\[MAP_VIEW\]([\s\S]*?)\[\/MAP_VIEW\]/);
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
    .replace(/\[LISTING_CAROUSEL\][\s\S]*?\[\/LISTING_CAROUSEL\]/g, '')
    .replace(/\[MAP_VIEW\][\s\S]*?\[\/MAP_VIEW\]/g, '')
    .trim();

  return { text: cleanText, carousel, map };
}
