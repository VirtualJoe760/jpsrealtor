// src/proxy.ts
// Combined: NextAuth route protection + Multi-domain hostname routing
//
// Domain hierarchy:
//   chatrealty.io (+ localhost in dev) → platform homepage (/chat-landing)
//   jpsrealtor.com / josephsardella.com → owner homepage (insights page)
//   agent.chatrealty.io (+ agent.localhost) → admin-only owner preview
//   {slug}.chatrealty.io (+ {slug}.localhost) → agent public site
//   custom-domain.com → agent custom domain (future)

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// ---------------------------------------------------------------------------
// Domain Registry
// ---------------------------------------------------------------------------

const AGENT_DOMAIN_MAP = new Map<string, string>([
  // ["customdomain.com", "agentObjectId"]
]);

const OWNER_HOSTNAMES = new Set([
  "jpsrealtor.com",
  "www.jpsrealtor.com",
  "josephsardella.com",
  "www.josephsardella.com",
]);

// "agent" subdomain is reserved for admin access to the owner's homepage
const ADMIN_ONLY_SUBDOMAINS = new Set(["agent"]);

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
  // 1. Owner domains (jpsrealtor.com, josephsardella.com) → serve normally
  //    These get the insights homepage at / and full site access.
  // -----------------------------------------------------------------------
  if (OWNER_HOSTNAMES.has(bareHost)) {
    return handleAuthProtection(request, pathname);
  }

  // -----------------------------------------------------------------------
  // 2. Detect subdomain from chatrealty.io OR {sub}.localhost for dev
  // -----------------------------------------------------------------------
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

  // -----------------------------------------------------------------------
  // 3. "agent" subdomain — admin-only access to owner's homepage
  //    agent.chatrealty.io / agent.localhost → shows jpsrealtor.com content
  // -----------------------------------------------------------------------
  if (detectedSubdomain && ADMIN_ONLY_SUBDOMAINS.has(detectedSubdomain)) {
    // Always let auth pages through (so login doesn't loop)
    if (pathname.startsWith("/auth") || pathname.startsWith("/api/auth")) {
      return NextResponse.next();
    }

    const token = await getToken({ req: request });

    // Must be logged in
    if (!token) {
      const callbackUrl = encodeURIComponent(pathname + request.nextUrl.search);
      return NextResponse.redirect(
        new URL(`/auth/signin?callbackUrl=${callbackUrl}`, request.url)
      );
    }

    // Must be admin
    if (!token.isAdmin && !token.impersonatedBy) {
      // Redirect non-admins to the platform homepage
      return NextResponse.redirect(new URL("http://localhost:3000/", request.url));
    }

    // Admin sees the site with admin banner header
    const response = NextResponse.next();
    response.headers.set("x-admin-preview", "true");
    response.headers.set("x-owner-domain", "jpsrealtor.com");
    return response;
  }

  // -----------------------------------------------------------------------
  // 4. Agent subdomains ({slug}.chatrealty.io / {slug}.localhost)
  // -----------------------------------------------------------------------
  if (detectedSubdomain) {
    const subdomain = detectedSubdomain;

    // Let auth, agent, admin, and dashboard routes pass through normally
    const passthroughPrefixes = ["/auth", "/agent", "/admin", "/dashboard"];
    const isPassthrough = passthroughPrefixes.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    );

    if (isPassthrough) {
      // For protected routes on subdomains, enforce auth
      const protectedPrefixes = ["/agent", "/admin", "/dashboard"];
      const isProtected = protectedPrefixes.some(
        (p) => pathname === p || pathname.startsWith(p + "/")
      );

      if (isProtected) {
        const token = await getToken({ req: request });
        if (!token) {
          const callbackUrl = encodeURIComponent(pathname + request.nextUrl.search);
          return NextResponse.redirect(
            new URL(`/auth/signin?callbackUrl=${callbackUrl}`, request.url)
          );
        }
        // Non-admin trying to access /admin on a subdomain
        if ((pathname === "/admin" || pathname.startsWith("/admin/")) && !token.isAdmin) {
          return NextResponse.redirect(new URL("/dashboard", request.url));
        }

        // Admin on agent subdomain — redirect to chooser if not already impersonating
        const isAdminUser = token.isAdmin === true;
        const isAlreadyImpersonating = !!token.impersonatedBy;
        const isAdminAccessPage = pathname === "/auth/admin-access" || pathname.startsWith("/auth/admin-access");
        if (isAdminUser && !isAlreadyImpersonating && !isAdminAccessPage) {
          const callbackUrl = encodeURIComponent(pathname + request.nextUrl.search);
          return NextResponse.redirect(
            new URL(`/auth/admin-access?subdomain=${subdomain}&callbackUrl=${callbackUrl}`, request.url)
          );
        }
      }

      const response = NextResponse.next();
      response.headers.set("x-agent-subdomain", subdomain);
      return response;
    }

    // All paths (including /) — serve normally with agent subdomain header.
    // The insights homepage reads x-agent-subdomain via /api/agent/public
    // to load the correct agent's data.
    const response = NextResponse.next();
    response.headers.set("x-agent-subdomain", subdomain);
    return response;
  }

  // -----------------------------------------------------------------------
  // 5. Platform root (chatrealty.io, www.chatrealty.io, bare localhost)
  //    Show the ChatRealty platform landing page at /
  // -----------------------------------------------------------------------
  const isPlatform =
    bareHost.includes("chatrealty") &&
    !bareHost.includes(".chatrealty"); // subdomains are agent sites, not platform

  // TEMP DIAGNOSTIC: error-level so it surfaces in Vercel's default log view.
  // Remove once the chatrealty rewrite bug is identified.
  console.error(
    `[PROXY-DEBUG] host=${bareHost} pathname=${pathname} ` +
    `detectedSubdomain=${detectedSubdomain ?? "<none>"} ` +
    `isPlatform=${isPlatform} ownerMatch=${OWNER_HOSTNAMES.has(bareHost)}`
  );

  if (isPlatform && pathname === "/") {
    console.error(`[PROXY-DEBUG] REWRITING ${bareHost}/ -> /chat-landing`);
    const url = request.nextUrl.clone();
    url.pathname = "/chat-landing";
    return NextResponse.rewrite(url);
  }

  // -----------------------------------------------------------------------
  // 6. Agent custom domains → /agent/[agentId]
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
  // 7. Auth protection for all other routes
  // -----------------------------------------------------------------------
  return handleAuthProtection(request, pathname);
}

// -----------------------------------------------------------------------
// Shared auth protection logic
// -----------------------------------------------------------------------
async function handleAuthProtection(request: NextRequest, pathname: string) {
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json|webmanifest)$).*)",
  ],
};
