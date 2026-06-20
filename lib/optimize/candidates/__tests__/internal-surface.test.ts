import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..');
const API_ROUTE = join(ROOT, 'app', 'api', 'admin', 'optimize', 'candidates', 'route.ts');
const PAGE = join(ROOT, 'app', 'admin', '(protected)', 'optimize-candidates', 'page.tsx');
const SIDEBAR = join(ROOT, 'app', 'admin', '_components', 'AdminSidebar.tsx');

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

describe('internal Optimize candidate review surface (3AM)', () => {
  it('admin API route exists and gates on requireAdminAccess', () => {
    expect(existsSync(API_ROUTE)).toBe(true);
    const src = read(API_ROUTE);
    expect(src).toMatch(/requireAdminAccess\s*\(\s*['"]system\.\*['"]\s*\)/);
  });

  it('admin API route exposes GET only', () => {
    const src = read(API_ROUTE);
    expect(src).toMatch(/export\s+async\s+function\s+GET\s*\(/);
    expect(src).not.toMatch(/export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\s*\(/);
  });

  it('admin page is mounted under the protected admin layout', () => {
    expect(existsSync(PAGE)).toBe(true);
    expect(PAGE).toContain(join('admin', '(protected)'));
  });

  it('admin sidebar is not modified to link the internal candidate route', () => {
    const src = read(SIDEBAR);
    expect(src).not.toMatch(/optimize-candidates/);
  });

  it('no tenant-visible Optimize candidate route exists', () => {
    expect(existsSync(join(ROOT, 'app', 'api', 'v2', 'optimize', 'candidates'))).toBe(false);
    expect(existsSync(join(ROOT, 'app', 'dashboard', 'optimize', 'candidates'))).toBe(false);
    expect(existsSync(join(ROOT, 'app', 'dashboard', 'optimize', 'internal-candidates'))).toBe(false);
  });

  it('internal surface and API route contain the required disclaimer or status label', () => {
    const page = read(PAGE);
    expect(page).toMatch(/These are not recommendations/);
    expect(page).toMatch(/Nothing is applied/);
    expect(page).toMatch(/No savings are claimed/);
    expect(page).toMatch(/No internal candidates generated/);
    expect(page).toMatch(/internal_candidate/);
  });

  it('admin API route performs no writes', () => {
    const src = read(API_ROUTE);
    expect(src).not.toMatch(/\bINSERT\b/i);
    expect(src).not.toMatch(/\bUPDATE\b/i);
    expect(src).not.toMatch(/\bDELETE\b/i);
    expect(src).not.toMatch(/\bUPSERT\b/i);
  });

  it('admin API route does not import Redis', () => {
    const src = read(API_ROUTE);
    expect(src).not.toMatch(/from\s+['"]@\/lib\/redis['"]/);
  });

  it('admin API route does not import migration tooling', () => {
    const src = read(API_ROUTE);
    expect(src).not.toMatch(/scripts\/migrations/);
    expect(src).not.toMatch(/scripts\/migrate/);
  });

  it('admin API route does not reference savings, apply, or auto-apply', () => {
    const src = read(API_ROUTE);
    expect(src).not.toMatch(/verified[_-]?savings/i);
    expect(src).not.toMatch(/policy[_-]?auto[_-]?apply/i);
    expect(src).not.toMatch(/applyRecommendation/);
    expect(src).not.toMatch(/rollbackRecommendation/);
  });

  it('internal page and route do not introduce prompt or response content fields', () => {
    for (const src of [read(API_ROUTE), read(PAGE)]) {
      expect(src).not.toMatch(/\bprompt_content\b/);
      expect(src).not.toMatch(/\bresponse_content\b/);
      expect(src).not.toMatch(/\bmessage_content\b/);
      expect(src).not.toMatch(/\bcompletion_text\b/);
    }
  });

  it('lib/optimize/candidates/internal does not import db or redis', () => {
    const files = walk(join(ROOT, 'lib', 'optimize', 'candidates', 'internal'));
    for (const f of files) {
      const src = read(f);
      expect(src).not.toMatch(/from\s+['"]@\/lib\/db['"]/);
      expect(src).not.toMatch(/from\s+['"]@\/lib\/redis['"]/);
    }
  });
});
