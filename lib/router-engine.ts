import pool from './db'
import { SemanticCache } from './cache-engine'
import { FacilitatorAdapter, FacilitatorProbe } from './facilitator-adapters'
import { CoinbaseCDPAdapter } from './facilitator-adapters/cdp'
import { GenericAdapter } from './facilitator-adapters/generic'
import { CCIPBridgeAdapter } from './facilitator-adapters/ccip'
import { SmartContractAdapter } from './facilitator-adapters/smart-contract'
import { GeminiOptimizer } from './intelligence/gemini-optimizer'

export type RoutingMode = 'cost' | 'quality' | 'speed' | 'balanced';

export type FacilitatorCandidate = {
    facilitatorId: string
    name: string
    score: number
    supported: boolean
    health: FacilitatorProbe
    payment?: {
        treasuryAddress: string
        mode?: string
        abi?: any
        recommendedFeeBps?: number
    }
}

// DB Row Interface
interface FacilitatorDbRow {
    facilitator_id: string;
    name: string;
    status: 'active' | 'inactive';
    health_status: 'healthy' | 'degraded' | 'down' | null;
    p95_settle_ms: number | null;
    success_rate: number | null;
    reputation_score: number | null;
    endpoint: string;
    networks: string[];
    auth_config: any;
    capabilities: any; // Task-specific capabilities JSONB
    last_checked_at: string | null;
}

