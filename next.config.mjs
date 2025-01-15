import createMDX from '@next/mdx';

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.dreamexoticrentals.com" },
      { protocol: "https", hostname: "resource.rentcafe.com" },
      { protocol: "https", hostname: "www.indianridgecc.com" },
      { protocol: "https", hostname: "imageio.forbes.com" },
      { protocol: "https", hostname: "www.nps.gov" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "cdn.resize.sparkplatform.com" },
      { protocol: "https", hostname: "themorgnergroup.com" },
      { protocol: "https", hostname: "rcwatershed.org" },
      { protocol: "https", hostname: "a.travel-assets.com" },
      { protocol: "https", hostname: "www.desertsun.com" },
      { protocol: "https", hostname: "maps.googleapis.com" },
      { protocol: "https", hostname: "example.com" },
      { protocol: "https", hostname: "ssl.cdn-redfin.com" },
      { protocol: "https", hostname: "tse1.mm.bing.net" },
      { protocol: "https", hostname: "tse2.mm.bing.net" },
      { protocol: "https", hostname: "tse3.mm.bing.net" },
      { protocol: "https", hostname: "tse4.mm.bing.net" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "boomtown-production-consumer-backup.s3.amazonaws.com" },
      { protocol: "https", hostname: "beaverhomesandcottages.ca" },
      { protocol: "https", hostname: "media-production.lp-cdn.com" },
      { protocol: "https", hostname: "cf.bstatic.com" },
      { protocol: "https", hostname: "underpar-files.imgix.net" },
      { protocol: "https", hostname: "images1.apartments.com" },
      { protocol: "https", hostname: "images.squarespace-cdn.com" },
      { protocol: "https", hostname: "assets.simpleviewinc.com" },
      { protocol: "https", hostname: "villaestatesmo.com" },
      { protocol: "https", hostname: "www.thaler.tirol" },
    ],
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });
    return config;
  },
};

// Use the MDX plugin
const mdx = createMDX({
  extension: /\.mdx?$/,
});

// Export the configuration wrapped with the MDX plugin
export default mdx(nextConfig);
