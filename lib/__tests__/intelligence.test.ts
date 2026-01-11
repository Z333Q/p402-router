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
            expect(recommendations[0].type).toBe('MODEL_SWAP');
            expect(recommendations[0].message).toContain('claude-3-opus');
            expect(recommendations[0].details.suggestedModel).toBe('gpt-4o-mini');
        });
    });
});
