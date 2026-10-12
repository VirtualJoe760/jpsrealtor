// src/lib/meta-pixel.ts
// Meta Pixel (Facebook Pixel) integration for retargeting campaigns

declare global {
  interface Window {
    // Meta's fbq is variadic: track(cmd, event, params), set(cmd, key, value, pixelId), init(cmd, pixelId)…
    fbq?: (command: string, ...args: any[]) => void;
  }
}

// Platform fallback. Per-tenant IDs come from agentProfile.tracking.metaPixelId
// and are passed in at init time, because this module is loaded in the browser
// where only NEXT_PUBLIC_* env vars exist and they are the same for every tenant.
export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";

// The pixel actually in use for this request's tenant. Set by initMetaPixel so
// that pageView()/trackEvent() report against the agent's own pixel rather than
// the platform's — without it, every agent site fed one shared audience.
let activePixelId = FB_PIXEL_ID;

export const getActivePixelId = () => activePixelId;

// Initialize Meta Pixel
export const initMetaPixel = (pixelId?: string) => {
  const id = (pixelId || "").trim() || FB_PIXEL_ID;
  if (!id) {
    console.warn("Meta Pixel ID not found. Skipping initialization.");
    return;
  }
  activePixelId = id;

  (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod
        ? n.callMethod.apply(n, arguments)
        : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(
    window,
    document,
    "script",
    "https://connect.facebook.net/en_US/fbevents.js"
  );

  // Disable autoConfig BEFORE init. With autoConfig on (the default), Meta's pixel
  // auto-collects page metadata — including the URL query string — and transmits it as
  // event parameters, bypassing the pageView()/trackEvent() lat/lng guards below. On the
  // map view (/chap?view=map&lat=…&lng=…) that auto-collection is what kept tripping Meta's
  // "parameters blocked by Meta" warnings (lat & lng) even after manual events were suppressed.
  // Turning autoConfig off means only the events we explicitly fire reach Meta.
  window.fbq?.("set", "autoConfig", false, id);

  window.fbq?.("init", id);
  // Initial PageView is dispatched by MetaPixel.tsx so it goes through the lat/lng guard.
};

// NOTE: there is deliberately no lat/lng suppression here any more.
//
// fbq always attaches event_source_url = window.location.href, and MapLayer writes
// lat/lng into the URL on every pan/zoom (on /chap and on /). Gating events on those
// params therefore silenced the pixel across the entire map experience and the
// homepage — every Lead, ViewContent and Search fired from there was dropped before
// it left the browser. Meta strips suspected PII from event_source_url on their side
// and still records the event, so the gate destroyed data to avoid a cosmetic
// Events Manager warning.
//
// The real protection is autoConfig: false in initMetaPixel() above, which stops the
// query string being collected as event parameters in the first place. Keep it off.

// Track page view
export const pageView = () => {
  if (window.fbq) {
    window.fbq("track", "PageView");
  }
};

// Track standard events
export const trackEvent = (name: string, options: Record<string, any> = {}) => {
  if (window.fbq) {
    window.fbq("track", name, options);
  }
};

// Custom event: View Listing
export const trackViewContent = (listing: {
  listingKey: string;
  address?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  city?: string;
  subdivision?: string;
}) => {
  trackEvent("ViewContent", {
    content_ids: [listing.listingKey],
    content_type: "property",
    content_name: listing.address || "Property",
    value: listing.price || 0,
    currency: "USD",
    content_category: "real_estate",
    city: listing.city,
    subdivision: listing.subdivision,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
  });
};

// Custom event: Add to Favorites
export const trackAddToWishlist = (listing: {
  listingKey: string;
  address?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  city?: string;
  subdivision?: string;
}) => {
  trackEvent("AddToWishlist", {
    content_ids: [listing.listingKey],
    content_type: "property",
    content_name: listing.address || "Property",
    value: listing.price || 0,
    currency: "USD",
    content_category: "real_estate",
    city: listing.city,
    subdivision: listing.subdivision,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
  });
};

// Custom event: Contact (when user books appointment or contacts)
export const trackLead = (data?: {
  listingKey?: string;
  address?: string;
  contactType?: string;
}) => {
  trackEvent("Lead", {
    content_ids: data?.listingKey ? [data.listingKey] : [],
    content_name: data?.address || "Contact Form",
    content_category: data?.contactType || "general_inquiry",
  });
};

// Custom event: Search
export const trackSearch = (searchParams: {
  searchString?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
}) => {
  trackEvent("Search", {
    search_string: searchParams.searchString || "",
    content_category: "property_search",
    city: searchParams.city,
    value: searchParams.maxPrice || searchParams.minPrice || 0,
    currency: "USD",
  });
};

// Custom event: Complete Registration
export const trackCompleteRegistration = (method?: string) => {
  trackEvent("CompleteRegistration", {
    content_name: method || "email",
    status: "completed",
  });
};

// Custom event: View Top Listings (for retargeting)
// This tracks when users view their favorite listings
export const trackViewTopListings = (listings: Array<{
  listingKey: string;
  price?: number;
}>) => {
  const contentIds = listings.map(l => l.listingKey);
  const totalValue = listings.reduce((sum, l) => sum + (l.price || 0), 0);

  trackEvent("ViewContent", {
    content_ids: contentIds,
    content_type: "product_group",
    content_name: "Top Favorite Listings",
    value: totalValue,
    currency: "USD",
    content_category: "favorites_collection",
    num_items: listings.length,
  });
};

// Custom event: View City page (for retargeting)
//
// Deliberately NOT routed through trackViewContent: that helper stamps
// content_type "property" and a listingKey, so a city would enter the audience
// as a listing that no catalog can ever match. A city is a place — the intent
// signal worth retargeting is "shopping this market", not "viewed this home".
export const trackViewCity = (city: {
  name: string;
  county?: string;
  listingCount?: number;
}) => {
  trackEvent("ViewContent", {
    content_ids: [`city:${city.name}`],
    content_type: "destination",
    content_name: city.name,
    content_category: "city",
    city: city.name,
    region: city.county,
    num_items: city.listingCount ?? 0,
  });
};

// Custom event: View Article (for retargeting)
//
// content_category carries the article's own category so audiences can be built
// per topic — a buyer reading financing guides is a different campaign from a
// seller reading market reports. Articles are the highest-CTR pages on the site
// (1.74% vs 0.35% for city pages), so this is the cheapest audience to fill.
export const trackViewArticle = (article: {
  slug: string;
  title?: string;
  category?: string;
}) => {
  trackEvent("ViewContent", {
    content_ids: [`article:${article.slug}`],
    content_type: "article",
    content_name: article.title || article.slug,
    content_category: article.category || "insights",
  });
};
