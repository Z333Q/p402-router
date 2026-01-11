import { NextResponse, NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const response = NextResponse.next()

    // 1. Security Headers (Top 1% Standards)
    response.headers.set('X-DNS-Prefetch-Control', 'on')
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
    response.headers.set('X-Frame-Options', 'SAMEORIGIN')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()')

    // 2. CSP (Strict but functional)
    // Note: In development, this can be more relaxed. In production, we should lock it down.
    response.headers.set(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.coinbase.com https://*.circle.com https://*.google-analytics.com https://*.googletagmanager.com https://*.walletconnect.org https://*.walletconnect.com https://*.web3modal.org https://*.web3modal.com https://eth.merkle.io https://*.base.org wss://*.walletconnect.org wss://*.walletconnect.com;"
    )

    // 3. Request Logging (Simplified version for context)
    // In a top 1% site, we'd pipe this to Axiom, Datadog, or similar.
    const requestId = crypto.randomUUID()
    response.headers.set('X-P402-Request-ID', requestId)

    return response
}

// Ensure middleware only runs on relevant paths
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
