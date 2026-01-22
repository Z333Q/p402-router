import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const tenantId = request.headers.get('x-tenant-id') || 'default';

        // 1. Fetch Overrides
        const overridesRes = await db.query(`
            SELECT id, rule_name, task_pattern, original_model, substitute_model, enabled, created_at
            FROM intelligence_model_overrides
            WHERE tenant_id = $1
            ORDER BY created_at DESC
        `, [tenantId]);

        // 2. Fetch Weights (and check for pending)
        const weightsRes = await db.query(`
            SELECT cost_weight, speed_weight, quality_weight, status, proposed_weights, updated_at
            FROM intelligence_routing_weights
            WHERE tenant_id = $1
        `, [tenantId]);

        // 3. Fetch Cache Config
        const cacheRes = await db.query(`
            SELECT similarity_threshold, ttl_hours, max_tokens_to_cache, enabled
            FROM intelligence_cache_config
            WHERE tenant_id = $1
        `, [tenantId]);

        // 4. Fetch Governance
        const settingsRes = await db.query(`
            SELECT governance_mode FROM intelligence_settings WHERE tenant_id = $1
        `, [tenantId]);

        // 5. Fetch Rate Limits
        const rateLimitsRes = await db.query(`
            SELECT id, model_pattern, requests_per_minute, tokens_per_minute, status, enabled
            FROM intelligence_rate_limits
            WHERE tenant_id = $1
        `, [tenantId]);

        // 6. Fetch Failover Chains
        const failoverRes = await db.query(`
            SELECT id, primary_model, fallback_models, status, enabled
            FROM intelligence_failover_chains
            WHERE tenant_id = $1
        `, [tenantId]);

        // 7. Fetch Alerts
        const alertsRes = await db.query(`
            SELECT id, metric, threshold, enabled
            FROM intelligence_alerts
            WHERE tenant_id = $1
        `, [tenantId]);

        return NextResponse.json({
            overrides: overridesRes.rows,
            weights: weightsRes.rows[0] || { cost_weight: 0.33, speed_weight: 0.33, quality_weight: 0.34, status: 'active' },
            cache: cacheRes.rows[0] || { similarity_threshold: 0.85, ttl_hours: 24, max_tokens_to_cache: 4096, enabled: true },
            governance: settingsRes.rows[0]?.governance_mode || 'autonomous',
            rateLimits: rateLimitsRes.rows,
            failover: failoverRes.rows,
            alerts: alertsRes.rows
        });
    } catch (error) {
        console.error('Failed to fetch intelligence config:', error);
        return NextResponse.json({ error: 'Failed to fetch configuration' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const tenantId = request.headers.get('x-tenant-id') || 'default';
        const body = await request.json();
        const { action, id, enabled, mode } = body;

        if (action === 'toggle_override' && id) {
            let table = 'intelligence_model_overrides';
            if (id.startsWith('rl_')) table = 'intelligence_rate_limits';
            if (id.startsWith('fail_')) table = 'intelligence_failover_chains';
            if (id.startsWith('alert_')) table = 'intelligence_alerts';

            await db.query(`
                UPDATE ${table}
                SET enabled = $1, updated_at = NOW()
                WHERE id = $2 AND tenant_id = $3
            `, [enabled, id, tenantId]);
            return NextResponse.json({ success: true });
        }

        if (action === 'set_governance' && mode) {
            await db.query(`
                INSERT INTO intelligence_settings (tenant_id, governance_mode, updated_at)
                VALUES ($1, $2, NOW())
                ON CONFLICT (tenant_id) DO UPDATE SET
                    governance_mode = EXCLUDED.governance_mode,
                    updated_at = NOW()
            `, [tenantId, mode]);
            return NextResponse.json({ success: true });
        }

        if (action === 'approve_optimization' && id) {
            // For overrides
            if (id.startsWith('ovr_')) {
                await db.query(`
                    UPDATE intelligence_model_overrides
                    SET status = 'active', enabled = true, updated_at = NOW()
                    WHERE id = $1 AND tenant_id = $2
                `, [id, tenantId]);
            }
            // For rate limits
            if (id.startsWith('rl_')) {
                await db.query(`
                    UPDATE intelligence_rate_limits
                    SET status = 'active', enabled = true, updated_at = NOW()
                    WHERE id = $1 AND tenant_id = $2
                `, [id, tenantId]);
            }
            // For failover
            if (id.startsWith('fail_')) {
                await db.query(`
                    UPDATE intelligence_failover_chains
                    SET status = 'active', enabled = true, updated_at = NOW()
                    WHERE id = $1 AND tenant_id = $2
                `, [id, tenantId]);
            }
            // For weights (id would be 'weights')
            if (id === 'weights') {
                const pending = await db.query('SELECT proposed_weights FROM intelligence_routing_weights WHERE tenant_id = $1 AND status = \'pending\'', [tenantId]);
                if (pending.rows[0]) {
                    const w = pending.rows[0].proposed_weights;
                    await db.query(`
                        UPDATE intelligence_routing_weights
                        SET cost_weight = $1, speed_weight = $2, quality_weight = $3, status = 'active', proposed_weights = NULL, updated_at = NOW()
                        WHERE tenant_id = $4
                    `, [w.cost, w.speed, w.quality, tenantId]);
                }
            }
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Failed to update intelligence config:', error);
        return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 });
    }
}
