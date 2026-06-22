// src/lib/meta-pixel.ts
// Meta Pixel (Facebook Pixel) integration for retargeting campaigns

declare global {
  interface Window {
    // Meta's fbq is variadic: track(cmd, event, params), set(cmd, key, value, pixelId), init(cmd, pixelId)…
    fbq?: (command: string, ...args: any[]) => void;
  }
}

export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";

// Initialize Meta Pixel
export const initMetaPixel = () => {
  if (!FB_PIXEL_ID) {
    console.warn("Meta Pixel ID not found. Skipping initialization.");
    return;
  }

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
  window.fbq?.("set", "autoConfig", false, FB_PIXEL_ID);

  window.fbq?.("init", FB_PIXEL_ID);
  // Initial PageView is dispatched by MetaPixel.tsx so it goes through the lat/lng guard.
};

// Meta flags lat/lng as PII. Suppress any Pixel event when those params are in the URL,
// because fbq always attaches event_source_url = window.location.href.
const hasBlockedUrlParams = (): boolean => {
  if (typeof window === "undefined") return false;
  const params = new URL(window.location.href).searchParams;
  return params.has("lat") || params.has("lng");
};

// Track page view
export const pageView = () => {
  if (hasBlockedUrlParams()) return;
  if (window.fbq) {
    window.fbq("track", "PageView");
  }
};

// Track standard events
export const trackEvent = (name: string, options: Record<string, any> = {}) => {
  if (hasBlockedUrlParams()) return;
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
