import { NextRequest, NextResponse } from 'next/server';
import { GeminiOptimizer } from '@/lib/intelligence/gemini-optimizer';
import db from '@/lib/db';
import { checkRateLimit, getLedgerData } from '@/lib/intelligence/api-helpers';

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

        const rateLimit = await checkRateLimit(tenantId, 'audit');
        if (!rateLimit.allowed) {
            return NextResponse.json(
                {
                    error: 'Rate limit exceeded',
                    code: 'RATE_LIMITED',
                    retry_after: Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
                },
                {
                    status: 429,
                    headers: {
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': String(rateLimit.resetAt),
                        'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000))
                    }
                }
            );
        }

        const body = await request.json().catch(() => ({}));
        const {
            days = 7,
            execute_actions = true,
            max_actions = 10,
            dry_run = false
        } = body;

        const decisions = await getLedgerData(tenantId, days);

        if (decisions.length === 0) {
            return NextResponse.json({
                audit_id: `audit_empty_${Date.now()}`,
                tenant_id: tenantId,
                thinking_trace: ['No routing data found for the specified time period'],
                optimizations: [],
                executed_optimizations: [],
                total_estimated_savings_usd: 0,
                created_at: new Date().toISOString(),
                model_used: 'gemini-3-pro-preview',
                thinking_level: 'high',
                context_tokens_used: 0,
                p402: { cached: false, source: 'empty_ledger' }
            });
        }

        const optimizer = new GeminiOptimizer(GOOGLE_API_KEY, tenantId);
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                const sendUpdate = (data: any) => {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                };

                try {
                    const result = await optimizer.runForensicAudit(decisions, {
                        executeOptimizations: execute_actions && !dry_run,
                        maxOptimizations: max_actions,
                        onProgress: (step: string) => {
                            sendUpdate({ type: 'step', content: step });
                        }
                    });

                    // Save result to DB
                    await db.query(`
                        INSERT INTO intelligence_audits (
                            audit_id, tenant_id, findings_count, actions_executed, 
                            total_savings_usd, created_at
                        ) VALUES ($1, $2, $3, $4, $5, $6)
                    `, [
                        result.audit_id,
                        tenantId,
                        result.optimizations.length,
                        result.executed_optimizations.length,
                        result.total_estimated_savings_usd,
                        result.created_at.toISOString()
                    ]);

                    sendUpdate({ type: 'done', result });
                } catch (error) {
                    sendUpdate({ type: 'error', message: error instanceof Error ? error.message : 'Audit failed' });
                } finally {
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            }
        });

    } catch (error) {
        console.error('Intelligence audit error:', error);
        return NextResponse.json(
            {
                error: 'Internal server error',
                code: 'AUDIT_FAILED',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
