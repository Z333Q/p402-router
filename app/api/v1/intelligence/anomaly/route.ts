import { NextRequest, NextResponse } from 'next/server';
import { GeminiOptimizer, type RouterDecision } from '@/lib/intelligence/gemini-optimizer';
import { checkRateLimit, getHistoricalBaseline } from '@/lib/intelligence/api-helpers';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY!;

export async function POST(request: NextRequest) {
    try {
        const tenantId = request.headers.get('x-tenant-id');
        if (!tenantId) {
            return NextResponse.json(
                { error: 'Unauthorized', code: 'MISSING_TENANT' },
                { status: 401 }
            );
        }

        const rateLimit = await checkRateLimit(tenantId, 'anomaly');
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Rate limit exceeded', code: 'RATE_LIMITED' },
                { status: 429 }
            );
        }

        const body = await request.json();
        const decision: RouterDecision = body.decision;

        if (!decision) {
            return NextResponse.json(
                { error: 'Missing decision in request body', code: 'INVALID_REQUEST' },
                { status: 400 }
            );
        }

        const baseline = await getHistoricalBaseline(tenantId);

        const optimizer = new GeminiOptimizer(GOOGLE_API_KEY, tenantId);
        const result = await optimizer.analyzeRequest(decision, baseline);

        if (result.anomaly && result.severity === 'high') {
            // Escalation logic
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            fetch(`${appUrl}/api/v1/intelligence/audit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-tenant-id': tenantId,
                    'x-internal-trigger': 'anomaly_escalation'
                },
                body: JSON.stringify({ days: 1, execute_actions: true, max_actions: 3 })
            }).catch(console.error);
        }

        return NextResponse.json({
            ...result,
            baseline,
            p402: {
                model: 'gemini-3-flash-preview',
                thinking_level: 'low',
                latency_target_ms: 500
            }
        });

    } catch (error) {
        console.error('Anomaly detection error:', error);
        return NextResponse.json(
            { error: 'Detection failed', code: 'ANOMALY_FAILED' },
            { status: 500 }
        );
    }
}
