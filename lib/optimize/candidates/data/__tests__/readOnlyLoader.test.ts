import { describe, it, expect } from 'vitest';
import { loadProductionInput, READ_ONLY_QUERIES, type ReadOnlyQueryable } from '../readOnlyLoader';

describe('readOnlyLoader (Phase 1 production adapter)', () => {
  it('every query is SELECT only', () => {
    for (const sql of Object.values(READ_ONLY_QUERIES)) {
      const normalized = sql.replace(/\s+/g, ' ').trim().toUpperCase();
      expect(normalized.startsWith('SELECT')).toBe(true);
    }
  });

  it('no query contains write verbs', () => {
    const forbidden = [/\bINSERT\b/, /\bUPDATE\b/, /\bDELETE\b/, /\bUPSERT\b/, /\bCREATE\b/, /\bALTER\b/, /\bDROP\b/, /\bTRUNCATE\b/, /\bGRANT\b/, /\bREVOKE\b/];
    for (const sql of Object.values(READ_ONLY_QUERIES)) {
      for (const pat of forbidden) {
        expect(sql, `forbidden verb ${pat} found`).not.toMatch(pat);
      }
    }
  });

  it('no query selects prompt or response content', () => {
    const forbidden = [/\bprompt\b/i, /\bresponse_body\b/i, /\bcompletion_text\b/i, /\bmessage_content\b/i, /\brequest_body\b/i];
    for (const sql of Object.values(READ_ONLY_QUERIES)) {
      for (const pat of forbidden) {
        expect(sql, `content field ${pat} found`).not.toMatch(pat);
      }
    }
  });

  it('every query is parameterized via positional bind variables', () => {
    expect(READ_ONLY_QUERIES.SQL_EVENTS).toContain('$1');
    expect(READ_ONLY_QUERIES.SQL_OUTCOMES).toContain('$1');
    expect(READ_ONLY_QUERIES.SQL_SHADOW).toContain('$1');
    expect(READ_ONLY_QUERIES.SQL_ALLOWLIST).toContain('$1');
  });

  it('every query scopes by tenant_id', () => {
    for (const [name, sql] of Object.entries(READ_ONLY_QUERIES)) {
      expect(sql, `${name} missing tenant_id scope`).toMatch(/tenant_id\s*=\s*\$1/);
    }
  });

  it('maps DB rows into the GeneratorInput shape', async () => {
    const calls: { text: string; params: unknown[] | undefined }[] = [];
    const fakeDb: ReadOnlyQueryable = {
      async query(text, params) {
        calls.push({ text, params });
        if (text === READ_ONLY_QUERIES.SQL_EVENTS) {
          return {
            rows: [
              { id: 'e1', request_id: 'r1', tenant_id: 't1', workflow_id: 'wf1', model_id: 'gpt-mini', provider_id: 'openai', cost_usd: 0.01, event_time: new Date('2026-06-05T00:00:00Z') },
            ],
          };
        }
        if (text === READ_ONLY_QUERIES.SQL_OUTCOMES) {
          return {
            rows: [
              { id: 'o1', tenant_id: 't1', workflow_id: 'wf1', event_id: 'e1', status: 'accepted', created_at: new Date('2026-06-05T00:00:00Z') },
            ],
          };
        }
        if (text === READ_ONLY_QUERIES.SQL_SHADOW) {
          return {
            rows: [
              { id: 's1', tenant_id: 't1', workflow_id: 'wf1', event_id: 'e1', emitted_at: new Date('2026-06-05T00:00:00Z') },
            ],
          };
        }
        if (text === READ_ONLY_QUERIES.SQL_ALLOWLIST) {
          return {
            rows: [
              { tenant_id: 't1', allowed_models: ['gpt-mini', 'legacy-model'], created_at: new Date('2025-01-01T00:00:00Z'), updated_at: new Date('2025-01-01T00:00:00Z') },
            ],
          };
        }
        return { rows: [] };
      },
    };

    const input = await loadProductionInput(fakeDb, {
      tenantId: 't1',
      windowStart: new Date('2026-06-01T00:00:00Z'),
      windowEnd: new Date('2026-06-15T00:00:00Z'),
    });

    expect(input.window.days).toBe(14);
    expect(input.events).toHaveLength(1);
    expect(input.events[0]?.cost_usd).toBe(0.01);
    expect(input.outcomes).toHaveLength(1);
    expect(input.outcomes[0]?.status).toBe('accepted');
    expect(input.shadow_decisions).toHaveLength(1);
    expect(input.allowlist).toEqual([
      { tenant_id: 't1', model_id: 'gpt-mini', added_at: '2025-01-01T00:00:00.000Z' },
      { tenant_id: 't1', model_id: 'legacy-model', added_at: '2025-01-01T00:00:00.000Z' },
    ]);

    expect(calls.length).toBe(4);
    for (const c of calls.slice(0, 3)) {
      expect(c.params?.[0]).toBe('t1');
    }
  });

  it('drops outcome rows with no matching event_id', async () => {
    const fakeDb: ReadOnlyQueryable = {
      async query(text) {
        if (text === READ_ONLY_QUERIES.SQL_OUTCOMES) {
          return { rows: [{ id: 'o1', tenant_id: 't1', workflow_id: 'wf1', event_id: null, status: 'accepted', created_at: new Date() }] };
        }
        return { rows: [] };
      },
    };
    const input = await loadProductionInput(fakeDb, {
      tenantId: 't1',
      windowStart: new Date('2026-06-01T00:00:00Z'),
      windowEnd: new Date('2026-06-15T00:00:00Z'),
    });
    expect(input.outcomes).toEqual([]);
  });

  it('maps non-{accepted, rejected} statuses to unknown', async () => {
    const fakeDb: ReadOnlyQueryable = {
      async query(text) {
        if (text === READ_ONLY_QUERIES.SQL_OUTCOMES) {
          return {
            rows: [
              { id: 'o1', tenant_id: 't1', workflow_id: 'wf1', event_id: 'e1', status: 'retried', created_at: new Date() },
              { id: 'o2', tenant_id: 't1', workflow_id: 'wf1', event_id: 'e2', status: 'failed', created_at: new Date() },
            ],
          };
        }
        return { rows: [] };
      },
    };
    const input = await loadProductionInput(fakeDb, {
      tenantId: 't1',
      windowStart: new Date('2026-06-01T00:00:00Z'),
      windowEnd: new Date('2026-06-15T00:00:00Z'),
    });
    expect(input.outcomes.every((o) => o.status === 'unknown')).toBe(true);
  });
});
