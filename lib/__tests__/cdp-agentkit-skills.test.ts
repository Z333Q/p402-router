/**
 * CDP AgentKit Skills unit tests
 * ================================
 * Tests skill definitions, lookup utilities, and the seedCdpAgentKitSkills
 * DB call.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({ mockQuery: vi.fn() }));

vi.mock('@/lib/db', () => ({
    default: { query: mockQuery },
}));

import {
    CDP_AGENTKIT_SKILLS,
    getCdpSkill,
    AUTONOMOUS_SKILL_IDS,
    seedCdpAgentKitSkills,
} from '@/lib/cdp-agentkit-skills';

describe('CDP_AGENTKIT_SKILLS catalog', () => {
    it('contains the expected skill IDs', () => {
        const ids = CDP_AGENTKIT_SKILLS.map(s => s.skill_id);
        expect(ids).toContain('cdp:wallet-provision');
        expect(ids).toContain('cdp:eip3009-sign');
        expect(ids).toContain('cdp:send-usdc');
        expect(ids).toContain('x402:auto-settle');
    });

    it('every skill has required fields', () => {
        for (const skill of CDP_AGENTKIT_SKILLS) {
            expect(skill.skill_id).toBeTruthy();
            expect(skill.name).toBeTruthy();
            expect(skill.description).toBeTruthy();
            expect(Array.isArray(skill.tags)).toBe(true);
            expect(skill.input_schema).toBeDefined();
            expect(skill.output_schema).toBeDefined();
        }
    });

    it('wallet-provision is free', () => {
        const skill = getCdpSkill('cdp:wallet-provision');
        expect(skill?.pricing_model).toBe('free');
    });

    it('send-usdc is per_call with a price', () => {
        const skill = getCdpSkill('cdp:send-usdc');
        expect(skill?.pricing_model).toBe('per_call');
        expect(skill?.pricing_amount_usd).toBeGreaterThan(0);
    });
});

describe('getCdpSkill', () => {
    it('returns skill by ID', () => {
        const skill = getCdpSkill('cdp:eip3009-sign');
        expect(skill).not.toBeUndefined();
        expect(skill?.skill_id).toBe('cdp:eip3009-sign');
    });

    it('returns undefined for unknown skill', () => {
        expect(getCdpSkill('unknown:skill')).toBeUndefined();
    });
});

describe('AUTONOMOUS_SKILL_IDS', () => {
    it('includes x402:auto-settle', () => {
        expect(AUTONOMOUS_SKILL_IDS.has('x402:auto-settle')).toBe(true);
    });

    it('includes cdp:eip3009-sign', () => {
        expect(AUTONOMOUS_SKILL_IDS.has('cdp:eip3009-sign')).toBe(true);
    });

    it('does NOT include cdp:send-usdc (requires explicit session)', () => {
        expect(AUTONOMOUS_SKILL_IDS.has('cdp:send-usdc')).toBe(false);
    });
});

describe('seedCdpAgentKitSkills', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        process.env.NEXTAUTH_URL = 'https://p402.io';
    });

    it('calls pool.query with an upsert statement', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        await seedCdpAgentKitSkills();
        expect(mockQuery).toHaveBeenCalledOnce();
        const sql: string = mockQuery.mock.calls[0]?.[0] ?? '';
        expect(sql).toMatch(/INSERT INTO bazaar_agents/i);
        expect(sql).toMatch(/ON CONFLICT.*DO UPDATE/i);
    });

    it('passes the correct agent ID', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        await seedCdpAgentKitSkills();
        const params: unknown[] = mockQuery.mock.calls[0]?.[1] ?? [];
        expect(params[0]).toBe('cdp-agentkit-builtin');
    });
});
