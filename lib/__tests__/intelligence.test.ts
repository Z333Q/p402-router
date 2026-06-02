import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnomalyDetection } from '../intelligence/anomaly-detection';
import { OptimizationEngine } from '../intelligence/optimization';
import pool from '../db';

vi.mock('../db', () => ({
    default: {
        query: vi.fn(),
    },
}));

describe('Intelligence Layer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('AnomalyDetection', () => {
        it('should return null if no spend data exists', async () => {
            vi.mocked(pool.query).mockResolvedValue({ rows: [] } as any);
            const alert = await AnomalyDetection.checkSpendAnomaly('tenant-1');
            expect(alert).toBeNull();
        });

        it('should detect a 3x spend spike', async () => {
            vi.mocked(pool.query)
                .mockResolvedValueOnce({ rows: [{ avg_hourly_spend: '10.00' }] } as any) // Avg over 24h
                .mockResolvedValueOnce({ rows: [{ last_hour_spend: '50.00' }] } as any); // Last hour spike

            const alert = await AnomalyDetection.checkSpendAnomaly('tenant-1');
            expect(alert).not.toBeNull();
            expect(alert?.type).toBe('COST_SPIKE');
            expect(alert?.severity).toBe('high');
            expect(alert?.details.ratio).toBe(5);
        });

        it('should ignore small spend spikes (< $1.00)', async () => {
            vi.mocked(pool.query)
                .mockResolvedValueOnce({ rows: [{ avg_hourly_spend: '0.10' }] } as any)
                .mockResolvedValueOnce({ rows: [{ last_hour_spend: '0.90' }] } as any); // 9x but small

            const alert = await AnomalyDetection.checkSpendAnomaly('tenant-1');
            expect(alert).toBeNull();
        });
    });

    describe('OptimizationEngine', () => {
        it('should suggest model swaps for high-cost simple tasks', async () => {
            vi.mocked(pool.query).mockResolvedValueOnce({
                rows: [{
                    task: 'code_gen',
                    selected_model: 'claude-3-opus',
                    avg_cost: 0.80
                }]
            } as any);

            const recommendations = await OptimizationEngine.generateRecommendations('tenant-1');
            expect(recommendations.length).toBe(1);
            expect(recommendations[0]!.type).toBe('MODEL_SWAP');
            expect(recommendations[0]!.message).toContain('claude-3-opus');
            expect(recommendations[0]!.details.suggestedModel).toBe('gpt-4o-mini');
        });

        describe('analyzeForContext (v2_050 Optimize seam)', () => {
            const ctx: any = {
                apiKeyId: 'k_1', tenantId: 't_1', ownerType: 'tenant', ownerId: 't_1',
                departmentId: 'd_1', employeeId: 'e_1', workflowId: null, projectId: null,
                budgetId: null, policyId: null,
                allowedModels: [], allowedTaskTypes: [],
                maxCostPerRequestUsd: null, monthlyBudgetUsd: null,
                headerOverridePolicy: 'allow',
                departmentMonthlyBudgetUsd: null, employeeMonthlyBudgetUsd: null,
            };

            it('returns MODEL_SWAP when an expensive model is used at >$0.05', async () => {
                const recs = await OptimizationEngine.analyzeForContext(ctx, {
                    model: 'claude-3-opus-20240229',
                    taskType: 'inference',
                    estimatedCostUsd: 0.10,
                });
                expect(recs.length).toBe(1);
                expect(recs[0]!.type).toBe('MODEL_SWAP');
                expect(recs[0]!.apiKeyId).toBe('k_1');
                expect(recs[0]!.departmentId).toBe('d_1');
                expect(recs[0]!.employeeId).toBe('e_1');
            });

            it('returns [] when cheap models are used', async () => {
                const recs = await OptimizationEngine.analyzeForContext(ctx, {
                    model: 'gpt-4o-mini',
                    estimatedCostUsd: 0.001,
                });
                expect(recs).toEqual([]);
            });

            it('returns [] when estimatedCostUsd is missing', async () => {
                const recs = await OptimizationEngine.analyzeForContext(ctx, {
                    model: 'claude-3-opus',
                });
                expect(recs).toEqual([]);
            });

            it('is non-throwing on internal failure', async () => {
                // Hand the function a model that triggers the regex but with
                // an undefined cost path — must still return [].
                const recs = await OptimizationEngine.analyzeForContext(ctx, {});
                expect(recs).toEqual([]);
            });
        });
    });
});
