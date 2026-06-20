import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SCRIPT = join(__dirname, '..', 'enterprise-auth-sweep.ts');

describe('enterprise-auth-sweep source-shape safety', () => {
  const src = readFileSync(SCRIPT, 'utf8');

  it('never console.logs the password env var', () => {
    expect(src).not.toMatch(/console\.[a-z]+\([^)]*\bPASSWORD\b/);
    expect(src).not.toMatch(/console\.[a-z]+\([^)]*P402_QA_ADMIN_PASSWORD/);
    expect(src).not.toMatch(/console\.[a-z]+\([^)]*\bpassword\b/);
  });

  it('does not save Playwright storageState or auth state', () => {
    expect(src).not.toMatch(/storageState/);
    expect(src).not.toMatch(/storage_state/);
    expect(src).not.toMatch(/\.context\(\)\s*\.\s*storageState/);
  });

  it('takes no screenshots by default', () => {
    expect(src).not.toMatch(/\.screenshot\(/);
    expect(src).not.toMatch(/SCREENSHOT_PATH/);
  });

  it('does not import Redis', () => {
    expect(src).not.toMatch(/from\s+['"]@?\/?lib\/redis['"]/);
    expect(src).not.toMatch(/from\s+['"]ioredis['"]/);
    expect(src).not.toMatch(/from\s+['"]@upstash\/redis['"]/);
  });

  it('does not import database, SQL clients, or migration tooling', () => {
    expect(src).not.toMatch(/from\s+['"]@?\/?lib\/db['"]/);
    expect(src).not.toMatch(/from\s+['"]pg['"]/);
    expect(src).not.toMatch(/scripts\/migrations/);
    expect(src).not.toMatch(/scripts\/migrate/);
  });

  it('issues no PATCH, PUT, or DELETE requests', () => {
    expect(src).not.toMatch(/\.request\.patch\(/);
    expect(src).not.toMatch(/\.request\.put\(/);
    expect(src).not.toMatch(/\.request\.delete\(/);
  });

  it('issues no chat/completions or provider routes', () => {
    expect(src).not.toMatch(/chat\/completions/);
    expect(src).not.toMatch(/\/api\/v2\/router\b/);
    expect(src).not.toMatch(/openai\.com|anthropic\.com|googleapis\.com/);
  });

  it('issues at most one POST: the admin login endpoint', () => {
    const posts = src.match(/\.request\.post\([^)]*\)/g) ?? [];
    expect(posts.length).toBeGreaterThan(0);
    for (const call of posts) {
      expect(call).toMatch(/\/api\/admin\/auth/);
    }
  });

  it('declares a stop recommendation when login fails or secrets/content leak', () => {
    expect(src).toMatch(/result\.recommendation\s*=\s*'stop'/);
    expect(src).toMatch(/'pass'\s*\|\s*'small_patch'\s*\|\s*'stop'/);
  });

  it('emits a single JSON summary to stdout', () => {
    expect(src).toMatch(/JSON\.stringify\(result/);
  });

  it('does not write credentials or cookies to disk', () => {
    expect(src).not.toMatch(/\bwriteFileSync\b/);
    expect(src).not.toMatch(/\bappendFileSync\b/);
    expect(src).not.toMatch(/\bcreateWriteStream\b/);
    expect(src).not.toMatch(/cookies\(\)\s*\)/);
  });

  it('credentials_printed / credentials_stored / screenshots_saved are reported false by construction', () => {
    expect(src).toMatch(/credentials_printed:\s*false/);
    expect(src).toMatch(/credentials_stored:\s*false/);
    expect(src).toMatch(/screenshots_saved:\s*false/);
  });
});
