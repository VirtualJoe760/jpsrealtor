// next.config.optimized.mjs
// OPTIMIZED VERSION - Backup your current config first!
// Rename this to next.config.mjs to use

import createMDX from "@next/mdx";
import withPWA from "next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable MDX support
  pageExtensions: ['js', 'jsx', 'mdx', 'ts', 'tsx'],

  // Performance: Disable TypeScript errors in development for faster builds
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },

  // Performance: Disable ESLint during builds
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === 'development',
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
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
      { protocol: "https", hostname: "cdn.photos.sparkplatform.com" },
      { protocol: "https", hostname: "media.crmls.org" },
    ],
  },

  // Experimental features for performance
  experimental: {
    // Optimize package imports for tree-shaking (huge performance boost)
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      '@react-three/fiber',
      '@react-three/drei',
      'recharts',
      'react-icons',
      '@heroicons/react',
    ],

    // Enable faster server component rendering
    serverActions: {
      bodySizeLimit: '2mb',
    },

    // Use SWC for faster compilation
    swcMinify: true,
  },

  // Compiler optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Webpack optimizations
  webpack(config, { isServer, dev }) {
    // SVG support
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });

    // Enable webpack caching for faster rebuilds
    if (dev) {
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [import.meta.url],
        },
        // Use more aggressive caching in development
        name: `${isServer ? 'server' : 'client'}-development`,
      };
    }

    // Optimize bundle splitting
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Framework chunk (React, Next.js core)
            framework: {
              name: 'framework',
              test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // Large libraries (3D, maps, AI)
            heavyLibs: {
              name: 'heavy-libs',
              test: /[\\/]node_modules[\\/](@react-three|three|maplibre-gl|@mlc-ai)[\\/]/,
              priority: 30,
              enforce: true,
            },
            // Common UI libraries
            lib: {
              name: 'lib',
              test: /[\\/]node_modules[\\/](framer-motion|lucide-react|recharts)[\\/]/,
              priority: 20,
              minChunks: 1,
              reuseExistingChunk: true,
            },
            // Shared application code
            commons: {
              name: 'commons',
              minChunks: 2,
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    // Resolve optimizations
    config.resolve = {
      ...config.resolve,
      // Reduce time spent resolving modules
      symlinks: false,
    };

    return config;
  },

  // Output configuration
  output: 'standalone', // Optimize for production deployment

  // Reduce build output verbosity
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 60 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 5,
  },
};

// MDX plugin wrapper
const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

// PWA configuration (disabled in development for performance)
const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development", // CRITICAL: No PWA overhead in dev
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts-webfonts",
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "google-fonts-stylesheets",
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-font-assets",
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-image-assets",
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: /\/_next\/image\?url=.+$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "next-image",
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: /\.(?:mp3|wav|ogg)$/i,
      handler: "CacheFirst",
      options: {
        rangeRequests: true,
        cacheName: "static-audio-assets",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: /\.(?:mp4)$/i,
      handler: "CacheFirst",
      options: {
        rangeRequests: true,
        cacheName: "static-video-assets",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: /\.(?:js)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-js-assets",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: /\.(?:css|less)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-style-assets",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: /\/_next\/data\/.+\/.+\.json$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "next-data",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: /\.(?:json|xml|csv)$/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "static-data-assets",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: ({ url }) => {
        const isSameOrigin = self.origin === url.origin;
        if (!isSameOrigin) return false;
        const pathname = url.pathname;
        if (pathname.startsWith("/api/")) return false;
        return true;
      },
      handler: "NetworkFirst",
      options: {
        cacheName: "pages",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60,
        },
      },
    },
  ],
});

// Apply configurations
export default pwaConfig(withMDX(nextConfig));
