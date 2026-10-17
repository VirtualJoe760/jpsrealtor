// src/lib/mls-feed-constants.ts
//
// Constants shared by the server (src/lib/mls-feed.ts, which pulls in mongoose)
// and the browser (the MLS Data Feed card). Kept dependency-free on purpose.

/**
 * The field associations are grouped on — the same one @chatrealty/sync's
 * RESO_NETWORKS filters (`networkField` default in reso-fetch.ts), so what the
 * agent picks means exactly what it means to the sync. It names the MLS a
 * listing originates from. NOT ListOfficeAOR / ListAgentAOR: those name the
 * listing office's REALTOR association, and filtering a site on them would hide
 * valid MLS listings (GPS tags both "California Desert Association of Realtors"
 * and "Greater Palm Springs Realtors" inside one MLS).
 */
export const NETWORK_FIELD = "OriginatingSystemName";

/** Measured on GPS/Spark with raw payload retention (data-tiers.md). */
export const DEFAULT_BYTES_PER_LISTING = 20 * 1024;

/** The nightly update runs for every agent at this hour (America/Los_Angeles). */
export const NIGHTLY_SYNC_LABEL = "every night around 3 AM Pacific";
