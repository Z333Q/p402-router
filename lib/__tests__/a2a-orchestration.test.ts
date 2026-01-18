import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAgentCard, extractCapabilities, findMatchingAgents, delegateTask } from '../a2a-orchestration';
import pool from '../db';

vi.mock('../db', () => ({
    default: {
        query: vi.fn(),
    },
}));

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('A2A Orchestration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFetch.mockReset();
    });

    describe('fetchAgentCard()', () => {
        it('should fetch and validate a valid agent card', async () => {
            const mockCard = {
                name: 'Test Agent',
                url: 'https://agent.ai',
                protocolVersion: 'v1.0'
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockCard
            });

            const result = await fetchAgentCard('https://agent.ai/card.json');
            expect(result).toEqual(mockCard);
            expect(mockFetch).toHaveBeenCalledWith('https://agent.ai/card.json', expect.any(Object));
        });

        it('should return null if fetch fails', async () => {
            mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
            const result = await fetchAgentCard('https://agent.ai/card.json');
            expect(result).toBeNull();
        });

        it('should return null if card is invalid', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ name: 'Missing URL' })
            });
            const result = await fetchAgentCard('https://agent.ai/card.json');
            expect(result).toBeNull();
        });
    });

    describe('extractCapabilities()', () => {
        it('should extract capabilities from skills and extensions', () => {
            const mockCard = {
                skills: [{ id: 's1', tags: ['cap1', 'cap2'] }],
                extensions: [{ uri: 'tag:p402.io,2025:x402-payment' }],
                capabilities: { streaming: true }
            } as any;

            const result = extractCapabilities(mockCard);
            expect(result.capabilities).toContain('cap1');
            expect(result.capabilities).toContain('cap2');
            expect(result.capabilities).toContain('payment');
            expect(result.capabilities).toContain('streaming');
            expect(result.skills).toContain('s1');
        });
    });

    describe('findMatchingAgents()', () => {
        it('should return ranked agents based on capabilities', async () => {
            vi.mocked(pool.query).mockResolvedValueOnce({
                rows: [
                    { id: 'a1', name: 'Agent 1', capabilities: ['cap1', 'cap2'], trust_score: 90 },
                    { id: 'a2', name: 'Agent 2', capabilities: ['cap1'], trust_score: 80 }
                ]
            } as any);

            const result = await findMatchingAgents('tenant-1', ['cap1', 'cap2']);
            expect(result.length).toBe(2);
            expect(result[0].agentId).toBe('a1');
            expect(result[0].matchScore).toBe(1.0);
            expect(result[1].agentId).toBe('a2');
            expect(result[1].matchScore).toBe(0.5);
        });
    });

    describe('delegateTask()', () => {
        it('should delegate task and record results', async () => {
            const mockAgent = {
                id: 'a1',
                name: 'Agent 1',
                agent_card: {
                    url: 'https://agent.ai',
                    endpoints: { a2a: { jsonrpc: 'https://agent.ai/api/a2a' } }
                }
            };

            vi.mocked(pool.query)
                .mockResolvedValueOnce({ rows: [mockAgent] } as any) // Get agent
                .mockResolvedValueOnce({ rows: [] } as any)    // Insert delegation
                .mockResolvedValueOnce({ rows: [] } as any)    // Update delegation
                .mockResolvedValueOnce({ rows: [] } as any);   // Update agent stats

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    result: {
                        task: {
                            status: { state: 'completed', message: { role: 'agent', parts: [{ type: 'text', text: 'Reply' }] } },
                            metadata: { cost_usd: 0.05 }
                        }
                    }
                })
            });

            const message = { role: 'user', parts: [{ type: 'text', text: 'Hello' }] } as any;
            const result = await delegateTask('tenant-1', 'a1', message);

            expect(result.status).toBe('completed');
            expect(result.costUsd).toBe(0.05);
            expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO a2a_delegations'), expect.any(Array));
            expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE a2a_remote_agents'), expect.any(Array));
        });

        it('should handle remote agent errors', async () => {
            vi.mocked(pool.query).mockResolvedValueOnce({
                rows: [{ id: 'a1', name: 'Agent 1', agent_card: { url: 'https://agent.ai' } }]
            } as any);

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ error: { message: 'Remote Error' } })
            });

            const result = await delegateTask('tenant-1', 'a1', { parts: [] } as any);
            expect(result.status).toBe('failed');
        });
    });
});
