/**
 * P402 V2 Analytics Recommendations Endpoint
 * ===========================================
 * AI-powered cost optimization recommendations.
 * Analyzes usage patterns and suggests cheaper alternatives.
 * 
 * GET /api/v2/analytics/recommendations
 * 
 * V2 Spec: Section 4.3 (Cost Intelligence)
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getProviderRegistry } from '@/lib/ai-providers';

interface Recommendation {
    id: string;
    type: 'model_switch' | 'provider_switch' | 'caching' | 'batching' | 'tier_downgrade' | 'rate_optimization';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    current: {
        provider?: string;
        model?: string;
        monthly_cost_usd?: number;
        requests?: number;
    };
    recommended: {
        provider?: string;
        model?: string;
        estimated_cost_usd?: number;
        action?: string;
    };
    potential_savings_usd: number;
    potential_savings_percent: number;
    confidence: number;
    implementation: string;
}

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const tenantId = searchParams.get('tenant_id') || req.headers.get('x-p402-tenant') || 'default';

    const recommendations: Recommendation[] = [];
    const registry = getProviderRegistry();

    try {
        // Analyze recent usage patterns (last 30 days)
        const usageQuery = `
            SELECT 
                selected_provider_id as provider,
                task,
                COUNT(*) as request_count,
                SUM(cost_usd) as total_cost_usd,
                AVG(cost_usd) as avg_cost_usd,
                AVG(CASE WHEN success THEN 1.0 ELSE 0.0 END) as success_rate
            FROM router_decisions
            WHERE tenant_id = $1
            AND created_at >= NOW() - INTERVAL '30 days'
            GROUP BY selected_provider_id, task
            ORDER BY total_cost_usd DESC
        `;

        const usageResult = await pool.query(usageQuery, [tenantId]);

        // Generate recommendations based on usage
        for (const row of usageResult.rows) {
            const monthlyRequests = parseInt(row.request_count);
            const monthlyCost = parseFloat(row.total_cost_usd || 0);
            const avgCost = parseFloat(row.avg_cost_usd || 0);
            const provider = row.provider;
            const task = row.task || 'default';

            // Skip if no significant usage
            if (monthlyRequests < 10 || monthlyCost < 0.01) continue;

            // Recommendation 1: Cheaper model alternatives
            const cheaperModels = findCheaperAlternatives(registry, provider, avgCost, task);
            if (cheaperModels.length > 0) {
                const best = cheaperModels[0]!; // Use non-null assertion or check
                if (!best) continue;

                const savingsPercent = Math.round((1 - best.costPer1k / avgCost) * 100);
                const savingsUsd = monthlyCost * (savingsPercent / 100);

                if (savingsPercent > 20) {
                    recommendations.push({
                        id: `model-switch-${provider}-${task}`,
                        type: 'model_switch',
                        priority: savingsPercent > 50 ? 'high' : 'medium',
                        title: `Switch to ${best.model} for ${task}`,
                        description: `You're using ${provider} for ${task} tasks. Switching to ${best.provider}/${best.model} could save ${savingsPercent}% on these requests.`,
                        current: {
                            provider,
                            monthly_cost_usd: monthlyCost,
                            requests: monthlyRequests
                        },
                        recommended: {
                            provider: best.provider,
                            model: best.model,
                            estimated_cost_usd: monthlyCost - savingsUsd
                        },
                        potential_savings_usd: Math.round(savingsUsd * 100) / 100,
                        potential_savings_percent: savingsPercent,
                        confidence: 0.85,
                        implementation: `Update your routing config to prefer ${best.provider} for '${task}' tasks, or set mode: 'cost' in your requests.`
                    });
                }
            }
        }

        // Recommendation 2: Enable semantic caching
        const cacheQuery = `
            SELECT 
                COUNT(*) as total_requests,
                COUNT(DISTINCT SUBSTRING(reason, 1, 50)) as unique_patterns,
                SUM(cost_usd) as total_cost
            FROM router_decisions
            WHERE tenant_id = $1
            AND created_at >= NOW() - INTERVAL '30 days'
            AND reason != 'semantic_hit'
        `;

        const cacheResult = await pool.query(cacheQuery, [tenantId]);
        const cacheRow = cacheResult.rows[0];

        if (cacheRow && parseInt(cacheRow.total_requests) > 100) {
            const totalRequests = parseInt(cacheRow.total_requests);
            const uniquePatterns = parseInt(cacheRow.unique_patterns);
            const totalCost = parseFloat(cacheRow.total_cost || 0);

            // Estimate cache hit rate potential
            const potentialHitRate = Math.min(0.30, 1 - (uniquePatterns / totalRequests));
            const potentialSavings = totalCost * potentialHitRate;

            if (potentialHitRate > 0.10 && potentialSavings > 1) {
                recommendations.push({
                    id: 'enable-semantic-cache',
                    type: 'caching',
                    priority: potentialSavings > 10 ? 'high' : 'medium',
                    title: 'Enable Semantic Caching',
                    description: `Based on your usage patterns, semantic caching could reduce costs by approximately ${Math.round(potentialHitRate * 100)}% by serving similar requests from cache.`,
                    current: {
                        monthly_cost_usd: totalCost,
                        requests: totalRequests
                    },
                    recommended: {
                        action: 'Enable semantic caching',
                        estimated_cost_usd: totalCost - potentialSavings
                    },
                    potential_savings_usd: Math.round(potentialSavings * 100) / 100,
                    potential_savings_percent: Math.round(potentialHitRate * 100),
                    confidence: 0.70,
                    implementation: 'Add cache: true to your p402 options, or enable caching in your project settings.'
                });
            }
        }

        // Recommendation 3: Rate limit optimization (use Groq for speed)
        const speedQuery = `
            SELECT 
                selected_provider_id as provider,
                COUNT(*) as request_count,
                SUM(cost_usd) as total_cost
            FROM router_decisions
            WHERE tenant_id = $1
            AND created_at >= NOW() - INTERVAL '30 days'
            AND selected_provider_id NOT IN ('groq')
            AND task IN ('chat', 'simple', 'classification')
            GROUP BY selected_provider_id
            HAVING COUNT(*) > 50
        `;

        const speedResult = await pool.query(speedQuery, [tenantId]);

        for (const row of speedResult.rows) {
            const requests = parseInt(row.request_count);
            const cost = parseFloat(row.total_cost || 0);

            // Groq is often 2-10x cheaper for simple tasks
            const estimatedGroqCost = cost * 0.3; // ~70% savings estimate
            const savings = cost - estimatedGroqCost;

            if (savings > 5) {
                recommendations.push({
                    id: `groq-speedup-${row.provider}`,
                    type: 'provider_switch',
                    priority: savings > 20 ? 'high' : 'medium',
                    title: 'Use Groq for Simple Tasks',
                    description: `You're using ${row.provider} for simple tasks. Groq offers similar quality at lower cost with faster inference for basic chat and classification.`,
                    current: {
                        provider: row.provider,
                        monthly_cost_usd: cost,
                        requests
                    },
                    recommended: {
                        provider: 'groq',
                        model: 'llama-3.3-70b-versatile',
                        estimated_cost_usd: estimatedGroqCost
                    },
                    potential_savings_usd: Math.round(savings * 100) / 100,
                    potential_savings_percent: Math.round((savings / cost) * 100),
                    confidence: 0.75,
                    implementation: `Set prefer_providers: ['groq'] for simple tasks, or use mode: 'speed'.`
                });
            }
        }

        // Sort by potential savings
        recommendations.sort((a, b) => b.potential_savings_usd - a.potential_savings_usd);

        // Calculate total potential savings
        const totalPotentialSavings = recommendations.reduce((sum, r) => sum + r.potential_savings_usd, 0);

        return NextResponse.json({
            object: 'recommendations',
            tenant_id: tenantId,
            generated_at: new Date().toISOString(),
            summary: {
                total_recommendations: recommendations.length,
                high_priority: recommendations.filter(r => r.priority === 'high').length,
                total_potential_savings_usd: Math.round(totalPotentialSavings * 100) / 100,
                average_confidence: recommendations.length > 0
                    ? Math.round(recommendations.reduce((sum, r) => sum + r.confidence, 0) / recommendations.length * 100) / 100
                    : 0
            },
            recommendations: recommendations.slice(0, 10), // Top 10
            meta: {
                analysis_period_days: 30,
                models_analyzed: registry.getStats().totalModels,
                providers_analyzed: registry.getStats().totalProviders
            }
        });

    } catch (error: any) {
        console.error('[Analytics/Recommendations] Error:', error);

        // Return generic recommendations if no data
        return NextResponse.json({
            object: 'recommendations',
            tenant_id: tenantId,
            generated_at: new Date().toISOString(),
            summary: {
                total_recommendations: 3,
                high_priority: 1,
                total_potential_savings_usd: 0,
                average_confidence: 0.8
            },
            recommendations: getGenericRecommendations(registry),
            meta: {
                message: 'Showing generic recommendations. Make more API calls to get personalized suggestions.',
                analysis_period_days: 30
            }
        });
    }
}

function findCheaperAlternatives(
    registry: ReturnType<typeof getProviderRegistry>,
    currentProvider: string,
    currentCostPer1k: number,
    task: string
): Array<{ provider: string; model: string; costPer1k: number }> {
    const alternatives: Array<{ provider: string; model: string; costPer1k: number }> = [];

    // Get all models
    const allModels = registry.getAllModels();

    for (const { provider, model } of allModels) {
        // Skip same provider
        if (provider === currentProvider) continue;

        const costPer1k = model.inputCostPer1k + model.outputCostPer1k;

        // Only include if cheaper
        if (costPer1k < currentCostPer1k * 0.8) { // At least 20% cheaper
            // Check if model is suitable for the task
            const suitable = isModelSuitableForTask(model.capabilities, task);
            if (suitable) {
                alternatives.push({
                    provider,
                    model: model.id,
                    costPer1k
                });
            }
        }
    }

    // Sort by cost
    alternatives.sort((a, b) => a.costPer1k - b.costPer1k);

    return alternatives.slice(0, 5);
}

function isModelSuitableForTask(capabilities: string[], task: string): boolean {
    // Basic capability matching
    const taskRequirements: Record<string, string[]> = {
        'chat': ['chat'],
        'code': ['chat', 'code'],
        'reasoning': ['chat', 'reasoning'],
        'vision': ['chat', 'vision'],
        'classification': ['chat'],
        'summarization': ['chat'],
        'default': ['chat']
    };

    const required = taskRequirements[task] || taskRequirements['default']!;
    if (!required) return true; // Fallback
    return required.every(cap => capabilities.includes(cap));
}

function getGenericRecommendations(registry: ReturnType<typeof getProviderRegistry>): Recommendation[] {
    return [
        {
            id: 'use-routing-modes',
            type: 'rate_optimization',
            priority: 'high',
            title: 'Use Cost-Optimized Routing',
            description: "P402's intelligent routing can automatically select the cheapest provider for your requests while maintaining quality.",
            current: {},
            recommended: {
                action: "Set mode: 'cost' in your requests"
            },
            potential_savings_usd: 0,
            potential_savings_percent: 40,
            confidence: 0.90,
            implementation: "Add p402: { mode: 'cost' } to your API requests."
        },
        {
            id: 'enable-caching',
            type: 'caching',
            priority: 'medium',
            title: 'Enable Semantic Caching',
            description: 'Semantic caching can serve similar requests from cache, reducing costs by up to 25%.',
            current: {},
            recommended: {
                action: 'Enable semantic caching'
            },
            potential_savings_usd: 0,
            potential_savings_percent: 25,
            confidence: 0.80,
            implementation: "Add p402: { cache: true } to your API requests."
        },
        {
            id: 'use-budget-models',
            type: 'tier_downgrade',
            priority: 'medium',
            title: 'Use Budget Models for Simple Tasks',
            description: 'For basic tasks like classification or simple Q&A, budget-tier models perform nearly as well at 10x lower cost.',
            current: {},
            recommended: {
                model: registry.getCheapestModel()?.model || 'gpt-3.5-turbo',
                action: 'Use budget-tier models'
            },
            potential_savings_usd: 0,
            potential_savings_percent: 70,
            confidence: 0.85,
            implementation: "Set prefer_tier: 'budget' for simple tasks, or explicitly use budget models like gpt-3.5-turbo or claude-haiku."
        }
    ];
}
