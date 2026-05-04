/**
 * Unit tests for tempoMainnetProbe()
 * ====================================
 * All RPC calls are mocked — no network access required.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tempoMainnetProbe } from '../facilitator-adapters/tempo';
import { TEMPO_CHAIN_ID } from '../constants/tempo';

const MOCK_STABLECOIN = '0x20C000000000000000000000b9537d11c60E8b50';
const MOCK_TREASURY = '0xe00DD502FF571F3C721f22B3F9E525312d21D797';
const CHAIN_ID_HEX = `0x${TEMPO_CHAIN_ID.toString(16)}`; // '0x1089'

// Build a minimal Response-like object for a JSON-RPC reply
function rpcResponse(id: number, result: unknown) {
    return {
        ok: true,
        json: async () => ({ jsonrpc: '2.0', id, result }),
    } as Response;
}

function rpcErrorResponse(id: number, message: string) {
    return {
        ok: true,
        json: async () => ({ jsonrpc: '2.0', id, error: { message } }),
    } as Response;
}

// Set up fetch mock to return responses in call order
function mockFetch(...responses: Response[]) {
    let i = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => responses[i++] ?? rpcResponse(99, '0x0'));
}

describe('tempoMainnetProbe', () => {
    beforeEach(() => { vi.useFakeTimers({ toFake: [] }); }); // keep real timers for async
    afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

    // 1. Healthy path
    it('returns healthy=true when all three checks pass', async () => {
        mockFetch(
            rpcResponse(1, CHAIN_ID_HEX),          // eth_chainId = 4217
            rpcResponse(2, '0x600160005260206000f3'), // non-empty bytecode
            rpcResponse(3, '0x' + '0'.repeat(64)),  // balanceOf = 0 (valid uint256)
        );

        const result = await tempoMainnetProbe({
            stablecoinAddress: MOCK_STABLECOIN,
            treasuryAddress: MOCK_TREASURY,
        });

        expect(result.healthy).toBe(true);
        expect(result.checks.chainId.passed).toBe(true);
        expect(result.checks.chainId.actual).toBe(TEMPO_CHAIN_ID);
        expect(result.checks.contractCode.passed).toBe(true);
        expect(result.checks.treasuryBalance.passed).toBe(true);
        expect(result.durationMs).toBeGreaterThanOrEqual(0);
        expect(result.probedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    // 2. Chain ID mismatch
    it('returns healthy=false with chainId.passed=false when eth_chainId returns 0x1', async () => {
        mockFetch(
            rpcResponse(1, '0x1'),                  // Ethereum mainnet — wrong
            rpcResponse(2, '0x600160005260206000f3'),
            rpcResponse(3, '0x' + '0'.repeat(64)),
        );

        const result = await tempoMainnetProbe({
            stablecoinAddress: MOCK_STABLECOIN,
            treasuryAddress: MOCK_TREASURY,
        });

        expect(result.healthy).toBe(false);
        expect(result.checks.chainId.passed).toBe(false);
        expect(result.checks.chainId.actual).toBe(1);
        expect(result.checks.chainId.error).toMatch(/chain_id_mismatch/);
        // Other checks still ran
        expect(result.checks.contractCode.passed).toBe(true);
        expect(result.checks.treasuryBalance.passed).toBe(true);
    });

    // 3. Contract code missing
    it('returns healthy=false with contractCode.passed=false when eth_getCode returns 0x', async () => {
        mockFetch(
            rpcResponse(1, CHAIN_ID_HEX),
            rpcResponse(2, '0x'),                   // no bytecode
            rpcResponse(3, '0x' + '0'.repeat(64)),
        );

        const result = await tempoMainnetProbe({
            stablecoinAddress: MOCK_STABLECOIN,
            treasuryAddress: MOCK_TREASURY,
        });

        expect(result.healthy).toBe(false);
        expect(result.checks.contractCode.passed).toBe(false);
        expect(result.checks.contractCode.codeLength).toBe(0);
        expect(result.checks.contractCode.error).toMatch(/contract_code_missing/);
    });

    // 4. Treasury balance reverts
    it('returns healthy=false with treasuryBalance.passed=false when eth_call returns error', async () => {
        mockFetch(
            rpcResponse(1, CHAIN_ID_HEX),
            rpcResponse(2, '0x600160005260206000f3'),
            rpcErrorResponse(3, 'execution reverted'),
        );

        const result = await tempoMainnetProbe({
            stablecoinAddress: MOCK_STABLECOIN,
            treasuryAddress: MOCK_TREASURY,
        });

        expect(result.healthy).toBe(false);
        expect(result.checks.treasuryBalance.passed).toBe(false);
        expect(result.checks.treasuryBalance.error).toMatch(/treasury_balance_unreadable/);
        expect(result.checks.treasuryBalance.error).toMatch(/execution reverted/);
    });

    // 5. Timeout / network error
    it('returns healthy=false with error message when fetch throws (simulated timeout)', async () => {
        const abortErr = Object.assign(new Error('This operation was aborted'), { name: 'AbortError' });
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(abortErr);

        const result = await tempoMainnetProbe({
            stablecoinAddress: MOCK_STABLECOIN,
            treasuryAddress: MOCK_TREASURY,
        });

        expect(result.healthy).toBe(false);
        const allErrors = Object.values(result.checks).map((c) => c.error ?? '').join(' ');
        expect(allErrors).toMatch(/aborted/i);
    });

    // 6. Reads stablecoinAddress from opts, not hardcoded
    it('passes the caller-supplied stablecoinAddress to eth_getCode and eth_call', async () => {
        const customAddress = '0xDeadBeefDeadBeefDeadBeefDeadBeefDeadBeef';
        const capturedParams: unknown[][] = [];

        vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
            const body = JSON.parse(init?.body as string) as { id: number; params: unknown[] };
            capturedParams[body.id] = body.params;
            const results: Record<number, unknown> = {
                1: CHAIN_ID_HEX,
                2: '0x600160005260206000f3',
                3: '0x' + '0'.repeat(64),
            };
            return {
                ok: true,
                json: async () => ({ jsonrpc: '2.0', id: body.id, result: results[body.id] }),
            } as Response;
        });

        await tempoMainnetProbe({
            stablecoinAddress: customAddress,
            treasuryAddress: MOCK_TREASURY,
        });

        // eth_getCode (id=2): first param is the address
        expect((capturedParams[2] as string[])[0]).toBe(customAddress);
        // eth_call (id=3): first param is { to: address, data: ... }
        expect((capturedParams[3] as Array<{ to: string }>)[0]?.to).toBe(customAddress);
    });
});
