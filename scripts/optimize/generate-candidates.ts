/* eslint-disable no-console */
import { readFileSync } from 'node:fs';
import { runCandidatePipeline } from '../../lib/optimize/candidates';
import type { Candidate, GeneratorInput } from '../../lib/optimize/candidates';
import { loadProductionInput } from '../../lib/optimize/candidates/data/readOnlyLoader';

const FIXTURE_FLAG = '--fixture';
const READ_PROD_FLAG = '--read-production';
const TENANT_FLAG = '--tenant';
const WINDOW_DAYS_FLAG = '--window-days';
const ALLOW_PROD_LEGACY = '--allow-production';

function usage(): never {
  console.error('Usage:');
  console.error('  Fixture (default):');
  console.error('    tsx scripts/optimize/generate-candidates.ts --fixture <path-to-json>');
  console.error('  Production read-only dry run:');
  console.error('    tsx scripts/optimize/generate-candidates.ts --read-production --tenant <uuid> [--window-days N]');
  console.error('');
  console.error('Production execution is internal-only, SELECT-only, and never persists candidates.');
  process.exit(2);
}

function argValue(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  if (i === -1) return undefined;
  const v = args[i + 1];
  return v && !v.startsWith('--') ? v : undefined;
}

function redactCandidate(c: Candidate): Record<string, unknown> {
  return {
    candidate_id: c.candidate_id,
    type: c.type,
    tenant_id: c.tenant_id,
    slice: c.slice,
    confidence_score: c.confidence_score,
    window: c.evidence_snapshot.window,
    event_count: c.evidence_snapshot.event_id_range.count,
    outcome_count: c.evidence_snapshot.outcome_id_range.count,
    shadow_count: c.evidence_snapshot.shadow_decision_id_range.count,
    gates_passed: c.gate_results.filter((g) => g.passed).length,
    gates_total: c.gate_results.length,
  };
}

function summarize(candidates: Candidate[]): void {
  const byType: Record<string, number> = {};
  for (const c of candidates) byType[c.type] = (byType[c.type] ?? 0) + 1;
  const out = {
    total: candidates.length,
    by_type: byType,
    candidates: candidates.map(redactCandidate),
  };
  console.log(JSON.stringify(out, null, 2));
}

async function runFixture(path: string): Promise<void> {
  const raw = readFileSync(path, 'utf8');
  const input = JSON.parse(raw) as GeneratorInput;
  summarize(runCandidatePipeline(input));
}

async function runProduction(tenantId: string, windowDays: number): Promise<void> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId)) {
    console.error('REFUSED: --tenant must be a UUID.');
    process.exit(4);
  }
  if (!process.env.DATABASE_URL) {
    console.error('REFUSED: DATABASE_URL is not set. Production read requires an explicit connection.');
    process.exit(5);
  }

  const dbModule = await import('../../lib/db');
  const db = dbModule.default as { query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> };

  const end = new Date();
  const start = new Date(end.getTime() - windowDays * 24 * 60 * 60 * 1000);

  console.error(`[dry-run] tenant=${tenantId} window=${start.toISOString()}..${end.toISOString()}`);
  const input = await loadProductionInput(db, { tenantId, windowStart: start, windowEnd: end });
  console.error(`[dry-run] loaded events=${input.events.length} outcomes=${input.outcomes.length} shadow=${input.shadow_decisions.length} allowlist=${input.allowlist.length}`);

  const candidates = runCandidatePipeline(input);
  summarize(candidates);

  if (typeof (dbModule.default as { end?: () => Promise<unknown> | unknown }).end === 'function') {
    await (dbModule.default as { end: () => Promise<unknown> | unknown }).end();
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes(ALLOW_PROD_LEGACY)) {
    console.error('REFUSED: --allow-production is not a valid flag. Use --read-production --tenant <uuid>.');
    process.exit(3);
  }

  const wantsProd = args.includes(READ_PROD_FLAG);
  const tenant = argValue(args, TENANT_FLAG);

  if (wantsProd) {
    if (!tenant) {
      console.error('REFUSED: --read-production requires --tenant <uuid>.');
      process.exit(6);
    }
    const wd = Number(argValue(args, WINDOW_DAYS_FLAG) ?? '14');
    const windowDays = Number.isFinite(wd) && wd > 0 ? Math.floor(wd) : 14;
    await runProduction(tenant, windowDays);
    return;
  }

  const fixturePath = argValue(args, FIXTURE_FLAG);
  if (!fixturePath) usage();
  await runFixture(fixturePath);
}

main().catch((err) => {
  console.error('ERROR:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
