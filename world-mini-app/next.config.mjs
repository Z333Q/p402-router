/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    // World App iframe embedding
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    // World App is allowed to embed this as a Mini App
                    { key: 'Content-Security-Policy', value: "frame-ancestors 'self' https://worldapp.com https://*.worldapp.com" },
                ],
            },
        ];
    },
    env: {
        NEXT_PUBLIC_APP_ID: process.env.NEXT_PUBLIC_APP_ID ?? '',
        NEXT_PUBLIC_P402_URL: process.env.NEXT_PUBLIC_P402_URL ?? 'https://p402.io',
    },
};

export default nextConfig;
