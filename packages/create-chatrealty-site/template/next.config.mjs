/** @type {import('next').NextConfig} */
const nextConfig = {
  // Listing photos come back as already-optimized thumbUrl (the ChatRealty
  // image proxy) or MLS-CDN URLs; the template renders them with a plain <img>,
  // so no next/image remotePatterns are required. Add them here if you switch
  // to next/image.
  reactStrictMode: true,
};

export default nextConfig;
