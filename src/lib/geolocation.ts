// src/lib/geolocation.ts
// IP geolocation utilities

export interface LocationInfo {
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

/**
 * Get user's approximate location from IP address
 * Uses ipapi.co free tier (1000 requests/day)
 */
export async function getUserLocation(): Promise<LocationInfo | null> {
  try {
    const response = await fetch("https://ipapi.co/json/");
    if (!response.ok) {
      console.warn("IP geolocation failed:", response.status);
      return null;
    }

    const data = await response.json();

    return {
      city: data.city,
      region: data.region,
      country: data.country_name,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone,
    };
  } catch (error) {
    console.error("Error fetching user location:", error);
    return null;
  }
}

/**
 * Get cached location from localStorage (to avoid API rate limits)
 */
export function getCachedLocation(): LocationInfo | null {
  if (typeof window === "undefined") return null;

  try {
    const cached = localStorage.getItem("userLocation");
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    // Cache for 24 hours
    if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
      return parsed.location;
    }

    // Cache expired
    localStorage.removeItem("userLocation");
    return null;
  } catch {
    return null;
  }
}

/**
 * Set cached location
 */
export function setCachedLocation(location: LocationInfo): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    "userLocation",
    JSON.stringify({
      location,
      timestamp: Date.now(),
    })
  );
}

/**
 * Get location with caching
 */
export async function getLocationWithCache(): Promise<LocationInfo | null> {
  // Try cache first
  const cached = getCachedLocation();
  if (cached) return cached;

  // Fetch fresh data
  const location = await getUserLocation();
  if (location) {
    setCachedLocation(location);
  }

  return location;
}

/**
 * Determine if user is in Southern California
 */
export function isInSouthernCalifornia(location: LocationInfo | null): boolean {
  if (!location) return false;

  const socalCities = [
    "los angeles",
    "san diego",
    "palm springs",
    "palm desert",
    "riverside",
    "san bernardino",
    "orange",
    "anaheim",
    "irvine",
    "temecula",
    "murrieta",
    "rancho cucamonga",
    "ontario",
    "corona",
    "moreno valley",
    "fontana",
    "oceanside",
    "carlsbad",
    "vista",
    "santa ana",
    "huntington beach",
    "newport beach",
    "laguna beach",
  ];

  const city = location.city?.toLowerCase() || "";
  const region = location.region?.toLowerCase() || "";

  return (
    region === "california" &&
    (socalCities.some((c) => city.includes(c)) ||
      city.includes("coachella valley"))
  );
}
