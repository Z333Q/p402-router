import { NextRequest, NextResponse } from 'next/server';
import { getFacilitatorWallet } from '@/lib/x402/facilitator-wallet';
import { isCdpEnabled } from '@/lib/cdp-client';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
    try {
        const wallet = await getFacilitatorWallet();
        const health = await wallet.checkHealth();

        return NextResponse.json({
            status: health.healthy ? 'healthy' : 'degraded',
            version: '2.0.0',
            service: 'P402 Facilitator',
            wallet: {
                address: health.address,
                mode: health.mode,
                gasBalance: health.balance,
                sufficient: health.healthy,
            },
            cdp: {
                enabled: isCdpEnabled(),
                keyIsolation: isCdpEnabled() ? 'aws-nitro-enclave' : 'env-var',
            },
            timestamp: new Date().toISOString(),
        });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Facilitator unavailable';
        return NextResponse.json(
            {
                status: 'down',
                service: 'P402 Facilitator',
                error: msg,
                timestamp: new Date().toISOString(),
            },
            { status: 503 }
        );
    }
}
