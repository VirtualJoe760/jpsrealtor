// src/lib/domain-classify.ts
// Client-safe domain classification — no next/headers import.
// Use this in client components. For server components, use domain-utils.ts instead.

const JPS_DOMAINS = new Set([
  "jpsrealtor.com",
  "www.jpsrealtor.com",
  "josephsardella.com",
  "www.josephsardella.com",
]);

const PLATFORM_DOMAINS = new Set([
  "chatrealty.io",
  "www.chatrealty.io",
]);

function normalize(host: string): string {
  return host.split(":")[0].toLowerCase();
}

export function isOwnerDomain(hostname: string): boolean {
  return JPS_DOMAINS.has(normalize(hostname));
}

export function isPlatformDomain(hostname: string): boolean {
  return PLATFORM_DOMAINS.has(normalize(hostname));
}

/**
 * Get the default site name for display on the chat page based on hostname.
 * - jpsrealtor.com / josephsardella.com → "JPSREALTOR"
 * - chatrealty.io / agent subdomains / everything else → "chatRealty"
 */
export function getDefaultSiteName(hostname: string): string {
  return isOwnerDomain(hostname) ? "JPSREALTOR" : "chatRealty";
}
