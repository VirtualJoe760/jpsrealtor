// src/lib/chat/response-parser.ts
// Response parsing utilities for chat AI

/**
 * Parse component markers from AI response and extract structured data
 */
export function parseComponentData(responseText: string): {
  carousel?: any;
  listView?: any;
  mapView?: any;
  articles?: any;
  appreciation?: any;
  comparison?: any;
  sources?: any;
  marketStats?: any;
  neighborhoodLink?: any;
} {
  const components: {
    carousel?: any;
    listView?: any;
    mapView?: any;
    articles?: any;
    appreciation?: any;
    comparison?: any;
    sources?: any;
    marketStats?: any;
    neighborhoodLink?: any;
  } = {};

  // Parse [LISTING_CAROUSEL]...[/LISTING_CAROUSEL]
  const carouselMatch = responseText.match(/\[LISTING_CAROUSEL\]\s*([\s\S]*?)\s*\[\/LISTING_CAROUSEL\]/);
  if (carouselMatch) {
    try {
      const jsonStr = carouselMatch[1].trim();
      components.carousel = JSON.parse(jsonStr);
      console.log("[PARSE] Found carousel with", components.carousel?.listings?.length || 0, "listings");
    } catch (e) {
      console.error("[PARSE] Failed to parse carousel JSON:", e);
    }
  }

  // Parse [LIST_VIEW]...[/LIST_VIEW]
  const listViewMatch = responseText.match(/\[LIST_VIEW\]\s*([\s\S]*?)\s*\[\/LIST_VIEW\]/);
  if (listViewMatch) {
    try {
      const jsonStr = listViewMatch[1].trim();
      components.listView = JSON.parse(jsonStr);
      console.log("[PARSE] Found list view with", components.listView?.listings?.length || 0, "listings");
    } catch (e) {
      console.error("[PARSE] Failed to parse list view JSON:", e);
    }
  }

  // Parse [MAP_VIEW]...[/MAP_VIEW]
  const mapMatch = responseText.match(/\[MAP_VIEW\]\s*([\s\S]*?)\s*\[\/MAP_VIEW\]/);
  if (mapMatch) {
    try {
      const jsonStr = mapMatch[1].trim();
      components.mapView = JSON.parse(jsonStr);
      console.log("[PARSE] Found map view with", components.mapView?.listings?.length || 0, "listings");
    } catch (e) {
      console.error("[PARSE] Failed to parse map view JSON:", e);
    }
  }

  // Parse [APPRECIATION]...[/APPRECIATION]
  const appreciationMatch = responseText.match(/\[APPRECIATION\]\s*([\s\S]*?)\s*\[\/APPRECIATION\]/);
  if (appreciationMatch) {
    try {
      const jsonStr = appreciationMatch[1].trim();
      components.appreciation = JSON.parse(jsonStr);
      console.log(
        "[PARSE] Found appreciation data for",
        components.appreciation?.location?.city ||
        components.appreciation?.location?.subdivision ||
        components.appreciation?.location?.county ||
        "location"
      );
    } catch (e) {
      console.error("[PARSE] Failed to parse appreciation JSON:", e);
    }
  }

  // Parse [COMPARISON]...[/COMPARISON]
  const comparisonMatch = responseText.match(/\[COMPARISON\]\s*([\s\S]*?)\s*\[\/COMPARISON\]/);
  if (comparisonMatch) {
    try {
      const jsonStr = comparisonMatch[1].trim();
      components.comparison = JSON.parse(jsonStr);
      console.log(
        "[PARSE] Found comparison data:",
        components.comparison?.location1?.name,
        "vs",
        components.comparison?.location2?.name
      );
    } catch (e) {
      console.error("[PARSE] Failed to parse comparison JSON:", e);
    }
  }

  // Parse [ARTICLE_RESULTS]...[/ARTICLE_RESULTS]
  const articleMatch = responseText.match(/\[ARTICLE_RESULTS\]\s*([\s\S]*?)\s*\[\/ARTICLE_RESULTS\]/);
  if (articleMatch) {
    try {
      const jsonStr = articleMatch[1].trim();
      components.articles = JSON.parse(jsonStr);
      console.log("[PARSE] Found article results with", components.articles?.results?.length || 0, "articles");
    } catch (e) {
      console.error("[PARSE] Failed to parse article results JSON:", e);
    }
  }

  // Parse [SOURCES]...[/SOURCES]
  const sourcesMatch = responseText.match(/\[SOURCES\]\s*([\s\S]*?)\s*\[\/SOURCES\]/);
  if (sourcesMatch) {
    try {
      const jsonStr = sourcesMatch[1].trim();
      components.sources = JSON.parse(jsonStr);
      console.log("[PARSE] Found", components.sources?.length || 0, "source citations");
    } catch (e) {
      console.error("[PARSE] Failed to parse sources JSON:", e);
    }
  }

  // Parse [MARKET_STATS]...[/MARKET_STATS]
  const marketStatsMatch = responseText.match(/\[MARKET_STATS\]\s*([\s\S]*?)\s*\[\/MARKET_STATS\]/);
  if (marketStatsMatch) {
    try {
      const jsonStr = marketStatsMatch[1].trim();
      components.marketStats = JSON.parse(jsonStr);
      console.log(
        "[PARSE] Found market stats for",
        components.marketStats?.location?.city ||
        components.marketStats?.location?.subdivision ||
        "location"
      );
    } catch (e) {
      console.error("[PARSE] Failed to parse market stats JSON:", e);
    }
  }

  // Parse [NEIGHBORHOOD_LINK]...[/NEIGHBORHOOD_LINK]
  const neighborhoodLinkMatch = responseText.match(/\[NEIGHBORHOOD_LINK\]\s*([\s\S]*?)\s*\[\/NEIGHBORHOOD_LINK\]/);
  if (neighborhoodLinkMatch) {
    try {
      const jsonStr = neighborhoodLinkMatch[1].trim();
      components.neighborhoodLink = JSON.parse(jsonStr);
      console.log(
        "[PARSE] Found neighborhood link:",
        components.neighborhoodLink?.title
      );
    } catch (e) {
      console.error("[PARSE] Failed to parse neighborhood link JSON:", e);
    }
  }

  return components;
}