export class RoutingEngine {
    static async plan(
        routeContext: { routeId: string, method: string, path: string },
        paymentContext: { network: string, scheme: string, amount: string, asset: string },
        options?: {
            sourceNetwork?: string,
            mode?: RoutingMode,
            requestId?: string,
            tenantId?: string,
            task?: string,
            prompt?: string // New for Caching
        }
    ): Promise<{ candidates: FacilitatorCandidate[], selectedId: string, cacheHit?: boolean }> {

        const mode = options?.mode || 'cost';
        const tenantId = options?.tenantId;
        const prompt = options?.prompt;

        // 1. Semantic Cache Pre-flight (Spec 4.4)
        if (tenantId && prompt) {
            const cache = await SemanticCache.lookup(prompt, tenantId);
            if (cache.found) {
                // Log Decision as Cache Hit
                if (options?.requestId) {
                    await pool.query(`
                        INSERT INTO router_decisions (
                            request_id, tenant_id, task, requested_mode, 
                            selected_provider_id, reason, success, cost_usd
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    `, [
                        options.requestId, tenantId, options.task || 'inference',
                        mode, 'cache_engine', 'semantic_hit', true, 0
                    ]);
                }

                return {
                    candidates: [],
                    selectedId: 'cache_engine',
                    cacheHit: true
                };
            }
        }

        // 2. Intelligence Overrides (Autonomous Optimization)
        if (tenantId) {
            const overridesRes = await pool.query(`
                SELECT substitute_model, task_pattern, original_model 
                FROM intelligence_model_overrides 
                WHERE tenant_id = $1 AND enabled = TRUE
            `, [tenantId]);

            for (const row of overridesRes.rows) {
                let match = true;
                if (row.task_pattern && options?.task && !new RegExp(row.task_pattern, 'i').test(options.task)) {
                    match = false;
                }

                if (match && row.substitute_model) {
                    // Intelligence Interception
                    if (options?.requestId) {
                        await pool.query(`
                            INSERT INTO router_decisions (
                                request_id, tenant_id, task, requested_mode, 
                                selected_provider_id, reason, success, cost_usd
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        `, [
                            options.requestId, tenantId, options.task || 'inference',
                            mode, row.substitute_model, 'intelligence_override', true, 0
                        ]);
                    }

                    return {
                        candidates: [{
                            facilitatorId: row.substitute_model,
                            name: `AI Optimized: ${row.substitute_model}`,
                            score: 100,
                            supported: true,
                            health: { status: 'healthy', p95VerifyMs: 0, p95SettleMs: 0, successRate: 1.0, lastCheckedAt: new Date().toISOString() }
                        }],
                        selectedId: row.substitute_model
                    };
                }
            }
        }

        // 3. Sentinel Proactive Anomaly Detection (Hot-Path protection)
        let activeMode = mode;
        if (tenantId && prompt && process.env.GOOGLE_API_KEY) {
            const optimizer = new GeminiOptimizer(process.env.GOOGLE_API_KEY, tenantId);
            const scan = await optimizer.scanRequest({
                prompt,
                task: options?.task,
                tenantId,
                routeId: routeContext.routeId
            });

            if (scan.anomaly) {
                console.log(`[Sentinel] Anomaly detected: ${scan.issues.join(', ')} (Severity: ${scan.severity})`);

                if (scan.severity === 'high') {
                    // BLOCK: Potential exploit or extreme risk
                    throw new Error(`SECURITY_BLOCK: Sentinel detected high severity anomaly: ${scan.issues[0]}`);
                }

                if (scan.severity === 'medium' && scan.suggestedMode) {
                    // DEGRADE/RECOVER: Switch to a more cautious mode
                    activeMode = scan.suggestedMode;
                }
            }
        }
        const adapters: FacilitatorAdapter[] = [
            new CCIPBridgeAdapter(),
            new CoinbaseCDPAdapter(),
            new SmartContractAdapter()
        ];
        const candidates: FacilitatorCandidate[] = [];
        const dbFacilitators = new Map<string, FacilitatorDbRow>();

        // Detect cross-chain requirement
        const isCrossChain = options?.sourceNetwork && options.sourceNetwork !== paymentContext.network;

        try {
            // Join with health table to get cached stats for fast planning
            const res = await pool.query(`
                SELECT f.*, fh.status as health_status, fh.p95_settle_ms, fh.success_rate 
                FROM facilitators f
                LEFT JOIN facilitator_health fh ON f.facilitator_id = fh.facilitator_id
                WHERE f.status IN ('active', 'inactive')
            `);

            // Index DB rows by facilitator_id for fast lookup
            for (const row of res.rows as FacilitatorDbRow[]) {
                dbFacilitators.set(row.facilitator_id, row);

                // Add dynamic facilitators from DB if not already in presets
                if (!adapters.some(a => a.id === row.facilitator_id)) {
                    adapters.push(new GenericAdapter({
                        id: row.facilitator_id,
                        name: row.name,
                        networks: row.networks || [],
                        endpoint: row.endpoint,
                        authConfig: row.auth_config
                    }));
                }
            }
        } catch (e) {
            console.error("[RoutingEngine] DB fetch failed, falling back to static adapters:", e);
        }

        // Fetch Intelligence Weights
        let weights = { cost: 0.33, speed: 0.33, quality: 0.34 };
        if (tenantId) {
            const weightsRes = await pool.query('SELECT cost_weight, speed_weight, quality_weight FROM intelligence_routing_weights WHERE tenant_id = $1', [tenantId]);
            if (weightsRes.rows.length > 0) {
                weights = {
                    cost: parseFloat(weightsRes.rows[0].cost_weight),
                    speed: parseFloat(weightsRes.rows[0].speed_weight),
                    quality: parseFloat(weightsRes.rows[0].quality_weight)
                };
            }
        }

        // Scoring Loop
        for (const adapter of adapters) {
            const isSupported = adapter.supports({
                network: paymentContext.network,
                scheme: paymentContext.scheme,
                asset: paymentContext.asset
            });

            const dbRow = dbFacilitators.get(adapter.id);
            const status = dbRow?.status || 'active';
            const healthStatus = dbRow?.health_status || 'unknown';
            const successRate = dbRow?.success_rate !== null && dbRow?.success_rate !== undefined ? dbRow?.success_rate : 1.0;
            const p95 = dbRow?.p95_settle_ms || 0;
            const reputation = dbRow?.reputation_score || 100;

            let score = 0;

            if (status === 'active' && isSupported) {
                // Base Score
                score = 100;

                // Health Penalty (Universal)
                if (healthStatus === 'down') score = 0;
                else if (healthStatus === 'degraded') score -= 50;
                else if (healthStatus === 'unknown') score -= 10;

                // V2 Mode Logic
                // ---------------------------------------------------------
                if (activeMode === 'cost') {
                    // For cost optimization, we penalize high latency less, favor on-chain direct (low fee)
                    // Assumption: Direct on-chain is cheaper than bridge/intermediary
                    if (adapter.id.includes('direct')) score += 20;
                    if (adapter.id.includes('bridge')) score -= 10; // Bridges have fees
                } else if (activeMode === 'speed') {
                    // Latency is king
                    if (p95 > 2000) score -= 80;
                    else if (p95 > 1000) score -= 40;
                    else if (p95 > 500) score -= 10;
                    else if (p95 < 200) score += 20;
                } else if (activeMode === 'quality') {
                    // Reputation is king
                    score += (reputation - 100); // Direct impact
                    if (successRate < 0.99) score -= 50; // Strict reliability
                } else if (activeMode === 'balanced') {
                    // Mixed weights (Intelligence Driven)
                    const costPenalty = p95 > 1500 ? 20 : 0;
                    const reputationBonus = (reputation - 100) / 4;

                    // Simple weighted linear combination of preferences
                    score += (weights.quality * reputationBonus * 2);
                    score -= (weights.speed * (p95 / 100));
                    score += (weights.cost * 20); // Base bonus for being in scoring loop
                }

                // Reliability Base Penalty
                if (successRate < 1.0) {
                    score -= (1.0 - successRate) * 200; // Heavy penalty for failure
                }

                // SMART CONTRACT PREFERENCE (Fee Enforcement)
                if (adapter.id === 'fac_p402_settlement_v1') {
                    score += 200; // Always prefer the settlement contract over direct transfers
                }

                // TASK-BASED ROUTING (Spec 4.1)
                if (options?.task && dbRow?.capabilities) {
                    const taskStr = options.task;
                    const capabilityScore = dbRow.capabilities[taskStr];
                    if (typeof capabilityScore === 'number') {
                        // Bonus proportional to capability (0.0 to 1.0)
                        score += Math.round(capabilityScore * 100);
                    }
                }

                // CROSS-CHAIN LOGIC
                if (isCrossChain) {
                    const isBridge = adapter.id.includes('bridge') || adapter.id.includes('ccip');
                    if (isBridge) {
                        score += 50; // Bridge Boost
                    } else {
                        score -= 300; // Heavy penalty since they can't cross-chain
                    }
                }
            }

            candidates.push({
                facilitatorId: adapter.id,
                name: adapter.name,
                score: Math.max(0, Math.round(score)),
                supported: isSupported,
                health: {
                    status: (healthStatus === 'unknown' ? 'degraded' : healthStatus) as 'healthy' | 'degraded' | 'down',
                    p95VerifyMs: 0,
                    p95SettleMs: p95,
                    successRate: successRate,
                    lastCheckedAt: (dbRow && dbRow.last_checked_at) || new Date().toISOString()
                },
                payment: (adapter && typeof adapter.getPaymentConfig === 'function') ? adapter.getPaymentConfig() : undefined
            });
        }

        // Sort by score
        const sorted = [...candidates].sort((a, b) => {
            if (a.score !== b.score) return b.score - a.score;
            return b.supported ? 1 : -1;
        });

        // FAILOVER LOGIC (Spec 4.1)
        // If top candidate is degraded or unknown, perform a live probe
        const primary = sorted[0];
        const topCandidate = (primary && primary.score > 0) ? primary : null;
        let finalSelectedId = topCandidate ? topCandidate.facilitatorId : '';

        if (finalSelectedId && topCandidate && topCandidate.health.status !== 'healthy') {
            const topAdapter = adapters.find(a => a.id === finalSelectedId);
            if (topAdapter) {
                try {
                    const liveHealth = await topAdapter.probe();
                    if (liveHealth.status === 'down') {
                        console.log(`[Router] Failover trigger! ${finalSelectedId} is DOWN. Trying next...`);
                        // Move to next best
                        const nextBest = sorted.find(c => c.facilitatorId !== finalSelectedId && c.score > 0);
                        if (nextBest) {
                            finalSelectedId = nextBest.facilitatorId;
                        }
                    }
                } catch (e) {
                    console.error(`[Router] Live probe failed for ${finalSelectedId}:`, e);
                }
            }
        }

        const selectedId = finalSelectedId;

        // Record Decision (V2 Spec 6.2)
        if (options && options.requestId && options.tenantId) {
            try {
                // Alternatives: Top 3 that were not selected
                const alternatives = sorted.slice(1, 4).map(c => ({
                    provider: c.facilitatorId,
                    score: c.score,
                    reason: !c.supported ? 'unsupported' : c.score === 0 ? 'health_down' : 'lower_score'
                }));

                await pool.query(`
                    INSERT INTO router_decisions (
                        request_id, tenant_id, route_id, task, requested_mode, 
                        selected_provider_id, reason, alternatives, 
                        success, cost_usd
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                `, [
                    options.requestId,
                    options.tenantId,
                    routeContext.routeId,
                    options.task || 'unknown',
                    mode,
                    selectedId,
                    selectedId ? 'scored_optimal' : 'no_route',
                    JSON.stringify(alternatives),
                    !!selectedId,
                    0 // Cost unknown at planning time
                ]);
            } catch (e) {
                console.error("[RoutingEngine] Failed to log decision:", e);
            }
        }

        return {
            candidates: sorted,
            selectedId,
            cacheHit: false
        };
    }
}
