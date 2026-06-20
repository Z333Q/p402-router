import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ADMIN_ROLES, parseArgs, parseRole } from '../admin-password-utils';

const SCRIPT_PATH = join(__dirname, '..', 'set-admin-password.ts');
const UTILS_PATH = join(__dirname, '..', 'admin-password-utils.ts');

describe('admin-password-utils', () => {
  describe('parseRole', () => {
    it('defaults to super_admin when --role is omitted', () => {
      expect(parseRole(undefined)).toBe('super_admin');
    });

    it('accepts every documented role', () => {
      for (const r of ADMIN_ROLES) {
        expect(parseRole(r)).toBe(r);
      }
    });

    it('rejects unknown roles', () => {
      expect(() => parseRole('root')).toThrow(/Invalid --role/);
      expect(() => parseRole('SUPER_ADMIN')).toThrow(/Invalid --role/);
    });
  });

  describe('parseArgs', () => {
    it('parses email + password with default role', () => {
      const out = parseArgs(['user@example.com', 'pw']);
      expect(out).toEqual({ email: 'user@example.com', password: 'pw', role: 'super_admin' });
    });

    it('parses --role flag in any position', () => {
      expect(parseArgs(['user@example.com', 'pw', '--role', 'ops_admin']).role).toBe('ops_admin');
      expect(parseArgs(['--role', 'analytics', 'user@example.com', 'pw']).role).toBe('analytics');
    });

    it('rejects missing email or password', () => {
      expect(() => parseArgs([])).toThrow(/Usage/);
      expect(() => parseArgs(['only-email@example.com'])).toThrow(/Usage/);
    });

    it('rejects invalid --role', () => {
      expect(() => parseArgs(['user@example.com', 'pw', '--role', 'root'])).toThrow(/Invalid --role/);
    });
  });
});

describe('set-admin-password script source-shape', () => {
  const src = readFileSync(SCRIPT_PATH, 'utf8');
  const utilsSrc = readFileSync(UTILS_PATH, 'utf8');

  it('imports parsers from admin-password-utils', () => {
    expect(src).toMatch(/from\s+['"]\.\/admin-password-utils['"]/);
  });

  it('runs main() unconditionally at the bottom (no isCli guard)', () => {
    expect(src).toMatch(/^main\(\)\.catch\(/m);
  });

  it('contains no isCli guard or import.meta.url CLI detection', () => {
    expect(src).not.toMatch(/\bisCli\b/);
    expect(src).not.toMatch(/import\.meta\.url\s*===/);
    expect(src).not.toMatch(/import\.meta\.url\.endsWith\(/);
  });

  it('never console.logs the password or hash', () => {
    expect(src).not.toMatch(/console\.(log|error|warn|info|debug)\([^)]*\bpassword\b/);
    expect(src).not.toMatch(/console\.(log|error|warn|info|debug)\([^)]*\bhash\b/);
    expect(src).not.toMatch(/console\.(log|error|warn|info|debug)\([^)]*\bdigest\b/);
    expect(src).not.toMatch(/console\.(log|error|warn|info|debug)\([^)]*\bsecret\b/);
    expect(src).not.toMatch(/hash_prefix:/);
    expect(src).not.toMatch(/Hash prefix/);
  });

  it('writes no files', () => {
    for (const s of [src, utilsSrc]) {
      expect(s).not.toMatch(/\bwriteFileSync\b/);
      expect(s).not.toMatch(/\bappendFileSync\b/);
      expect(s).not.toMatch(/createWriteStream/);
    }
  });

  it('does not import @/lib/redis', () => {
    expect(src).not.toMatch(/from\s+['"]@\/lib\/redis['"]/);
  });

  it('only writes to admin_users (no other table is targeted)', () => {
    const inserts = src.match(/\bINSERT\s+INTO\s+\w+/gi) ?? [];
    for (const stmt of inserts) {
      expect(stmt.toLowerCase()).toMatch(/\binsert\s+into\s+admin_users\b/);
    }
    const updates = src.match(/(?<!DO\s)\bUPDATE\s+([a-zA-Z_]\w*)\s+SET\b/gi) ?? [];
    for (const stmt of updates) {
      expect(stmt.toLowerCase()).toMatch(/\bupdate\s+admin_users\s+set\b/);
    }
    expect(src).not.toMatch(/\bDELETE\s+FROM\b/i);
    expect(src).not.toMatch(/\bTRUNCATE\b/i);
  });
});
