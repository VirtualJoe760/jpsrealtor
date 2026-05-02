// src/lib/domain-classify.ts
// Client-safe domain classification — no next/headers import.
// Use this in client components. For server components, use domain-utils.ts instead.

const PLATFORM_DOMAINS = new Set([
  "chatrealty.io",
  "www.chatrealty.io",
]);

function normalize(host: string): string {
  return host.split(":")[0].toLowerCase();
}

export function isPlatformDomain(hostname: string): boolean {
  return PLATFORM_DOMAINS.has(normalize(hostname));
}

export function isAgentDomain(hostname: string): boolean {
  const h = normalize(hostname);
  return !PLATFORM_DOMAINS.has(h) && h !== "localhost";
}

/**
 * Get the default site name for display on the chat page based on hostname.
 * All domains use "chatRealty" as the default site name now.
 * Agent-specific branding is loaded from the DB via getDomainConfigFromHeaders().
 */
export function getDefaultSiteName(_hostname: string): string {
  return "chatRealty";
}
