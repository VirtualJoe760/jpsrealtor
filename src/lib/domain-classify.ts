// src/lib/domain-classify.ts
// Client-safe domain classification — no next/headers import.
// Use this in client components. For server components, use domain-utils.ts instead.

const PLATFORM_DOMAINS = new Set([
  "chatrealty.io",
  "www.chatrealty.io",
  // Dev: the proxy treats any host containing "chatrealty" with no subdomain
  // as the platform, so http://chatrealty.localhost:3000 previews chatrealty.io
  // locally. Listing it here keeps the CLIENT-side check agreeing with the
  // proxy — otherwise the platform preview renders the primary agent's nav
  // logo instead of the ChatRealty wordmark. Bare `localhost` is deliberately
  // NOT here: it resolves to the primary agent, which is how jpsrealtor.com is
  // previewed.
  "chatrealty.localhost",
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
