import { NextResponse, type NextRequest } from "next/server";

// Baseline security headers on every response. This is the agent's OWN site —
// there's no cross-tenant data here (all reads go through the server-side
// ChatRealty token in lib/), so the job is standard hardening: stop clickjacking
// and MIME sniffing, keep referrers lean, and trim the permissions surface.
//
// Note the CSP allows Cloudflare's Turnstile (script + frame) so the optional
// bot check on the inquiry form works when the agent turns it on.
export function middleware(_req: NextRequest) {
  const res = NextResponse.next();

  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  res.headers.set(
    "Content-Security-Policy",
    [
      "frame-ancestors 'self'",
      "frame-src https://challenges.cloudflare.com",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
    ].join("; ")
  );

  return res;
}

// Run on pages and API routes, but skip Next internals and static assets.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map)$).*)"],
};
