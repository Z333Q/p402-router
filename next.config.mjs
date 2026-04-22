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

  // Include .claude/skills/ in the serverless bundle so /skill/[...path] can read files at runtime
  outputFileTracingIncludes: {
    '/skill': ['.claude/skills/p402/**'],
  },

  async rewrites() {
    return {
      beforeFiles: [
        // meter.p402.io → serve /meter at root
        {
          source: '/',
          has: [{ type: 'host', value: 'meter.p402.io' }],
          destination: '/meter',
        },
        {
          source: '/:path((?!meter|api|_next|favicon).*)',
          has: [{ type: 'host', value: 'meter.p402.io' }],
          destination: '/meter',
        },
      ],
      fallback: [
        {
          source: '/skill/p402.skill',
          destination: '/downloads/p402.skill',
        },
        {
          source: '/skill/p402.zip',
          destination: '/downloads/p402.zip',
        },
      ],
    };
  },

  async headers() {
    const securityHeaders = [
      { key: 'X-Content-Type-Options',  value: 'nosniff' },
      { key: 'X-Frame-Options',         value: 'DENY' },
      { key: 'X-XSS-Protection',        value: '1; mode=block' },
      { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy',      value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    ];

    return [
      // Apply security headers globally
      { source: '/(.*)', headers: securityHeaders },

      // LLM discovery files — open CORS, explicit content-type
      {
        source: '/llms.txt',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Content-Type', value: 'text/markdown; charset=utf-8' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
          { key: 'X-Robots-Tag', value: 'index, follow' },
        ],
      },
      {
        source: '/llms-full.txt',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Content-Type', value: 'text/markdown; charset=utf-8' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
          { key: 'X-Robots-Tag', value: 'index, follow' },
        ],
      },

      // OpenAPI spec — machine-readable API discovery
      {
        source: '/openapi.yaml',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Content-Type', value: 'application/yaml' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },

      // Well-known files — A2A agent discovery
      {
        source: '/.well-known/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cache-Control', value: 'public, max-age=300' },
        ],
      },
    ];
  },

  // ── Server-only packages — exclude from webpack bundle ─────────────────────
  // @coinbase/cdp-sdk ships Solana bindings that use ESM imports unavailable
  // in the webpack runtime (e.g. @solana/kit's sequentialInstructionPlan).
  // Marking these as serverExternalPackages tells Next.js to require() them
  // at runtime via Node.js instead of bundling them with webpack.
  serverExternalPackages: [
    '@coinbase/cdp-sdk',
    '@coinbase/agentkit',
    '@solana/kit',
    '@solana-program/token',
  ],

  // Ignore React Native modules in web build
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
      // Solana modules pulled in transitively by @coinbase/cdp-sdk and x402-fetch
      // are not used in P402 (EVM-only). Stub them out to prevent webpack errors
      // caused by @solana/kit's missing sequentialInstructionPlan export.
      '@solana/kit': false,
      '@solana-program/token': false,
    };

    // SES / lockdown-install.js freezes JS globals and crashes the Next.js
    // client runtime. Stub it out in the browser bundle — @coinbase/agentkit
    // is server-only so lockdown is never needed on the client.
    if (!isServer) {
      config.resolve.alias['ses/lockdown-install.js'] = false;
      config.resolve.alias['ses'] = false;
    }

    return config;
  },
};

export default nextConfig;