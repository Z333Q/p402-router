/**
 * getPublishOverviewStats — Publish dashboard aggregate.
 *
 * Pins the tenant-scoped read-only contract:
 *   1. Reads `bazaar_resources`, `facilitators`, `facilitator_health` only —
 *      no writes.
 *   2. tenant_id is bound through a parameter, not interpolated.
 *   3. All counts are scoped to the tenant's facilitators.
 *   4. DB errors return zeroed defaults so the dashboard never blanks.
 *   5. PG numeric strings coerce to JS numbers.
 *   6. Safe projection: no prompt/response/messages/content columns.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
    default: { query: vi.fn() },
}));

import db from '@/lib/db';
import { getPublishOverviewStats } from '../queries';

const TENANT = '00000000-0000-0000-0000-000000000ABC';

beforeEach(() => (db.query as any).mockReset());

describe('getPublishOverviewStats', () => {
    it('issues no INSERT / UPDATE / DELETE', async () => {
        (db.query as any).mockResolvedValueOnce({ rows: [{ network_resources: 0, network_facilitators: 0, healthy_facilitators: 0 }] });
        await getPublishOverviewStats(TENANT);
        const sql: string = (db.query as any).mock.calls[0][0];
        expect(sql).not.toMatch(/\bINSERT\b/i);
        expect(sql).not.toMatch(/\bUPDATE\b/i);
        expect(sql).not.toMatch(/\bDELETE\b/i);
    });

    it('reads the three indexed tables in a single round trip', async () => {
        (db.query as any).mockResolvedValueOnce({ rows: [{ network_resources: 0, network_facilitators: 0, healthy_facilitators: 0 }] });
        await getPublishOverviewStats(TENANT);
        const sql: string = (db.query as any).mock.calls[0][0];
        expect(sql).toContain('bazaar_resources');
        expect(sql).toContain('facilitators');
        expect(sql).toContain('facilitator_health');
        expect((db.query as any).mock.calls).toHaveLength(1);
    });

    it('binds tenant_id through a parameter (no interpolation)', async () => {
        (db.query as any).mockResolvedValueOnce({ rows: [{ network_resources: 0, network_facilitators: 0, healthy_facilitators: 0 }] });
        await getPublishOverviewStats(TENANT);
        const call = (db.query as any).mock.calls[0];
        const sql: string = call[0];
        const params: unknown[] = call[1];
        expect(sql).toContain('tenant_id = $1');
        expect(sql).not.toContain(TENANT);
        expect(params).toEqual([TENANT]);
    });

    it('safe projection: no prompt / response / messages / content / file columns in SQL', async () => {
        (db.query as any).mockResolvedValueOnce({ rows: [{ network_resources: 0, network_facilitators: 0, healthy_facilitators: 0 }] });
        await getPublishOverviewStats(TENANT);
        const sql: string = (db.query as any).mock.calls[0][0];
        for (const forbidden of ['prompt', 'response', 'messages', 'completion', 'request_body', 'response_body', 'raw_trace', 'stored_content']) {
            expect(sql.toLowerCase()).not.toContain(forbidden);
        }
    });

    it('coerces PG numeric strings to JS numbers', async () => {
        (db.query as any).mockResolvedValueOnce({
            rows: [{
                network_resources: '142',
                network_facilitators: '8',
                healthy_facilitators: '7',
            }],
        });
        const stats = await getPublishOverviewStats(TENANT);
        expect(stats).toEqual({
            network_resources: 142,
            network_facilitators: 8,
            healthy_facilitators: 7,
        });
    });

    it('returns zeroed defaults on DB error', async () => {
        (db.query as any).mockRejectedValueOnce(new Error('connection refused'));
        const stats = await getPublishOverviewStats(TENANT);
        expect(stats).toEqual({
            network_resources: 0,
            network_facilitators: 0,
            healthy_facilitators: 0,
        });
    });
});
