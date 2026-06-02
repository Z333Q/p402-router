import pool from '@/lib/db'
import type { ApiKeyContext } from '@/lib/types/api-key';

export interface Recommendation {
    type: 'MODEL_SWAP' | 'PROVIDER_SWAP' | 'CACHE_LIKELY' | 'APPROACHING_BUDGET';
    tenantId: string;
    message: string;
    potentialSavingsUsd: number;
    details: any;
    // v2_050: per-request advisory may be scoped below tenant.
    apiKeyId?: string | null;
    departmentId?: string | null;
    employeeId?: string | null;
}

export interface RequestAdvisoryInput {
    model?: string;
    taskType?: string;
    /** Estimated cost the router picked. Optional; some advice (model-swap)
     *  doesn't need it. */
    estimatedCostUsd?: number;
}

export class OptimizationEngine {
    /**
     * Analyzes recent decisions to find optimization opportunities.
     * E.g., if a user is using an expensive model for simple tasks.
     */
    static async generateRecommendations(tenantId: string): Promise<Recommendation[]> {
        const recommendations: Recommendation[] = [];

        try {
            // 1. Check for high-cost model usage on simple tasks (Mock-ish logic for MVP)
            const expensiveDecisions = await pool.query(`
                SELECT task, selected_model, AVG(cost_usd) as avg_cost
                FROM router_decisions
                WHERE tenant_id = $1
                  AND (selected_model ILIKE '%gpt-4%' OR selected_model ILIKE '%claude-3-opus%')
                GROUP BY task, selected_model
                HAVING AVG(cost_usd) > 0.05
            `, [tenantId]);

            for (const row of expensiveDecisions.rows) {
                recommendations.push({
                    type: 'MODEL_SWAP',
                    tenantId,
                    message: `Consider swapping ${row.selected_model} for a faster model on '${row.task}' tasks.`,
                    potentialSavingsUsd: row.avg_cost * 0.8, // Estimate 80% savings
                    details: {
                        task: row.task,
                        currentModel: row.selected_model,
                        suggestedModel: 'gpt-4o-mini'
                    }
                });
            }

            // 2. Check for cache miss opportunities (if many repeats are MISSes)
            // (Skipped for now, but could be added later)

            return recommendations;
        } catch (e) {
            console.error('[OptimizationEngine] Analysis failed:', e);
            return [];
        }
    }

    static async getRecommendationsForTenant(tenantId: string): Promise<Recommendation[]> {
        return this.generateRecommendations(tenantId);
    }

    static async getGlobalRecommendations(): Promise<Recommendation[]> {
        const demoTenantId = '00000000-0000-0000-0000-000000000001';
        return this.getRecommendationsForTenant(demoTenantId);
    }

    /**
     * Per-request advisory for the Optimize layer of the Meter stack.
     *
     * Runs after routing chose a provider. Non-blocking by contract: never
     * throws, returns [] on failure. Caller should fire-and-forget the result
     * into traffic_events metadata or an out-of-band channel.
     *
     * Current advice surface:
     *   - MODEL_SWAP for expensive models on cheap tasks (mirrors batch
     *     heuristic, but scoped to the key's owner so a department dashboard
     *     can attribute the suggestion).
     *
     * Future advice (lands with ai_optimization_recommendations table):
     *   - CACHE_LIKELY from semantic-cache near-miss
     *   - APPROACHING_BUDGET when MTD spend > 80% of cap
     */
    static async analyzeForContext(
        ctx: ApiKeyContext,
        req: RequestAdvisoryInput,
    ): Promise<Recommendation[]> {
        const recs: Recommendation[] = [];

        try {
            if (
                req.model &&
                req.estimatedCostUsd !== undefined &&
                req.estimatedCostUsd > 0.05 &&
                /gpt-4(?!o-mini)|claude-3-opus|claude-opus/i.test(req.model)
            ) {
                recs.push({
                    type: 'MODEL_SWAP',
                    tenantId: ctx.tenantId,
                    apiKeyId: ctx.apiKeyId,
                    departmentId: ctx.departmentId,
                    employeeId: ctx.employeeId,
                    message: `Cheaper model likely sufficient for '${req.taskType ?? 'inference'}'`,
                    potentialSavingsUsd: req.estimatedCostUsd * 0.8,
                    details: {
                        currentModel: req.model,
                        suggestedModel: 'gpt-4o-mini',
                        taskType: req.taskType,
                    },
                });
            }
            return recs;
        } catch (e) {
            console.error('[OptimizationEngine] analyzeForContext failed:', e);
            return [];
        }
    }
}
