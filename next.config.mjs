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

  // Ignore React Native modules in web build
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
    };
    return config;
  },
};

export default nextConfig;