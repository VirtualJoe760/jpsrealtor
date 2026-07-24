// HARD GUARD: test-data sites are LOCALHOST-ONLY. The sample listings are
// fictitious — deploying them to a public host would misrepresent the market
// and violate MLS/IDX display rules. Vercel (and most CI hosts) set CI/VERCEL
// env vars during builds, so a deploy attempt in test-data mode fails here,
// deliberately, before anything goes live. Going live = connect your real
// data: set CHATREALTY_API_TOKEN and remove CHATREALTY_TEST_DATA in your env.
if (process.env.CHATREALTY_TEST_DATA === "true" && (process.env.VERCEL || process.env.CI)) {
  throw new Error(
    "REFUSING TO BUILD FOR DEPLOYMENT: this site is in TEST DATA mode (fictitious sample listings). " +
      "Test data is for localhost preview only and must never be published. " +
      "Connect your real ChatRealty data (set CHATREALTY_API_TOKEN, remove CHATREALTY_TEST_DATA), then deploy."
  );
}

// SUBDOMAIN PROXY SUPPORT: when this site is connected to a ChatRealty
// subdomain ({you}.chatrealty.io), the platform reverse-proxies PAGE requests
// to this deployment — but static assets must load from THIS origin. On
// Vercel, VERCEL_URL is set automatically, so assetPrefix Just Works with no
// config. Set NEXT_PUBLIC_ASSET_ORIGIN to override (e.g. a custom domain).
const assetOrigin =
  process.env.NEXT_PUBLIC_ASSET_ORIGIN ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Listing photos come back as already-optimized thumbUrl (the ChatRealty
  // image proxy) or MLS-CDN URLs; the template renders them with a plain <img>,
  // so no next/image remotePatterns are required. Add them here if you switch
  // to next/image.
  reactStrictMode: true,
  ...(assetOrigin ? { assetPrefix: assetOrigin } : {}),
  env: {
    // Exposed so lib/asset-url.ts can absolutize public/ image srcs (logo,
    // headshot) — required for them to load through the subdomain proxy.
    NEXT_PUBLIC_ASSET_ORIGIN: assetOrigin || "",
  },
};

export default nextConfig;
