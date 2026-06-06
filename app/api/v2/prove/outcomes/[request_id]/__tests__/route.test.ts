/**
 * Slice 3J — GET /api/v2/prove/outcomes/[request_id] tests.
 *
 *   - tenant-scoped on (tenant_id = $1 AND request_id = $2)
 *   - 404 when no row exists for the tenant
 *   - 404 for cross-tenant lookups (the SQL never reaches another tenant)
 *   - legacy stored values normalize to canonical on read
 *   - canonical sources flag source_is_canonical=true
 *   - non-canonical sources are preserved with source_is_canonical=false
 *   - SELECT projection does NOT touch any content-bearing column
 */

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/v2/prove/outcomes/[request_id]/route';
import db from '@/lib/db';

const TENANT = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

let querySpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    querySpy = vi.spyOn(db as unknown as { query: (...args: unknown[]) => unknown }, 'query');
});
afterEach(() => querySpy.mockReset());

function req(reqId: string): NextRequest {
    return new NextRequest(`http://x/api/v2/prove/outcomes/${reqId}`, {
        headers: { 'x-p402-tenant': TENANT },
    });
}
function ctx(reqId: string) {
    return { params: Promise.resolve({ request_id: reqId }) };
}

function dbRow(over: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        request_id: 'req-out-1',
        status: 'accepted',
        quality_score: 0.91,
        source: 'sdk',
        metadata: { rejected_reason: null },
        created_at: new Date('2026-06-05T10:00:00Z'),
        updated_at: new Date('2026-06-05T10:00:00Z'),
        ...over,
    };
}

describe('404 paths', () => {
    it('returns 404 when no row exists', async () => {
        querySpy.mockResolvedValue({ rows: [] });
        const res = await GET(req('req-missing'), ctx('req-missing'));
        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body.error.code).toBe('NOT_FOUND');
    });

    it('cross-tenant lookups return 404 because the WHERE binds the caller tenant', async () => {
        querySpy.mockImplementation(async (_sql: string, params?: unknown[]) => {
            // Only the caller's tenant ever sees rows.
            if (params?.[0] === TENANT) return { rows: [] };
            return { rows: [dbRow()] };
        });
        const res = await GET(req('req-foreign'), ctx('req-foreign'));
        expect(res.status).toBe(404);
    });
});

describe('Read-only + content-safety', () => {
    it('issues only a SELECT scoped to tenant_id + request_id', async () => {
        querySpy.mockResolvedValue({ rows: [dbRow()] });
        await GET(req('req-out-1'), ctx('req-out-1'));
        expect(querySpy.mock.calls.length).toBe(1);
        const [sql, params] = querySpy.mock.calls[0]! as [string, unknown[]];
        expect(sql).toMatch(/^\s*SELECT/i);
        expect(sql).toMatch(/FROM\s+request_outcomes/i);
        expect(sql).toMatch(/WHERE\s+tenant_id\s*=\s*\$1\s+AND\s+request_id\s*=\s*\$2/i);
        expect(params[0]).toBe(TENANT);
        expect(params[1]).toBe('req-out-1');
        expect(sql).not.toMatch(/\b(INSERT|UPDATE|DELETE|ON\s+CONFLICT)\b/i);
    });

    it('SELECT never references content-bearing columns', async () => {
        querySpy.mockResolvedValue({ rows: [dbRow()] });
        await GET(req('req-out-1'), ctx('req-out-1'));
        const sql = String((querySpy.mock.calls[0]! as [string])[0]).toLowerCase();
        for (const re of [
            /\bprompt\b/, /\bresponse\b/, /\bmessages\b/, /\bcompletion\b/,
            /\bresponse_body\b/, /\brequest_body\b/, /\btranscript\b/, /\bcontent\b/,
        ]) {
            expect(sql).not.toMatch(re);
        }
    });
});

describe('Response shape + legacy normalization', () => {
    it('canonical status passes through verbatim', async () => {
        querySpy.mockResolvedValue({ rows: [dbRow({ status: 'accepted' })] });
        const body = await (await GET(req('req-out-1'), ctx('req-out-1'))).json();
        expect(body.outcome.status).toBe('accepted');
        expect(body.outcome.legacy_status).toBeNull();
        expect(body.outcome.quality_score).toBe(0.91);
        expect(body.outcome.source).toBe('sdk');
        expect(body.outcome.source_is_canonical).toBe(true);
    });

    it('legacy "retried" normalizes to "revised" with legacy_status preserved', async () => {
        querySpy.mockResolvedValue({ rows: [dbRow({ status: 'retried' })] });
        const body = await (await GET(req('req-out-1'), ctx('req-out-1'))).json();
        expect(body.outcome.status).toBe('revised');
        expect(body.outcome.legacy_status).toBe('retried');
    });

    it('legacy "human_reviewed" normalizes to "accepted" with legacy_status preserved', async () => {
        querySpy.mockResolvedValue({ rows: [dbRow({ status: 'human_reviewed' })] });
        const body = await (await GET(req('req-out-1'), ctx('req-out-1'))).json();
        expect(body.outcome.status).toBe('accepted');
        expect(body.outcome.legacy_status).toBe('human_reviewed');
    });

    it('non-canonical sources flag source_is_canonical=false and are preserved', async () => {
        querySpy.mockResolvedValue({ rows: [dbRow({ source: 'webhook' })] });
        const body = await (await GET(req('req-out-1'), ctx('req-out-1'))).json();
        expect(body.outcome.source).toBe('webhook');
        expect(body.outcome.source_is_canonical).toBe(false);
    });

    it('400 when request_id is over 256 chars', async () => {
        const huge = 'x'.repeat(257);
        const res = await GET(req(huge), ctx(huge));
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error.code).toBe('INVALID_INPUT');
    });
});
