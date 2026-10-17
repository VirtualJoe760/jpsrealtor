// src/lib/agent-host.ts
//
// Where an agent's pages live, and how to get there and back. Pure and
// edge-safe — the proxy (middleware) and the auth routes share it so they can
// never disagree about which host is "the platform" and which is "the agent's".
//
// THE RULE (Joseph, 2026-10-16): a signed-in agent works on THEIR OWN
// subdomain — {slug}.chatrealty.io — not on www. That covers both an agent
// signing in themselves and an admin "Log in as {agent}": the whole session
// (dashboard, settings, Home) stays on the agent's site. Their portal links are
// all relative, so once the session lives on the subdomain, every click stays
// there by itself.
//
// Sessions on an agent subdomain are HOST-ONLY cookies: sent to that one site,
// never to www or to another agent's site — which matters because some agent
// subdomains are proxied to the agent's own external deployment.
//
// EXCEPTION (2026-10-17): an agent whose subdomain serves their own external
// site works on www. That host's /api belongs to their deployment, so the
// platform portal can't run there (isPlatformSurfacePath below).

/** Hosts that ARE the platform — where an agent is redirected away from. */
const PLATFORM_HUB_HOSTS = new Set(["chatrealty.io", "www.chatrealty.io", "chatrealty.localhost", "localhost"]);

export function isPlatformHubHost(bareHost: string): boolean {
  return PLATFORM_HUB_HOSTS.has(bareHost.toLowerCase());
}

/** The agent subdomain in a host ({slug}.chatrealty.io / {slug}.localhost), or undefined. */
export function subdomainOfHost(bareHost: string): string | undefined {
  const h = bareHost.toLowerCase();
  if (h.includes("chatrealty")) {
    const sub = h.split("chatrealty")[0]?.replace(/\.$/, "");
    return sub?.split(".").filter((s) => s && s !== "www").pop() || undefined;
  }
  if (h.endsWith(".localhost")) {
    const sub = h.split(".localhost")[0];
    if (sub && sub !== "www" && sub !== "localhost") return sub;
  }
  return undefined;
}

/**
 * The agent's site origin, built from the host the request is on so dev stays
 * in dev: www.chatrealty.io → https://{sub}.chatrealty.io;
 * localhost:3000 → http://{sub}.localhost:3000;
 * chatrealty.localhost:3000 → http://{sub}.chatrealty.localhost:3000.
 */
export function agentOrigin(protocol: string, hostWithPort: string, sub: string): string {
  const [bare, port] = hostWithPort.toLowerCase().split(":");
  const p = port ? `:${port}` : "";
  if (bare === "localhost" || bare.endsWith(".localhost")) {
    const base = bare.includes("chatrealty") ? "chatrealty.localhost" : "localhost";
    return `${protocol}//${sub}.${base}${p}`;
  }
  return `https://${sub}.chatrealty.io`;
}

/** The platform origin to return to from an agent subdomain (Exit to Admin). */
export function platformOrigin(protocol: string, hostWithPort: string): string {
  const [bare, port] = hostWithPort.toLowerCase().split(":");
  const p = port ? `:${port}` : "";
  if (bare === "localhost" || bare.endsWith(".localhost")) {
    return `${protocol}//${bare.includes("chatrealty") ? "chatrealty.localhost" : "localhost"}${p}`;
  }
  return "https://www.chatrealty.io";
}

/** Paths that are "the agent's workspace" — the ones an agent is sent home for. */
export function isAgentWorkspacePath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/agent" ||
    pathname.startsWith("/agent/")
  );
}

type TokenLike = {
  roles?: unknown;
  isAdmin?: unknown;
  impersonatedBy?: unknown;
  agentSubdomain?: unknown;
} | null;

/**
 * Should this request be sent to the agent's own subdomain? Only for a real
 * agent session (not an admin, not an impersonation), on a platform host, for
 * a workspace path. Admins keep www: the platform home and admin are theirs.
 */
export function agentHomeSubdomain(token: TokenLike, bareHost: string, pathname: string): string | null {
  if (!token) return null;
  if (!isPlatformHubHost(bareHost)) return null;
  if (!isAgentWorkspacePath(pathname)) return null;
  if (token.isAdmin === true || token.impersonatedBy) return null;
  const roles = Array.isArray(token.roles) ? (token.roles as string[]) : [];
  if (!roles.includes("realEstateAgent")) return null;
  const sub = typeof token.agentSubdomain === "string" ? token.agentSubdomain.trim().toLowerCase() : "";
  return /^[a-z0-9-]{1,63}$/.test(sub) ? sub : null;
}

/**
 * Platform routes that run on the PLATFORM on every host — never
 * reverse-proxied to an agent's external deployment (doc audit M1, 2026-10-17).
 *
 * A subdomain serving an external site hands its whole /api surface to the
 * agent's deployment (src/proxy.ts). That used to include these, so a session
 * hand-off to that subdomain (`transfer` → `{sub}/api/auth/receive?token=…`)
 * delivered the token to code the agent controls, which could redeem it on www
 * for a 30-day session as whoever clicked the link. None of these names is a
 * NextAuth action, so the external site's own `/api/auth/[...nextauth]` loses
 * nothing by not seeing them.
 */
const PLATFORM_PINNED_API = ["/api/auth/transfer", "/api/auth/receive", "/api/auth/impersonate", "/api/auth/signout-chain"];

export function isPlatformPinnedApi(pathname: string): boolean {
  return PLATFORM_PINNED_API.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/**
 * The platform's own pages. On a subdomain serving an external site these move
 * to www (doc audit M2): their API calls would otherwise land on the agent's
 * deployment — NextAuth included, since the scaffold runs its own at
 * /api/auth/[...nextauth] — and the portal breaks. The scaffold has no pages
 * at these paths, so the agent's site loses nothing.
 */
export function isPlatformSurfacePath(pathname: string): boolean {
  return ["/auth", "/agent", "/admin", "/dashboard"].some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/** NextAuth session cookie names — what must never be forwarded to a third-party deployment. */
export function isPlatformSessionCookie(name: string): boolean {
  return /^(__Secure-|__Host-)?next-auth\./.test(name);
}
