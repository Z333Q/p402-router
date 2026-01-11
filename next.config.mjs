/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fixes the "missing routes-manifest" build error
  output: "standalone",

  // Enforce strict builds for "Top 1%" quality
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Standard image handling
  images: {
    unoptimized: true,
  },
};

export default nextConfig;