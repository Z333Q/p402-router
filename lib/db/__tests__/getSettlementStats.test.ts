/**
 * getSettlementStats — Settle dashboard aggregate.
 *
 * Pins the financial-integrity read-side contract:
 *   1. Tenant_id is bound (not interpolated).
 *   2. INTERVAL is constrained to the three V5 buckets; any other input
 *      collapses to '30 days' (no SQL injection vector via `bucket`).
 *   3. The query reads `processed_tx_hashes` only — never writes.
 *   4. DB errors return zeroed defaults so the dashboard never blanks out.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
    default: { query: vi.fn() },
}));

import db from '@/lib/db';
import { getSettlementStats } from '../queries';

const TENANT = '00000000-0000-0000-0000-000000000ABC';

function mockOk(over: Partial<Record<string, unknown>> = {}) {
    (db.query as any).mockResolvedValueOnce({
        rows: [{
            count: 42,
            total_usd: '123.456',
            unique_payers: 7,
            by_scheme: [
                { scheme: 'exact',   count: 30, total_usd: '100.0' },
                { scheme: 'onchain', count: 12, total_usd: '23.456' },
            ],
            by_network: [
                { network: 'base', count: 42, total_usd: '123.456' },
            ],
            ...over,
        }],
    });
}

beforeEach(() => (db.query as any).mockReset());

describe('getSettlementStats — privacy / financial-integrity contract', () => {
    it('binds tenant_id as parameter $1 (never interpolates)', async () => {
        mockOk();
        await getSettlementStats(TENANT, '24h');
        const [sql, params] = (db.query as any).mock.calls[0];
        expect(sql).toContain('WHERE tenant_id = $1');
        expect(params).toEqual([TENANT]);
        // The tenant id MUST NOT appear inlined in the SQL string.
        expect(sql).not.toContain(TENANT);
    });

    it('reads processed_tx_hashes and never issues an INSERT / UPDATE / DELETE', async () => {
        mockOk();
        await getSettlementStats(TENANT, '7d');
        const sql: string = (db.query as any).mock.calls[0][0];
        expect(sql).toContain('processed_tx_hashes');
        expect(sql).not.toMatch(/\bINSERT\b/i);
        expect(sql).not.toMatch(/\bUPDATE\b/i);
        expect(sql).not.toMatch(/\bDELETE\b/i);
    });

    it('maps each bucket label to the correct INTERVAL — no other interval can leak', async () => {
        for (const [bucket, expected] of [
            ['24h', "INTERVAL '24 hours'"],
            ['7d',  "INTERVAL '7 days'"],
            ['30d', "INTERVAL '30 days'"],
        ] as const) {
            (db.query as any).mockReset();
            mockOk();
            await getSettlementStats(TENANT, bucket);
            const sql: string = (db.query as any).mock.calls[0][0];
            expect(sql).toContain(expected);
        }
    });

    it('rejects bucket-injection — any value outside the enum collapses to 30 days', async () => {
        mockOk();
        // @ts-expect-error — exercising defense in depth for an unsafe caller
        await getSettlementStats(TENANT, "24h'; DROP TABLE processed_tx_hashes; --");
        const sql: string = (db.query as any).mock.calls[0][0];
        expect(sql).toContain("INTERVAL '30 days'");
        expect(sql).not.toContain('DROP TABLE');
    });

    it('returns sensible defaults on DB error (dashboard never blanks)', async () => {
        (db.query as any).mockRejectedValueOnce(new Error('connection terminated'));
        const stats = await getSettlementStats(TENANT, '24h');
        expect(stats).toEqual({
            bucket: '24h',
            count: 0,
            total_usd: 0,
            unique_payers: 0,
            by_scheme: [],
            by_network: [],
        });
    });

    it('coerces numeric strings from PG to JS numbers', async () => {
        mockOk();
        const stats = await getSettlementStats(TENANT, '30d');
        expect(stats.total_usd).toBe(123.456);
        expect(stats.count).toBe(42);
        expect(stats.unique_payers).toBe(7);
        expect(stats.by_scheme[0]).toEqual({ scheme: 'exact', count: 30, total_usd: 100 });
        expect(stats.by_network[0]).toEqual({ network: 'base', count: 42, total_usd: 123.456 });
    });

    it('handles empty windows (no settlements yet)', async () => {
        (db.query as any).mockResolvedValueOnce({
            rows: [{
                count: 0,
                total_usd: '0',
                unique_payers: 0,
                by_scheme: [],
                by_network: [],
            }],
        });
        const stats = await getSettlementStats(TENANT, '24h');
        expect(stats.count).toBe(0);
        expect(stats.total_usd).toBe(0);
        expect(stats.by_scheme).toEqual([]);
        expect(stats.by_network).toEqual([]);
    });
});
