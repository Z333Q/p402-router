
import { NextRequest, NextResponse } from 'next/server';
import { AP2PolicyEngine } from '@/lib/ap2-policy-engine';
import { pushNotificationService } from '@/lib/push-service';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    try {
        const body = await req.json();
        const { amount_usd, task_id, category } = body;

        if (!amount_usd) {
            return NextResponse.json({ error: 'Amount required' }, { status: 400 });
        }

        // 1. Verify Policy
        const policyResult = await AP2PolicyEngine.verifyMandate(id, Number(amount_usd), category);

        if (!policyResult.valid) {
            // Map common policy errors to HTTP/JSON-RPC-like responses
            // Since this is REST, we return JSON with the error structure as requested
            // Use the error object if present, or fallback
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
