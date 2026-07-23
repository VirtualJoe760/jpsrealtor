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

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Listing photos come back as already-optimized thumbUrl (the ChatRealty
  // image proxy) or MLS-CDN URLs; the template renders them with a plain <img>,
  // so no next/image remotePatterns are required. Add them here if you switch
  // to next/image.
  reactStrictMode: true,
};

export default nextConfig;
