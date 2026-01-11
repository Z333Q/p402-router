import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RouterService } from '../router-service'
import { PolicyEngine } from '@/lib/policy-engine'
import { RoutingEngine } from '@/lib/router-engine'

// Mock dependencies
vi.mock('@/lib/policy-engine')
vi.mock('@/lib/router-engine')
vi.mock('@/lib/analytics')

describe('RouterService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    const mockRequest = {
        routeId: 'test_route',
        payment: {
            network: 'eip155:8453',
            scheme: 'exact',
            amount: '10.00',
            asset: 'USDC'
        }
    }

    it('should return successfully when policy allows and routes are found', async () => {
        // Mock Policy Allow
        (PolicyEngine.evaluate as any).mockResolvedValue({
            allow: true,
            policyId: 'pol_123',
            reasons: [],
            appliedOverrides: [],
            schemaVersion: '1.0'
        });

        // Mock Routing Plan
        (RoutingEngine.plan as any).mockResolvedValue({
            candidates: [{ facilitatorId: 'fac_1', score: 100 }],
            selectedId: 'fac_1'
        });

        const result = await RouterService.plan('req_123', mockRequest);

        expect(result.allow).toBe(true);
        expect(result.candidates).toHaveLength(1);
        expect(result.policy.decisionTrace).toBeDefined();
        // Check trace steps
        const events = result.policy.decisionTrace.events;
        expect(events.some(s => s.name === 'input.validated')).toBe(true);
        expect(events.some(s => s.name === 'policy.evaluated')).toBe(true);
        expect(events.some(s => s.name === 'facilitator.scored')).toBe(true);
    })

    it('should return deny response when policy fails', async () => {
        // Mock Policy Deny
        (PolicyEngine.evaluate as any).mockResolvedValue({
            allow: false,
            policyId: 'pol_123',
            reasons: ['Sanctioned country'],
            deny: { code: 'GEO_BLOCK' }
        });

        const result = await RouterService.plan('req_123', mockRequest);

        expect(result.allow).toBe(false);
        expect(result.candidates).toHaveLength(0);
        expect(result.policy.decisionTrace).toBeDefined();
    })

    it('should throw ApiError on internal failure', async () => {
        (PolicyEngine.evaluate as any).mockRejectedValue(new Error("Policy DB Down"));

        await expect(RouterService.plan('req_123', mockRequest))
            .rejects
            .toThrow("Internal processing error");
    })
})
