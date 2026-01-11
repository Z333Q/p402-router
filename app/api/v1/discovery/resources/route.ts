import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
    // In production, aggregate from registered routes
    const resources = [
        {
            id: 'res_weather_01',
            name: 'Weather Data API',
            description: 'Real-time weather data.',
            route: { method: 'GET', path: '/forecast' },
            pricing: { model: 'per_request', amount: '0.01', asset: 'USDC' },
            schemes: ['exact'],
            networks: ['eip155:8453'],
            routerOverlay: {
                approvalRate: 0.99,
                p95VerifyMs: 45,
                p95SettleMs: 200,
                lastSeen: new Date().toISOString()
            }
        }
    ]
    return NextResponse.json({ resources })
}
