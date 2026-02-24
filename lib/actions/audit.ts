'use server';

import db from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ApiError } from '@/lib/errors';
import type { AuditDomain } from '@/lib/types/audit';

export interface AuditActionState {
    success: boolean;
    jobId?: string;
    error?: string;
    requiredPlan?: string;
}

export async function runAuditAction(
    prevState: AuditActionState,
    formData: FormData
): Promise<AuditActionState> {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return { success: false, error: 'Unauthorized' };
        }
        const tenantId = (session.user as any).tenantId as string;
        if (!tenantId) {
            return { success: false, error: 'No tenant context found.' };
        }

        const scopeType = formData.get('scopeType') as string;
        const scopeId = formData.get('scopeId') as string;

        if (!scopeType || !scopeId) {
            return { success: false, error: 'Missing scope parameters.' };
        }

        // 1. Plan Guard: Free tier capped at 5 runs/month
        const planRes = await db.query(
            `SELECT plan FROM tenants WHERE id = $1`,
            [tenantId]
        );
        const planCode = planRes.rows[0]?.plan || 'free';

        if (planCode === 'free') {
            const runCount = await db.query(
                `SELECT COUNT(*) as cnt FROM audit_runs
                 WHERE tenant_id = $1 AND started_at > NOW() - INTERVAL '1 month'`,
                [tenantId]
            );
            if (parseInt(runCount.rows[0]?.cnt || '0', 10) >= 5) {
                return {
                    success: false,
                    error: 'Free tier limit reached (5 audits/month).',
                    requiredPlan: 'pro',
                };
            }
        }

        // 2. Dispatch: Queue the audit run
        const domains: AuditDomain[] = ['integration', 'runtime', 'trust', 'governance'];

        const runRes = await db.query(
            `INSERT INTO audit_runs (tenant_id, scope_type, scope_id, domains, trigger_source, status, plan_tier_snapshot)
             VALUES ($1, $2, $3, $4, 'user_click', 'queued', $5)
             RETURNING id`,
            [tenantId, scopeType, scopeId, domains, planCode]
        );

        return { success: true, jobId: runRes.rows[0].id };

    } catch (error: any) {
        console.error('[ACTION] runAudit failed:', error);
        return { success: false, error: 'Internal Server Error' };
    }
}

export async function applyFixAction(
    findingId: string,
    actionId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return { success: false, error: 'Unauthorized' };
        const tenantId = (session.user as any).tenantId as string;

        // Verify ownership before applying
        const check = await db.query(
            `SELECT af.id FROM audit_findings af
             JOIN audit_finding_actions afa ON afa.finding_id = af.id
             WHERE af.id = $1 AND af.tenant_id = $2 AND afa.action_id = $3`,
            [findingId, tenantId, actionId]
        );

        if (check.rows.length === 0) {
            return { success: false, error: 'Finding or action not found.' };
        }

        // Mark the finding as in_progress when a fix is applied
        await db.query(
            `UPDATE audit_findings SET status = 'in_progress' WHERE id = $1 AND tenant_id = $2`,
            [findingId, tenantId]
        );

        return { success: true };

    } catch (error: any) {
        console.error('[ACTION] applyFixAction failed:', error);
        return { success: false, error: 'Internal Server Error' };
    }
}
