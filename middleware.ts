import { NextResponse, NextRequest } from 'next/server'

// Allowed origins for CORS (P402 mini-app and development)
const ALLOWED_ORIGINS = [
    'https://mini.p402.io',
    'https://p402.io',
    'https://www.p402.io',
    'http://localhost:3000',
    'http://localhost:3001',
];

// API paths that require session authentication
const PROTECTED_API_PATHS = [
    '/api/v2/chat',
    '/api/v2/sessions/fund',
    '/api/v2/analytics',
];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const origin = request.headers.get('origin');

    // Handle CORS preflight for API routes
    if (request.method === 'OPTIONS' && pathname.startsWith('/api/')) {
        const preflightResponse = new NextResponse(null, { status: 204 });

        if (origin && (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.p402.io'))) {
            preflightResponse.headers.set('Access-Control-Allow-Origin', origin);
        } else {
            preflightResponse.headers.set('Access-Control-Allow-Origin', '*');
        }

        preflightResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        preflightResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-P402-Tenant, X-P402-Session, X-P402-Source');
        preflightResponse.headers.set('Access-Control-Max-Age', '86400');

        return preflightResponse;
    }

    // Check protected API paths for session header or session cookie
    const isProtectedPath = PROTECTED_API_PATHS.some(path => pathname.startsWith(path));
    if (isProtectedPath) {
        const sessionId = request.headers.get('x-p402-session');
        const sessionToken = request.cookies.get('next-auth.session-token') ||
            request.cookies.get('__Secure-next-auth.session-token');

        // Allow if it's an analytics path and we have a session token (internal dashboard)
        const isAnalyticsPath = pathname.startsWith('/api/v2/analytics');
        if (isAnalyticsPath && sessionToken) {
            return NextResponse.next();
        }

        if (!sessionId) {
            return NextResponse.json(
                { error: { type: 'unauthorized', message: 'Session required', code: 'MISSING_SESSION' } },
                { status: 401 }
            );
        }

        if (!sessionId.startsWith('sess_')) {
            return NextResponse.json(
                { error: { type: 'unauthorized', message: 'Invalid session format', code: 'INVALID_SESSION' } },
                { status: 401 }
            );
        }
    }

    const response = NextResponse.next()

    // 1. CORS Headers for API routes
    if (pathname.startsWith('/api/')) {
        if (origin && (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.p402.io'))) {
            response.headers.set('Access-Control-Allow-Origin', origin);
        } else {
            response.headers.set('Access-Control-Allow-Origin', '*');
        }
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-P402-Tenant, X-P402-Session, X-P402-Source');
    }

    // 2. Security Headers (Top 1% Standards)
    response.headers.set('X-DNS-Prefetch-Control', 'on')
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
    response.headers.set('X-Frame-Options', 'SAMEORIGIN')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()')

    // 3. CSP (Strict but functional)
    response.headers.set(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.coinbase.com https://*.circle.com https://*.google-analytics.com https://*.googletagmanager.com https://*.walletconnect.org https://*.walletconnect.com https://*.web3modal.org https://*.web3modal.com https://eth.merkle.io https://*.base.org https://*.p402.io wss://*.walletconnect.org wss://*.walletconnect.com;"
    )

    // 4. Request ID for tracing
    const requestId = crypto.randomUUID()
    response.headers.set('X-P402-Request-ID', requestId)

    return response
}

// Ensure middleware runs on API paths and pages
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api/auth (NextAuth needs its own handling)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
    ],
}
