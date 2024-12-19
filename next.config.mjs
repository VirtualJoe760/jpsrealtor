import createMDX from '@next/mdx';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable MDX and Markdown files
  pageExtensions: ['ts', 'tsx', 'mdx', 'md'],

  // Update image configuration to use `remotePatterns`
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },

  // Add SVG React component support (optional)
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });
    return config;
  },
};

// Use the MDX plugin
const withMDX = createMDX();

export default withMDX(nextConfig);
