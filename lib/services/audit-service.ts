import db from '@/lib/db';
import type { AuditContractPayload, AuditDomain, AuditGrade, AuditScopeType, PlanTier } from '@/lib/types/audit';

function scoreToGrade(score: number): AuditGrade {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
}

/**
 * Fetches the latest audit summary for a given scope from the DB.
 * Runs server-side only — never called from client components.
 * Processes queries sequentially to protect the 20-connection Neon pool.
 */
export async function getAuditSummaryForScope(
    tenantId: string,
    scopeType: AuditScopeType,
    scopeId: string
): Promise<AuditContractPayload | null> {
    // Step 1: Fetch latest score (sequential — no Promise.all on pool-intensive queries)
    const scoreRes = await db.query(
        `SELECT * FROM audit_scores
         WHERE tenant_id = $1 AND scope_type = $2 AND scope_id = $3
         ORDER BY computed_at DESC LIMIT 1`,
        [tenantId, scopeType, scopeId]
    );

    if (scoreRes.rows.length === 0) return null;
    const scoreRow = scoreRes.rows[0];

    // Step 2: Fetch top 3 findings (severity-ordered)
    const findingsRes = await db.query(
        `SELECT af.*, 
            COALESCE(
                json_agg(afa ORDER BY afa.requires_plan ASC) FILTER (WHERE afa.id IS NOT NULL),
                '[]'
            ) AS actions
         FROM audit_findings af
         LEFT JOIN audit_finding_actions afa ON afa.finding_id = af.id
         WHERE af.tenant_id = $1 AND af.scope_type = $2 AND af.scope_id = $3 AND af.status = 'open'
         GROUP BY af.id
         ORDER BY CASE af.severity
             WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4
         END ASC
         LIMIT 3`,
        [tenantId, scopeType, scopeId]
    );

    // Step 3: Count all open findings
    const countRes = await db.query(
        `SELECT id FROM audit_findings WHERE tenant_id = $1 AND scope_type = $2 AND scope_id = $3 AND status = 'open'`,
        [tenantId, scopeType, scopeId]
    );

    // Step 4: Fetch plan entitlements
    const planRes = await db.query(
        `SELECT plan FROM tenants WHERE id = $1`,
        [tenantId]
    );
    const planTier = (planRes.rows[0]?.plan || 'free') as PlanTier;

    const runCountRes = await db.query(
        `SELECT COUNT(*) as cnt FROM audit_runs
         WHERE tenant_id = $1 AND started_at > NOW() - INTERVAL '1 month'`,
        [tenantId]
    );
    const runsThisMonth = parseInt(runCountRes.rows[0]?.cnt || '0', 10);
    const maxRuns = planTier === 'free' ? 5 : planTier === 'pro' ? 50 : 999;

    const overallScore = scoreRow.overall_score as number;

    return {
        version: '2026-02-22',
        tenant_id: tenantId,
        scope: { type: scopeType, id: scopeId, label: scopeId },
        overall_score: {
            score: overallScore,
            grade: scoreToGrade(overallScore),
            delta_7d: 0,
            last_computed_at: scoreRow.computed_at,
        },
        domain_breakdown: [
            { domain: 'integration', score: scoreRow.integration_score, grade: scoreToGrade(scoreRow.integration_score), finding_count: 0 },
            { domain: 'runtime', score: scoreRow.runtime_score, grade: scoreToGrade(scoreRow.runtime_score), finding_count: 0 },
            { domain: 'trust', score: scoreRow.trust_score, grade: scoreToGrade(scoreRow.trust_score), finding_count: 0 },
            { domain: 'governance', score: scoreRow.governance_score, grade: scoreToGrade(scoreRow.governance_score), finding_count: 0 },
        ],
        top_findings: findingsRes.rows.map(r => ({
            finding_id: r.id,
            tenant_id: r.tenant_id,
            scope_type: r.scope_type,
            scope_id: r.scope_id,
            code: r.code,
            domain: r.domain,
            severity: r.severity,
            status: r.status,
            title: r.title,
            summary: r.summary,
            user_impact: r.user_impact,
            technical_detail: r.technical_detail,
            recommendation: r.recommendation,
            impact_estimate: r.impact_estimate_json || {},
            plan_visibility: r.plan_visibility_json || { visible: true, detail_level: 'full' },
            docs_slug: r.docs_slug,
            actions: r.actions || [],
            first_seen_at: r.first_seen_at,
            last_seen_at: r.last_seen_at,
            occurrence_count_24h: r.occurrence_count_24h,
            occurrence_count_7d: r.occurrence_count_7d,
        })),
        all_finding_ids: countRes.rows.map(r => r.id),
        entitlements: {
            plan_tier: planTier,
            runs_remaining_this_month: Math.max(0, maxRuns - runsThisMonth),
            max_runs_per_month: maxRuns,
            scheduled_audits_enabled: planTier !== 'free',
            regression_detection_enabled: planTier === 'enterprise',
            export_enabled: planTier !== 'free',
            max_domains: ['integration', 'runtime', 'trust', 'governance'] as AuditDomain[],
        },
        run_id: scoreRow.audit_run_id,
    };
}

/**
 * Returns estimated cost savings for the upgrade math banner.
 */
export async function getUpgradeMath(tenantId: string): Promise<{
    monthly_volume_usd: number;
    estimated_savings_usd: number;
    failed_settle_rate_pct: number;
}> {
    const res = await db.query(
        `SELECT 
            COALESCE(SUM(amount_usd_micros) / 1000000.0, 0) AS volume,
            COALESCE(
                100.0 * COUNT(*) FILTER (WHERE status = 'failed') / NULLIF(COUNT(*), 0),
                0
            ) AS fail_rate
         FROM x402_payments
         WHERE tenant_id = $1 AND created_at > NOW() - INTERVAL '30 days'`,
        [tenantId]
    );

    const volume = parseFloat(res.rows[0]?.volume || '0');
    const failRate = parseFloat(res.rows[0]?.fail_rate || '0');
    // Pro fee is 0.75%, Free is 1.00% -> Savings = 0.25% of volume
    const estimatedSavings = volume * (0.01 - 0.0075);

    return {
        monthly_volume_usd: parseFloat(volume.toFixed(2)),
        estimated_savings_usd: parseFloat(estimatedSavings.toFixed(2)),
        failed_settle_rate_pct: parseFloat(failRate.toFixed(1)),
    };
}