/**
 * Remove component markers and JSON blocks, keeping only conversational text
 */
export function cleanResponseText(responseText: string): string {
  let cleaned = responseText;

  // Remove [LISTING_CAROUSEL]...[/LISTING_CAROUSEL] blocks
  cleaned = cleaned.replace(/\[LISTING_CAROUSEL\]\s*[\s\S]*?\s*\[\/LISTING_CAROUSEL\]/g, '');

  // Remove [LIST_VIEW]...[/LIST_VIEW] blocks
  cleaned = cleaned.replace(/\[LIST_VIEW\]\s*[\s\S]*?\s*\[\/LIST_VIEW\]/g, '');

  // Remove [SOURCES]...[/SOURCES] blocks
  cleaned = cleaned.replace(/\[SOURCES\]\s*[\s\S]*?\s*\[\/SOURCES\]/g, '');

  // Remove [MAP_VIEW]...[/MAP_VIEW] blocks
  cleaned = cleaned.replace(/\[MAP_VIEW\]\s*[\s\S]*?\s*\[\/MAP_VIEW\]/g, '');

  // Remove [APPRECIATION]...[/APPRECIATION] blocks
  cleaned = cleaned.replace(/\[APPRECIATION\]\s*[\s\S]*?\s*\[\/APPRECIATION\]/g, '');

  // Remove [COMPARISON]...[/COMPARISON] blocks
  cleaned = cleaned.replace(/\[COMPARISON\]\s*[\s\S]*?\s*\[\/COMPARISON\]/g, '');

  // Remove [ARTICLE_RESULTS]...[/ARTICLE_RESULTS] blocks
  cleaned = cleaned.replace(/\[ARTICLE_RESULTS\]\s*[\s\S]*?\s*\[\/ARTICLE_RESULTS\]/g, '');

  // Remove [MARKET_STATS]...[/MARKET_STATS] blocks
  cleaned = cleaned.replace(/\[MARKET_STATS\]\s*[\s\S]*?\s*\[\/MARKET_STATS\]/g, '');

  // Remove [NEIGHBORHOOD_LINK]...[/NEIGHBORHOOD_LINK] blocks
  cleaned = cleaned.replace(/\[NEIGHBORHOOD_LINK\]\s*[\s\S]*?\s*\[\/NEIGHBORHOOD_LINK\]/g, '');

  // Clean up extra whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}
