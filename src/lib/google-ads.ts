// src/lib/google-ads.ts
// Google Ads conversion tracking via gtag
// Events are picked up by the linked GA4 tag (GT-MKB7FKDR)

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

function fireEvent(eventName: string, params?: Record<string, any>) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, params);
  }
}

// Lead form submissions (buy inquiry, sell inquiry, campaign forms, SMS opt-in)
export function trackGenerateLead(params?: {
  source?: string;
  value?: number;
  currency?: string;
}) {
  fireEvent("generate_lead", {
    event_category: "conversion",
    source: params?.source,
    value: params?.value,
    currency: params?.currency || "USD",
  });
}

// User registration
export function trackSignUp(method?: string) {
  fireEvent("sign_up", {
    event_category: "conversion",
    method: method || "email",
  });
}

// Property listing page view
export function trackViewListing(params?: {
  listingKey?: string;
  address?: string;
  price?: number;
  city?: string;
  subdivision?: string;
}) {
  fireEvent("view_listing", {
    event_category: "engagement",
    listing_key: params?.listingKey,
    address: params?.address,
    value: params?.price,
    currency: "USD",
    city: params?.city,
    subdivision: params?.subdivision,
  });
}

// Click-to-call
export function trackClickToCall(params?: {
  phoneNumber?: string;
  source?: string;
}) {
  fireEvent("click_to_call", {
    event_category: "conversion",
    phone_number: params?.phoneNumber,
    source: params?.source,
  });
}
