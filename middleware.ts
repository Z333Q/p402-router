import { NextResponse, NextRequest } from 'next/server'
import { hashSessionToken } from '@/lib/admin/crypto'

// Allowed origins for CORS (P402 mini-app and development)
const ALLOWED_ORIGINS = [
    'https://mini.p402.io',
    'https://p402.io',
    'https://www.p402.io',
    'http://localhost:3000',
    'http://localhost:3001',
];

// Admin paths — require admin session cookie
const ADMIN_PUBLIC_PATHS = ['/admin/login', '/api/admin/auth'];

// API paths that require session authentication
const PROTECTED_API_PATHS = [
    '/api/v2/chat',
    '/api/v2/sessions/fund',
    '/api/v2/analytics',
    '/api/v1/events',
];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');

    // ── Admin path guard ──────────────────────────────────────────────────────
    // All /admin/* paths (except login + auth API) require the admin session cookie.
    // Full DB session validation happens inside each route via requireAdminAccess().
    // Middleware only does structural validation + IP allowlisting (Edge-safe).
    if (pathname.startsWith('/admin') && !ADMIN_PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
        const rawToken = request.cookies.get('p402-admin-session')?.value;

        if (!rawToken || rawToken.length < 64) {
            const loginUrl = new URL('/admin/login', request.url);
            if (pathname !== '/admin' && pathname !== '/admin/') {
                loginUrl.searchParams.set('redirect', pathname);
            }
            return NextResponse.redirect(loginUrl);
        }

        // IP allowlisting (optional — only enforced if ADMIN_ALLOWED_IPS is set)
        const allowedIPs = process.env.ADMIN_ALLOWED_IPS?.split(',').map(ip => ip.trim()).filter(Boolean);
        if (allowedIPs && allowedIPs.length > 0) {
            const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
                ?? request.headers.get('x-real-ip');
            if (clientIP && !allowedIPs.includes(clientIP)) {
                return new NextResponse('Forbidden', { status: 403 });
            }
        }

        // Pass token hash in header so API routes can skip re-hashing
        const res = NextResponse.next();
        res.headers.set('x-admin-token-hash', hashSessionToken(rawToken));
        return res;
    }

    // Handle CORS preflight for API routes
    if (request.method === 'OPTIONS' && pathname.startsWith('/api/')) {
        const preflightResponse = new NextResponse(null, { status: 204 });

        if (origin && (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.p402.io'))) {
            preflightResponse.headers.set('Access-Control-Allow-Origin', origin);
        } else {
            preflightResponse.headers.set('Access-Control-Allow-Origin', '*');
        }

        preflightResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        preflightResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-P402-Tenant, X-P402-Session, X-P402-Source, PAYMENT-SIGNATURE');
        preflightResponse.headers.set('Access-Control-Max-Age', '86400');
        preflightResponse.headers.set('Access-Control-Expose-Headers', 'PAYMENT-REQUIRED, PAYMENT-RESPONSE');

        return preflightResponse;
    }

    // Check protected API paths for session header or session cookie
    const isProtectedPath = PROTECTED_API_PATHS.some(path => pathname.startsWith(path));
    if (isProtectedPath) {
        const sessionId = request.headers.get('x-p402-session');
        const sessionToken = request.cookies.get('next-auth.session-token') ||
            request.cookies.get('__Secure-next-auth.session-token');

        // Allow if it's a dashboard-accessible path and we have a session token
        const isInternalApiPath =
            pathname.startsWith('/api/v2/analytics') ||
            pathname.startsWith('/api/v1/events') ||
            pathname.startsWith('/api/v2/chat') ||
            pathname.startsWith('/api/v2/governance') ||
            pathname.startsWith('/api/v2/sessions');
        if (isInternalApiPath && sessionToken) {
            return NextResponse.next();
        }

        // Allow if Authorization header is present (external agents like Google Cloud)
        const authHeader = request.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
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
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-P402-Tenant, X-P402-Session, X-P402-Source, PAYMENT-SIGNATURE');
        response.headers.set('Access-Control-Expose-Headers', 'PAYMENT-REQUIRED, PAYMENT-RESPONSE');
    }

    // 2. Security Headers (Top 1% Standards)
    response.headers.set('X-DNS-Prefetch-Control', 'on')
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()')

    // 3. CSP (Strict but functional)
    response.headers.set(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.coinbase.com https://*.circle.com https://*.google-analytics.com https://*.googletagmanager.com https://*.walletconnect.org https://*.walletconnect.com https://*.web3modal.org https://*.web3modal.com https://eth.merkle.io https://*.base.org https://*.p402.io wss://*.walletconnect.org wss://*.walletconnect.com; frame-ancestors 'none';"
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
