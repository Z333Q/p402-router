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

  async rewrites() {
    return [
      {
        source: '/skill/p402.skill',
        destination: '/downloads/p402.skill',
      },
      {
        source: '/skill/p402.zip',
        destination: '/downloads/p402.zip',
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/llms.txt',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Content-Type', value: 'text/markdown; charset=utf-8' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
      {
        source: '/llms-full.txt',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Content-Type', value: 'text/markdown; charset=utf-8' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
    ];
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