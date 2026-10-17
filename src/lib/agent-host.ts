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

/** NextAuth session cookie names — what must never be forwarded to a third-party deployment. */
export function isPlatformSessionCookie(name: string): boolean {
  return /^(__Secure-|__Host-)?next-auth\./.test(name);
}
