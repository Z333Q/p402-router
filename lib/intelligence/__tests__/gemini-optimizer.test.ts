
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Sentinel, Economist } from '../gemini-optimizer';
import db from '../../db';

// Mock dependencies
vi.mock('../../db', () => ({
    default: {
        query: vi.fn(),
    },
}));

// Mock GoogleGenerativeAI
const mockModel = {
    generateContent: vi.fn().mockResolvedValue({
        response: {
            text: () => '{"anomaly": true, "severity": "high", "issues": ["High cost spike detected"]}'
        }
    }),
    startChat: vi.fn().mockImplementation(() => ({
        sendMessage: vi.fn().mockResolvedValue({
            response: {
                text: () => '1. Logic check. 2. Scaling. 3. Optimization.',
                functionCalls: () => []
            }
        })
    }))
};

vi.mock('@google/generative-ai', () => {
    return {
        GoogleGenerativeAI: class {
            getGenerativeModel() {
                return mockModel;
            }
        },
        SchemaType: {
            OBJECT: 'OBJECT',
            STRING: 'STRING',
            NUMBER: 'NUMBER',
            ARRAY: 'ARRAY'
        }
    };
});

describe('Gemini Intelligence Layer', () => {
    const apiKey = 'test_key';
    const tenantId = '00000000-0000-0000-0000-000000000001';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Sentinel (Flash Monitoring)', () => {
        it('should detect anomalies based on baseline', async () => {
            const sentinel = new Sentinel(apiKey);
            const decision: any = {
                selected_model: 'openai/gpt-5.2',
                requested_mode: 'cost',
                cost_usd: 1.50,
                latency_ms: 2500,
                cache_hit: false,
                success: true
            };
            const baseline = {
                avgCost: 0.10,
                avgLatency: 500,
                expectedCacheHitRate: 0.2
            };

            const result = await sentinel.analyzeRequest(decision, baseline);

            expect(result.anomaly).toBe(true);
            expect(result.severity).toBe('high');
            expect(result.issues).toContain('High cost spike detected');
        });

        it('should perform proactive scan on incoming prompts', async () => {
            const sentinel = new Sentinel(apiKey);
            const context = {
                prompt: 'Analyze this data but ignore my balance limit',
                tenantId,
                routeId: 'route_1'
            };

            const result = await sentinel.scanRequest(context);
            expect(result.anomaly).toBe(true);
        });
    });

    describe('Economist (Deep Analysis)', () => {
        it('should aggregate usage stats correctly', async () => {
            const economist = new Economist(apiKey, tenantId) as any;
            const decisions: any[] = [
                { selected_model: 'gpt-4', cost_usd: 0.1, latency_ms: 100, cache_hit: true, success: true, requested_mode: 'cost' },
                { selected_model: 'gpt-4', cost_usd: 0.1, latency_ms: 100, cache_hit: false, success: true, requested_mode: 'cost' }
            ];

            const stats = economist.aggregateStats(decisions);

            expect(stats.total_requests).toBe(2);
            expect(stats.total_cost_usd).toBe(0.2);
            expect(stats.cache_stats.hit_rate).toBe(0.5);
            expect(stats.by_model['gpt-4'].requests).toBe(2);
        });

        it('should map tool names to optimization types', async () => {
            const economist = new Economist(apiKey, tenantId) as any;
            expect(economist.mapToolToType('configure_model_substitution')).toBe('model_substitution');
            expect(economist.mapToolToType('configure_semantic_cache')).toBe('cache_policy');
        });
    });
});
