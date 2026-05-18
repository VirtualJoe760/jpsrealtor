// src/lib/signout-chain.ts
// Cross-domain signout orchestration.
//
// Every platform apex (chatrealty.io, jpsrealtor.com, josephsardella.com) holds
// its own NextAuth session cookie because cookies don't cross origins. Signing
// out on one domain leaves the others authenticated. To actually log a user
// out everywhere, we chain through each domain's /api/auth/signout-chain
// endpoint, clearing cookies along the way, then land on /auth/signed-out.

// Apex domains the chain must visit, in order. Each one's signout-chain
// endpoint will clear both the host-only and the .{apex}-scoped session cookie.
const PLATFORM_APEXES = [
  "chatrealty.io",
  "jpsrealtor.com",
  "josephsardella.com",
] as const;

// Final landing page after the chain completes.
const SUCCESS_APEX = "jpsrealtor.com";
const SUCCESS_PATH = "/auth/signed-out";

/**
 * Build the fully nested chain URL. The browser will follow each redirect in
 * turn, hitting every apex's signout-chain endpoint with the next link
 * embedded in `?next=`. The final hop lands on the signed-out page.
 *
 * In dev (localhost) we don't have multiple apexes, so the chain collapses to
 * a single hop straight to the signed-out page.
 */
export function getSignOutChainUrl(): string {
  if (typeof window === "undefined") return SUCCESS_PATH;

  const isProd = window.location.protocol === "https:";
  if (!isProd) {
    const origin = window.location.origin;
    return `${origin}/api/auth/signout-chain?next=${encodeURIComponent(
      `${origin}${SUCCESS_PATH}`
    )}`;
  }

  const successUrl = `https://${SUCCESS_APEX}${SUCCESS_PATH}`;

  // Build the chain from the innermost (success URL) outward.
  let next = successUrl;
  for (let i = PLATFORM_APEXES.length - 1; i >= 0; i--) {
    const apex = PLATFORM_APEXES[i];
    next = `https://${apex}/api/auth/signout-chain?next=${encodeURIComponent(next)}`;
  }
  return next;
}

/**
 * Trigger the multi-domain signout. Call this anywhere the UI currently
 * calls next-auth/react's signOut(). The browser will follow the chain,
 * clearing the session cookie on every platform apex before landing on
 * the signed-out page.
 */
export function signOutChain(): void {
  if (typeof window === "undefined") return;
  window.location.href = getSignOutChainUrl();
}
