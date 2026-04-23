import { NextRequest, NextResponse } from "next/server";

/**
 * Multi-Domain Hostname Routing Middleware
 *
 * Routes requests based on the incoming hostname to support multiple domains
 * serving different content from the same Next.js application.
 *
 * Routing priority:
 * 1. chatrealty.io (and subdomains) → /chat-landing
 * 2. Agent custom domains → /agent/[agentId] (looked up from config)
 * 3. josephsardella.com → pass through (same owner as jpsrealtor.com)
 * 4. jpsrealtor.com / localhost → default (pass through)
 */

// ---------------------------------------------------------------------------
// Agent Domain Registry
// ---------------------------------------------------------------------------
// TODO: Replace this static Map with an API call to MongoDB once we have an
// internal lookup endpoint (e.g. GET /api/internal/agent-by-domain?domain=...).
// Middleware runs on the Edge Runtime and CANNOT import the MongoDB driver
// directly. An API route or KV store is required for dynamic lookups.
// ---------------------------------------------------------------------------
const AGENT_DOMAIN_MAP = new Map<string, string>([
  // ["customdomain.com", "agentObjectId"]
  // Example: ["janedoe-realty.com", "6612f1a2c8e4a1b2c3d4e5f6"]
]);

/**
 * Hostnames that belong to the platform owner and should be served normally
 * without any rewrite.
 */
const OWNER_HOSTNAMES = new Set([
  "jpsrealtor.com",
  "www.jpsrealtor.com",
  "josephsardella.com",
  "www.josephsardella.com",
]);

/**
 * Paths that should never be rewritten — static assets, API routes, Next.js
 * internals, and authentication endpoints.
 */
const BYPASS_PREFIXES = [
  "/api/",
  "/_next/",
  "/favicon",
  "/manifest",
  "/sw.",
  "/workbox-",
  "/auth/",
  "/icons/",
  "/images/",
];

function shouldBypass(pathname: string): boolean {
  return BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never rewrite static assets, APIs, or Next.js internals
  if (shouldBypass(pathname)) {
    return NextResponse.next();
  }

  const hostname = request.headers.get("host") || "";
  // Strip port for local development (e.g. "localhost:3000" → "localhost")
  const bareHost = hostname.split(":")[0];

  // -----------------------------------------------------------------------
  // 1. ChatRealty domains → /chat-landing
  // -----------------------------------------------------------------------
  if (bareHost.includes("chatrealty")) {
    // Only rewrite the root path; let sub-paths (e.g. /chat, /api) pass through
    // so the chat-landing page can link to them normally.
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/chat-landing";
      return NextResponse.rewrite(url);
    }
    // Non-root paths on chatrealty domains are served as-is
    return NextResponse.next();
  }

  // -----------------------------------------------------------------------
  // 2. Agent custom domains → /agent/[agentId]
  // -----------------------------------------------------------------------
  const agentId = AGENT_DOMAIN_MAP.get(bareHost);
  if (agentId) {
    // Rewrite root to the agent profile page; sub-paths pass through so the
    // agent's site can use shared routes (/chap, /neighborhoods, etc.)
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = `/agent/${agentId}`;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // -----------------------------------------------------------------------
  // 3 & 4. Owner domains and localhost → serve normally
  // -----------------------------------------------------------------------
  // Includes jpsrealtor.com, josephsardella.com, and localhost.
  // No rewrite needed — the default Next.js routing applies.
  return NextResponse.next();
}

/**
 * Matcher: run middleware on all routes except static files.
 * The BYPASS_PREFIXES check above provides an additional safety net.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public folder files with extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json|webmanifest)$).*)",
  ],
};
