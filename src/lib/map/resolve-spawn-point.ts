// src/lib/map/resolve-spawn-point.ts
//
// Determines where the background map should spawn on first open of
// a fresh chat session. Replaces the hardcoded California-overview
// default (37.0, -119.5, zoom 5) — that view was useless for a
// regional brokerage focused on the Coachella Valley.
//
// Resolution order:
//   1. Browser geolocation (navigator.geolocation), if granted AND
//      coords fall inside the California bounding box → spawn at user.
//   2. Else (denied / outside CA / timeout / no geolocation API) →
//      spawn at Palm Desert (Highway 111 / El Paseo).
//
// The browser permission prompt fires on the first call to
// getCurrentPosition. If the user denies it, the catch path returns
// Palm Desert without any UI work — same path as outside-CA.
//
// Map state for an active chat session is stored in sessionStorage
// under `mapViewState`; clearing the chat (resetMapState) wipes that
// key so the next map open re-runs this resolver.

export interface SpawnPoint {
  lat: number;
  lng: number;
  zoom: number;
}

// Palm Desert default — 33.7222, -116.3744 lands roughly at El Paseo
// & Highway 111. Zoom 10 gives the user a wider initial view; they
// can pinch/scroll in to whatever density they want.
export const PALM_DESERT: SpawnPoint = {
  lat: 33.7222,
  lng: -116.3744,
  zoom: 10,
};

// California bounding box. Approximate but generous — better to
// false-positive (e.g. someone right at the Nevada border still
// gets their location) than reject a legitimate CA user. The
// official CA boundary is irregular; a true polygon test isn't
// worth the cost for a "should we spawn here" decision.
const CA_BBOX = {
  minLat: 32.5,   // ~Tijuana / Mexican border
  maxLat: 42.0,   // ~Oregon border
  minLng: -124.5, // ~Pacific coast
  maxLng: -114.1, // ~Nevada / Arizona border
};

function isInsideCalifornia(lat: number, lng: number): boolean {
  return (
    lat >= CA_BBOX.minLat &&
    lat <= CA_BBOX.maxLat &&
    lng >= CA_BBOX.minLng &&
    lng <= CA_BBOX.maxLng
  );
}

// Default zoom when spawning at the user's actual location. Zoom 10
// gives them a wide regional view (whole metro-ish area) on first
// open — they can zoom in to the block-level detail themselves.
const USER_LOCATION_ZOOM = 10;

// Soft cap on the geolocation request so we don't hang the map open
// indefinitely if the user dismisses the prompt or has a slow GPS
// fix. 8s is long enough for honest-to-god first-fix on cold-start
// devices, short enough that a stalled prompt doesn't feel broken.
const GEO_TIMEOUT_MS = 8000;

export async function resolveSpawnPoint(): Promise<SpawnPoint> {
  // SSR / non-browser context (shouldn't happen here, but guard).
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    return PALM_DESERT;
  }

  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: GEO_TIMEOUT_MS,
        maximumAge: 5 * 60 * 1000, // 5min cache — fine for "where to spawn"
        enableHighAccuracy: false, // city-level is plenty
      })
    );

    const { latitude, longitude } = pos.coords;
    if (isInsideCalifornia(latitude, longitude)) {
      return { lat: latitude, lng: longitude, zoom: USER_LOCATION_ZOOM };
    }
    // Granted but out of state — Palm Desert is more useful than
    // dropping them in (say) Texas where we have zero inventory.
    return PALM_DESERT;
  } catch {
    // Denied, dismissed, timed out, or platform error. All paths
    // collapse to the same fallback — Palm Desert.
    return PALM_DESERT;
  }
}
