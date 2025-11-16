// src/lib/activity-tracker.ts
// Client-side activity tracking utilities

// Generate a session ID for the current browsing session
export function getSessionId(): string {
  if (typeof window === "undefined") return "";

  let sessionId = sessionStorage.getItem("sessionId");

  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    sessionStorage.setItem("sessionId", sessionId);
  }

  return sessionId;
}

// Get anonymous ID from localStorage
export function getAnonymousId(): string {
  if (typeof window === "undefined") return "";

  let anonymousId = localStorage.getItem("anonymousId");

  if (!anonymousId) {
    anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    localStorage.setItem("anonymousId", anonymousId);
  }

  return anonymousId;
}

// Detect device type
export function getDeviceType(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";

  const width = window.innerWidth;
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

// Track search activity
export async function trackSearch(params: {
  queryText?: string;
  filters: Record<string, any>;
  resultsCount: number;
  source?: "map" | "list" | "homepage" | "direct";
}) {
  try {
    const sessionId = getSessionId();
    const anonymousId = getAnonymousId();
    const deviceType = getDeviceType();

    await fetch("/api/activity/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        anonymousId,
        deviceType,
        ...params,
        timestamp: Date.now(),
      }),
    });
  } catch (error) {
    console.error("Failed to track search:", error);
  }
}

// Track listing view
export async function trackListingView(params: {
  listingKey: string;
  listingData: Record<string, any>;
  timeSpent?: number;
  photosViewed?: number;
  scrollDepth?: number;
  viewSource: "search" | "map" | "swipe" | "direct" | "favorite";
  previousListingKey?: string;
}) {
  try {
    const sessionId = getSessionId();
    const anonymousId = getAnonymousId();
    const deviceType = getDeviceType();

    await fetch("/api/activity/listing-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        anonymousId,
        deviceType,
        ...params,
        timestamp: Date.now(),
      }),
    });
  } catch (error) {
    console.error("Failed to track listing view:", error);
  }
}

// Track page view
export async function trackPageView(params: {
  url: string;
  timeSpent?: number;
}) {
  try {
    const sessionId = getSessionId();
    const anonymousId = getAnonymousId();

    await fetch("/api/activity/page-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        anonymousId,
        ...params,
        timestamp: Date.now(),
      }),
    });
  } catch (error) {
    console.error("Failed to track page view:", error);
  }
}

// Track session start
export async function trackSessionStart(entryPage: string) {
  try {
    const sessionId = getSessionId();
    const anonymousId = getAnonymousId();
    const deviceType = getDeviceType();

    await fetch("/api/activity/session-start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        anonymousId,
        deviceType,
        entryPage,
        timestamp: Date.now(),
      }),
    });
  } catch (error) {
    console.error("Failed to track session start:", error);
  }
}

// Track session update (heartbeat)
export async function trackSessionUpdate(metrics: {
  pagesViewed?: number;
  listingsViewed?: number;
  searchesPerformed?: number;
  listingsSwiped?: number;
  listingsLiked?: number;
  listingsDisliked?: number;
}) {
  try {
    const sessionId = getSessionId();

    await fetch("/api/activity/session-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        ...metrics,
        timestamp: Date.now(),
      }),
    });
  } catch (error) {
    console.error("Failed to update session:", error);
  }
}

// Update user activity metrics (favorites count, last activity)
export async function updateUserActivityMetrics(anonymousId?: string) {
  try {
    await fetch("/api/activity/update-user-metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        anonymousId: anonymousId || getAnonymousId(),
        timestamp: Date.now(),
      }),
    });
  } catch (error) {
    console.error("Failed to update user metrics:", error);
  }
}
