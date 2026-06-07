/**
 * Slice 3P — Demo isolation contract for the finance export.
 *
 * The finance export route MUST never silently inject demo rows into a
 * real CSV/JSON export, even when `?demo=1` is passed on the URL. The
 * brief is explicit: demo data lives client-side, server-side queries
 * still read the real ledger only, and an export carrying `?demo=1`
 * still returns ONLY what the DB actually contains.
 *
 * This test pins that contract by mocking the DB to return an empty
 * result and calling the export route with `?demo=1`. The output must
 * not contain any of the demo identifiers from
 * lib/demo/accountability-story (e.g. 'demo-req-001', '_demo').
 */

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/v2/prove/economic-events/export/route';
import db from '@/lib/db';

const TENANT = '11111111-2222-3333-4444-555555555555';

let querySpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    querySpy = vi.spyOn(db as unknown as { query: (...args: unknown[]) => unknown }, 'query');
});
afterEach(() => querySpy.mockReset());

function req(qs: string): NextRequest {
    return new NextRequest(`http://x/api/v2/prove/economic-events/export?${qs}`, {
        headers: { 'x-p402-tenant': TENANT },
    });
}

describe('Export route — demo isolation', () => {
    it('ignores ?demo=1 and still hits the real DB query path', async () => {
        querySpy.mockResolvedValue({ rows: [] });
        await GET(req('format=json&demo=1'));
        // One SQL query was issued — it is the canonical SELECT. The route
        // does not branch on the demo parameter.
        expect(querySpy.mock.calls.length).toBe(1);
        const [sql, params] = querySpy.mock.calls[0]! as [string, unknown[]];
        expect(sql).toMatch(/^\s*SELECT/i);
        expect(sql).toMatch(/FROM\s+ai_economic_events/i);
        expect(params[0]).toBe(TENANT);
    });

    it('CSV output contains only the header row for an empty tenant, even with ?demo=1', async () => {
        querySpy.mockResolvedValue({ rows: [] });
        const res = await GET(req('format=csv&demo=1'));
        const body = await res.text();
        const lines = body.trimEnd().split('\n');
        expect(lines.length).toBe(1); // header only
        // None of the demo request_ids leak in.
        for (const needle of ['demo-req-001', 'demo-req-002', 'demo-req-003', '_demo']) {
            expect(body).not.toContain(needle);
        }
    });

    it('JSON output is events: [] for an empty tenant, even with ?demo=1', async () => {
        querySpy.mockResolvedValue({ rows: [] });
        const res = await GET(req('format=json&demo=1'));
        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.events).toEqual([]);
        // The response shape must never expose a _demo marker — only the
        // client-side builders do.
        expect(JSON.stringify(body)).not.toContain('_demo');
    });
});
