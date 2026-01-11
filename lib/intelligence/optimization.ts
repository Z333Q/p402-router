import pool from '@/lib/db'

export interface Recommendation {
    type: 'MODEL_SWAP' | 'PROVIDER_SWAP';
    tenantId: string;
    message: string;
    potentialSavingsUsd: number;
    details: any;
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
}
