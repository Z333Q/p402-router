import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..');

function read(p: string): string {
  return readFileSync(p, 'utf8');
}

function walk(dir: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === '__tests__') continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

describe('Phase 1 source-shape safety', () => {
  it('CLI refuses production execution by default', () => {
    const cli = read(join(ROOT, 'scripts', 'optimize', 'generate-candidates.ts'));
    expect(cli).toMatch(/REFUSED: production execution is not permitted in Phase 1/);
    expect(cli).toMatch(/--allow-production/);
    expect(cli).toMatch(/--fixture/);
  });

  it('Phase 1 sources contain no prompt or response content fields', () => {
    const files = walk(join(ROOT, 'lib', 'optimize'));
    const forbidden = [
      /\bprompt_content\b/,
      /\bprompt_text\b/,
      /\bresponse_content\b/,
      /\bresponse_text\b/,
      /\bmessage_content\b/,
      /\bcompletion_text\b/,
    ];
    for (const f of files) {
      const src = read(f);
      for (const pat of forbidden) {
        expect(src, `forbidden field ${pat} found in ${f}`).not.toMatch(pat);
      }
    }
  });

  it('no tenant-visible Optimize candidate route exists', () => {
    const tenantRoute = join(ROOT, 'app', 'api', 'v2', 'optimize', 'candidates');
    expect(existsSync(tenantRoute)).toBe(false);
    const tenantDashboard = join(ROOT, 'app', 'dashboard', 'optimize', 'candidates');
    expect(existsSync(tenantDashboard)).toBe(false);
  });

  it('Phase 1 sources do not import database, redis, or migration tooling', () => {
    const files = walk(join(ROOT, 'lib', 'optimize')).concat(
      walk(join(ROOT, 'scripts', 'optimize')),
    );
    const forbiddenImports = [
      /from\s+['"]@\/lib\/db['"]/,
      /from\s+['"]@\/lib\/redis['"]/,
      /from\s+['"]\.\.\/\.\.\/db['"]/,
      /from\s+['"]\.\.\/\.\.\/redis['"]/,
    ];
    for (const f of files) {
      if (!f.endsWith('.ts')) continue;
      const src = read(f);
      for (const pat of forbiddenImports) {
        expect(src, `forbidden import ${pat} found in ${f}`).not.toMatch(pat);
      }
    }
  });

  it('Phase 1 sources do not reference savings, apply, or auto-apply surfaces', () => {
    const files = walk(join(ROOT, 'lib', 'optimize'));
    const forbidden = [
      /verified[_-]?savings/i,
      /policy[_-]?auto[_-]?apply/i,
      /applyRecommendation/,
      /rollbackRecommendation/,
    ];
    for (const f of files) {
      const src = read(f);
      for (const pat of forbidden) {
        expect(src, `forbidden phrase ${pat} found in ${f}`).not.toMatch(pat);
      }
    }
  });
});
