import db from '@/lib/db'; // STRICT RULE: Default export
import redis from '@/lib/redis';
import { getAuditSummaryForScope } from '@/lib/services/audit-service';
import type { AuditDomain, Severity } from '@/lib/types/audit';

// Base penalty weights by severity
const SEVERITY_PENALTY: Record<Severity, number> = {
    critical: 20,
    high: 10,
    medium: 5,
    low: 2,
    info: 0,
};

export async function processAuditJob(jobId: string) {
    console.log(`[AUDIT_ENGINE] Starting job ${jobId}`);

    try {
        // 1. Lock the job and set to running
        const jobRes = await db.query(
            `UPDATE audit_runs SET status = 'running' WHERE id = $1 AND status = 'queued' RETURNING *`,
            [jobId]
        );

        const job = jobRes.rows[0];
        if (!job) {
            console.warn(`[AUDIT_ENGINE] Job ${jobId} not found or already running.`);
            return;
        }

        const { tenant_id, scope_type, scope_id, domains } = job;

        // 2. Rule Evaluation (Mocking the business logic for brevity)
        // In production, you would fetch the route config and evaluate it here.
        const detectedFindings = [];

        // Example Check: Integration - Idempotency Key Missing
        const hasIdempotency = false; // Evaluated from route config
        if (!hasIdempotency) {
            detectedFindings.push({
                code: 'INT_IDEMPOTENCY_KEY_MISSING',
                domain: 'integration',
                severity: 'critical',
                title: 'Missing Idempotency Key on Settle Path',
                summary: 'Route allows duplicate settlements if client retries.',
                user_impact: 'High risk of double-charging users during network blips.',
                technical_detail: 'The POST /settle endpoint requires an x-idempotency-key header.',
                recommendation: 'Pass a unique UUID in the x-idempotency-key header for every transaction.',
            });
        }

        // Example Check: Runtime - Retries Disabled
        const hasRetries = false; // Evaluated from route config
        if (!hasRetries) {
            detectedFindings.push({
                code: 'RUN_RETRY_DISABLED',
                domain: 'runtime',
                severity: 'high',
                title: 'Retry Policy Disabled on Production Route',
                summary: 'Failed LLM provider calls will bubble up to the end user.',
                user_impact: 'Lower reliability and higher user drop-off.',
                technical_detail: 'Route config lacks fallback providers or retry attempts.',
                recommendation: 'Enable retries and configure a secondary AI provider fallback.',
            });
        }

        // 3. Sequential Idempotent Upserts (Protects the 20-conn pool)
        for (const finding of detectedFindings) {
            await db.query(
                `INSERT INTO audit_findings (
            tenant_id, scope_type, scope_id, code, domain, severity, status, 
            title, summary, user_impact, technical_detail, recommendation
         ) VALUES ($1, $2, $3, $4, $5, $6, 'open', $7, $8, $9, $10, $11)
         ON CONFLICT (tenant_id, scope_type, scope_id, code) 
         DO UPDATE SET 
            occurrence_count_24h = audit_findings.occurrence_count_24h + 1,
            occurrence_count_7d = audit_findings.occurrence_count_7d + 1,
            last_seen_at = NOW(),
            status = CASE WHEN audit_findings.status = 'resolved' THEN 'open' ELSE audit_findings.status END`,
                [
                    tenant_id, scope_type, scope_id, finding.code, finding.domain, finding.severity,
                    finding.title, finding.summary, finding.user_impact, finding.technical_detail, finding.recommendation
                ]
            );
        }

        // 4. Calculate Scores
        // Fetch all currently open findings for this scope
        const openFindingsRes = await db.query(
            `SELECT domain, severity FROM audit_findings 
       WHERE tenant_id = $1 AND scope_type = $2 AND scope_id = $3 AND status IN ('open', 'acknowledged', 'ignored')`,
            [tenant_id, scope_type, scope_id]
        );

        let intScore = 100, runScore = 100, trustScore = 100, govScore = 100;

        for (const row of openFindingsRes.rows) {
            const penalty = SEVERITY_PENALTY[row.severity as Severity] || 0;
            if (row.domain === 'integration') intScore = Math.max(0, intScore - penalty);
            if (row.domain === 'runtime') runScore = Math.max(0, runScore - penalty);
            if (row.domain === 'trust') trustScore = Math.max(0, trustScore - penalty);
            if (row.domain === 'governance') govScore = Math.max(0, govScore - penalty);
        }

        const overallScore = Math.round((intScore * 0.35) + (runScore * 0.30) + (trustScore * 0.20) + (govScore * 0.15));

        // 5. Insert Score Record
        await db.query(
            `INSERT INTO audit_scores (audit_run_id, tenant_id, scope_type, scope_id, overall_score, integration_score, runtime_score, trust_score, governance_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [jobId, tenant_id, scope_type, scope_id, overallScore, intScore, runScore, trustScore, govScore]
        );

        // 6. Mark Job Success
        await db.query(`UPDATE audit_runs SET status = 'success', finished_at = NOW() WHERE id = $1`, [jobId]);

        // 7. Fire Redis Pub/Sub to trigger TanStack React Query via SSE
        if (redis) {
            const updatedPayload = await getAuditSummaryForScope(tenant_id, scope_type, scope_id);
            const channel = `audit_updates:${tenant_id}:${scope_type}:${scope_id}`;

            await redis.publish(channel, JSON.stringify({
                type: 'AUDIT_SUCCESS',
                data: updatedPayload
            }));
            console.log(`[AUDIT_ENGINE] Published AUDIT_SUCCESS to ${channel}`);
        }

    } catch (error) {
        console.error(`[AUDIT_ENGINE] Job ${jobId} failed:`, error);
        await db.query(
            `UPDATE audit_runs SET status = 'failed', finished_at = NOW(), error_message = $2 WHERE id = $1`,
            [jobId, error instanceof Error ? error.message : 'Unknown error']
        );

        // Notify UI of failure
        if (redis) {
            // Need to retrieve tenant_id and scope from job if it failed mid-flight, safely abstracted here.
            // redis.publish(...)
        }
    }
}
