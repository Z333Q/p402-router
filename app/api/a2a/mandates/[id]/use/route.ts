
import { NextRequest, NextResponse } from 'next/server';
import { AP2PolicyEngine } from '@/lib/ap2-policy-engine';
import { pushNotificationService } from '@/lib/push-service';
import { query } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    try {
        const body = await req.json();
        const { amount_usd, task_id, category, agent_did } = body;

        if (!amount_usd) {
            return NextResponse.json({ error: 'Amount required' }, { status: 400 });
        }

        // 1. Verify Policy & Trust Guard (ERC-8004 validation)
        const policyResult = await AP2PolicyEngine.verifyMandate(id, Number(amount_usd), category, agent_did);

        if (!policyResult.valid) {
            // Log violation against grantor's World ID reputation (non-blocking)
            const VIOLATION_CODES = new Set(['BUDGET_EXCEEDED', 'MANDATE_EXPIRED', 'CATEGORY_NOT_ALLOWED', 'MANDATE_INACTIVE']);
            if (policyResult.error && VIOLATION_CODES.has(policyResult.error.code)) {
                Promise.resolve().then(async () => {
                    try {
                        const res = await query(
                            'SELECT human_id_hash FROM ap2_mandates WHERE id = $1',
                            [id]
                        );
                        const row = res.rows[0] as { human_id_hash: string | null } | undefined;
                        if (row?.human_id_hash) {
                            const { recordDispute } = await import('@/lib/identity/reputation');
                            await recordDispute(row.human_id_hash);
                        }
                    } catch { /* non-blocking */ }
                });
            }

            // Map common policy errors to HTTP/JSON-RPC-like responses
            // Since this is REST, we return JSON with the error structure as requested
            // Specially format SECURITY_PACK_BLOCKED to match JSON-RPC -32005 pattern
            if (policyResult.error?.code === 'SECURITY_PACK_BLOCKED') {
                return NextResponse.json({
                    error: {
                        code: -32005,
                        message: policyResult.error.message,
                        data: policyResult.error.data
                    }
                }, { status: 403 });
            }

            return NextResponse.json({
                error: policyResult.error || { code: 'UNKNOWN', message: 'Unknown error' }
            }, { status: 403 });
        }

        // 2. Record Usage
        await AP2PolicyEngine.recordUsage(id, Number(amount_usd));

        // 3. Notify via Push
        try {
            const mRes = await AP2PolicyEngine.getMandate(id);
            if (mRes) {
                pushNotificationService.notifyMandateUsed({
                    mandate_id: id,
                    tenant_id: mRes.tenant_id,
                    amount_used: Number(amount_usd),
                    remaining: Number((mRes.constraints as any).max_amount_usd) - Number(mRes.amount_spent_usd),
                    task_id
                }).catch((err: any) => console.error('Push Notification Error:', err));
            }
        } catch (err: any) {
            console.error('Failed to trigger mandate notification:', err);
        }

        // 4. Link to Task if provided
        if (task_id) {
            // query('UPDATE a2a_tasks SET mandate_id = $1 WHERE id = $2', [id, task_id])
        }

        return NextResponse.json({ success: true, authorized: true });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
