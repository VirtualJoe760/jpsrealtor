// src/middleware.ts
// Next.js middleware for subdomain routing (chatrealty.io agent sites)

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";

  // Detect chatrealty.io subdomains (e.g., johndoe.chatrealty.io)
  if (hostname.includes("chatrealty.io")) {
    const parts = hostname.split(".chatrealty.io")[0].split(".");
    const subdomain = parts[parts.length - 1]; // handles www.johndoe.chatrealty.io too

    // Skip platform domains (bare chatrealty.io, www.chatrealty.io)
    if (
      subdomain &&
      subdomain !== "www" &&
      subdomain !== "chatrealty" &&
      !hostname.startsWith("chatrealty.io")
    ) {
      // Rewrite to the agent's page, passing subdomain as a header
      const url = request.nextUrl.clone();
      url.pathname = `/agent-site${url.pathname}`;
      const response = NextResponse.rewrite(url);
      response.headers.set("x-agent-subdomain", subdomain);
      return response;
    }
  }

  // Default: continue without modification
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - Public assets (images, fonts, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)",
  ],
};
