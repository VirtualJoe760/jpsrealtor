import mdx from '@next/mdx';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Include MDX and Markdown files in your app
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],

  // Configure custom image domains (optional)
  images: {
    domains: ['res.cloudinary.com', 'images.unsplash.com'], // Add your image domains
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

// Add MDX support
export default mdx()(nextConfig);
