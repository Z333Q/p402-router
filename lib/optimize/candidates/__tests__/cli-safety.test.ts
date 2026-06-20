import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const CLI = join(__dirname, '..', '..', '..', '..', 'scripts', 'optimize', 'generate-candidates.ts');

function src(): string {
  return readFileSync(CLI, 'utf8');
}

describe('Phase 1 CLI safety', () => {
  it('does not import @/lib/redis or top-level db (db is dynamic import)', () => {
    const s = src();
    expect(s).not.toMatch(/from\s+['"][^'"]*lib\/redis['"]/);
    expect(s).not.toMatch(/^\s*import\s+[^;]*\bfrom\s+['"][^'"]*lib\/db['"]/m);
    expect(s).toMatch(/await\s+import\(\s*['"][^'"]*lib\/db['"]\s*\)/);
  });

  it('contains no migration verbs or write SQL', () => {
    const s = src();
    expect(s).not.toMatch(/\bINSERT\s+INTO\b/i);
    expect(s).not.toMatch(/\bUPDATE\s+\w+\s+SET\b/i);
    expect(s).not.toMatch(/\bDELETE\s+FROM\b/i);
    expect(s).not.toMatch(/\bCREATE\s+TABLE\b/i);
    expect(s).not.toMatch(/\bDROP\s+TABLE\b/i);
    expect(s).not.toMatch(/\bALTER\s+TABLE\b/i);
  });

  it('refuses production reads without --read-production', () => {
    const s = src();
    expect(s).toMatch(/wantsProd\s*=\s*args\.includes\(READ_PROD_FLAG\)/);
  });

  it('refuses production reads without --tenant', () => {
    const s = src();
    expect(s).toMatch(/REFUSED: --read-production requires --tenant/);
  });

  it('validates the tenant id is a UUID before connecting', () => {
    const s = src();
    expect(s).toMatch(/REFUSED: --tenant must be a UUID/);
  });

  it('refuses when DATABASE_URL is not set', () => {
    const s = src();
    expect(s).toMatch(/DATABASE_URL is not set/);
  });

  it('rejects the legacy --allow-production flag explicitly', () => {
    const s = src();
    expect(s).toMatch(/--allow-production is not a valid flag/);
  });

  it('does not import any tenant-visible API route or dashboard module', () => {
    const s = src();
    expect(s).not.toMatch(/from\s+['"]@\/app\/api\/v2\//);
    expect(s).not.toMatch(/from\s+['"]@\/app\/dashboard\//);
  });

  it('never persists candidates', () => {
    const s = src();
    expect(s).not.toMatch(/INSERT/);
    expect(s).not.toMatch(/\bupsert\b/i);
    expect(s).not.toMatch(/\.save\(/);
    expect(s).not.toMatch(/\bpersistCandidate/);
  });
});
