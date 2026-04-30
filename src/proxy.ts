// src/proxy.ts
// Combined: NextAuth route protection + Multi-domain hostname routing

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

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

const OWNER_HOSTNAMES = new Set([
  "jpsrealtor.com",
  "www.jpsrealtor.com",
  "josephsardella.com",
  "www.josephsardella.com",
]);

const BYPASS_PREFIXES = [
  "/api/",
  "/_next/",
  "/favicon",
  "/manifest",
  "/sw.",
  "/workbox-",
  "/icons/",
  "/images/",
];

function shouldBypass(pathname: string): boolean {
  return BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never rewrite static assets, APIs, or Next.js internals
  if (shouldBypass(pathname)) {
    return NextResponse.next();
  }

  const hostname = request.headers.get("host") || "";
  const bareHost = hostname.split(":")[0];

  // -----------------------------------------------------------------------
  // 1. ChatRealty domains + localhost subdomains — platform vs agent
  // -----------------------------------------------------------------------
  // Detect subdomain from chatrealty.io OR {sub}.localhost for dev
  let detectedSubdomain: string | undefined;

  if (bareHost.includes("chatrealty")) {
    const chatParts = bareHost.split("chatrealty");
    const subPart = chatParts[0]?.replace(/\.$/, "");
    detectedSubdomain = subPart?.split(".").filter(s => s && s !== "www").pop() || undefined;
  } else if (bareHost.endsWith(".localhost") || bareHost.match(/^[a-z0-9]+\.localhost$/)) {
    // Dev: "bethanyklier.localhost" → "bethanyklier"
    const sub = bareHost.split(".localhost")[0];
    if (sub && sub !== "www" && sub !== "localhost") {
      detectedSubdomain = sub;
    }
  }

  if (bareHost.includes("chatrealty") || detectedSubdomain) {
    const subdomain = detectedSubdomain;

    // Agent subdomain (johndoe.chatrealty.io)
    if (subdomain) {
      // If path starts with /agent/ or /admin/, let it pass through normally
      // so admins can view agent dashboards via their subdomain.
      // The x-agent-subdomain header tells the page whose data to load.
      if (pathname.startsWith("/agent/") || pathname.startsWith("/admin/") || pathname.startsWith("/dashboard/")) {
        const response = NextResponse.next();
        response.headers.set("x-agent-subdomain", subdomain);
        return response;
      }

      // All other paths → rewrite to the public agent-site page
      const url = request.nextUrl.clone();
      url.pathname = `/agent-site${pathname}`;
      const response = NextResponse.rewrite(url);
      response.headers.set("x-agent-subdomain", subdomain);
      return response;
    }

    // Platform root (chatrealty.io or www.chatrealty.io)
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/chat-landing";
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // -----------------------------------------------------------------------
  // 2. Agent custom domains → /agent/[agentId]
  // -----------------------------------------------------------------------
  const agentId = AGENT_DOMAIN_MAP.get(bareHost);
  if (agentId) {
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = `/agent/${agentId}`;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // -----------------------------------------------------------------------
  // 3. Auth protection for protected routes
  // -----------------------------------------------------------------------
  const isAuthPage = pathname.startsWith("/auth");
  const isDashboard = pathname.startsWith("/dashboard");
  const isAdmin = pathname.startsWith("/admin");
  const isAgent = pathname.startsWith("/agent");
  const isProtected = isDashboard || isAdmin || isAgent;

  if (isAuthPage || isProtected) {
    const token = await getToken({ req: request });
    const isAuth = !!token;

    // Authenticated user on auth page → redirect to dashboard
    if (isAuthPage && isAuth) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Unauthenticated user on protected route → redirect to sign in
    if (!isAuth && isProtected) {
      let from = pathname;
      if (request.nextUrl.search) {
        from += request.nextUrl.search;
      }
      return NextResponse.redirect(
        new URL("/api/auth/signin?callbackUrl=" + encodeURIComponent(from), request.url)
      );
    }

    // Non-admin trying to access admin routes → redirect to dashboard
    if (isAdmin && !token?.isAdmin) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // -----------------------------------------------------------------------
  // 4. Owner domains and localhost → serve normally
  // -----------------------------------------------------------------------
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json|webmanifest)$).*)",
  ],
};
