// src/lib/signout-chain.ts
// Cross-domain signout orchestration.
//
// Every platform apex (chatrealty.io, jpsrealtor.com, josephsardella.com) holds
// its own NextAuth session cookie because cookies don't cross origins. Signing
// out on one domain leaves the others authenticated. To actually log a user
// out everywhere, we chain through each domain's /api/auth/signout-chain
// endpoint, clearing cookies along the way, then land on /auth/signed-out.

// Apex domains the chain must always visit. Each apex's signout-chain
// endpoint clears both the host-only and the .{apex}-scoped session cookie
// for that apex.
const PLATFORM_APEXES = [
  "chatrealty.io",
  "jpsrealtor.com",
  "josephsardella.com",
] as const;

const SUCCESS_PATH = "/auth/signed-out";

/**
 * Build the fully nested chain URL. The browser follows each redirect in
 * turn, hitting every apex's signout-chain endpoint with the next link
 * embedded in `?next=`. The final hop lands on /auth/signed-out on the
 * origin the user started from.
 *
 * Why visit the current host in addition to the apexes: NextAuth's default
 * signin sets a HOST-ONLY cookie (no Domain attribute). On an agent
 * subdomain like `bethanyklier.chatrealty.io`, that cookie isn't reached
 * by the chatrealty.io hop's `Domain=.chatrealty.io` clear. We have to
 * issue a clear request whose Host header is `bethanyklier.chatrealty.io`
 * to evict the host-only cookie there.
 *
 * Why land on the current origin: signing out from bethanyklier should
 * leave you on bethanyklier (her brand, her contact info), not bounce you
 * to jpsrealtor.
 */
export function getSignOutChainUrl(): string {
  if (typeof window === "undefined") return SUCCESS_PATH;

  const isProd = window.location.protocol === "https:";
  const currentOrigin = window.location.origin;
  const currentHost = window.location.hostname;

  if (!isProd) {
    return `${currentOrigin}/api/auth/signout-chain?next=${encodeURIComponent(
      `${currentOrigin}${SUCCESS_PATH}`
    )}`;
  }

  // Build the list of hosts the chain must hit. Always all platform apexes,
  // plus the current host if it's a chatrealty subdomain that wouldn't be
  // covered by the apex hops alone. Use a Set to dedupe in case the current
  // host is already an apex (e.g. we're on chatrealty.io itself).
  const hosts = new Set<string>(PLATFORM_APEXES);
  if (currentHost.endsWith(".chatrealty.io")) {
    hosts.add(currentHost);
  }

  const successUrl = `${currentOrigin}${SUCCESS_PATH}`;

  // Build the chain from the innermost (success URL) outward.
  let next = successUrl;
  const hostList = Array.from(hosts);
  for (let i = hostList.length - 1; i >= 0; i--) {
    const host = hostList[i];
    next = `https://${host}/api/auth/signout-chain?next=${encodeURIComponent(next)}`;
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
