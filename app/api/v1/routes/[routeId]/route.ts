import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ routeId: string }> }) {
    const { routeId } = await params

    // Mock Route Data
    const route = {
        routeId,
        bazaar: {
            title: 'Weather Data API',
            description: 'Real-time weather data for any location provided by P402 Weather Service.',
            mimeType: 'application/json',
            tags: ['weather', 'data', 'climate'],
            listed: true,
            lastCrawledAt: new Date().toISOString(),
            lastSeenAt: new Date().toISOString(),
            inputSchema: { type: 'object', properties: { lat: { type: 'number' }, lon: { type: 'number' } } },
            outputSchema: { type: 'object', properties: { temp: { type: 'number' }, condition: { type: 'string' } } }
        },
        accepts: [
            { scheme: 'exact', network: 'eip155:8453', asset: 'USDC', amount: '0.01' },
            { scheme: 'exact', network: 'eip155:10', asset: 'USDC', amount: '0.01' }
        ]
    }

    return NextResponse.json({ route })
}
