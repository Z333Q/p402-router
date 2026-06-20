import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ADMIN_ROLES, parseArgs, parseRole } from '../set-admin-password';

const SCRIPT_PATH = join(__dirname, '..', 'set-admin-password.ts');

describe('set-admin-password CLI', () => {
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

  describe('script source-shape safety', () => {
    const src = readFileSync(SCRIPT_PATH, 'utf8');

    it('never console.logs the password argument', () => {
      expect(src).not.toMatch(/console\.(log|error|warn|info|debug)\([^)]*\bpassword\b/);
    });

    it('never prints the computed hash or hash prefix', () => {
      expect(src).not.toMatch(/console\.(log|error|warn|info|debug)\([^)]*\bhash\b/);
      expect(src).not.toMatch(/hash_prefix:/);
    });

    it('writes no files', () => {
      expect(src).not.toMatch(/\bwriteFileSync\b/);
      expect(src).not.toMatch(/\bappendFileSync\b/);
      expect(src).not.toMatch(/createWriteStream/);
    });

    it('does not import @/lib/redis', () => {
      expect(src).not.toMatch(/from\s+['"]@\/lib\/redis['"]/);
    });

    it('only writes to admin_users (no other table is targeted)', () => {
      const inserts = src.match(/\bINSERT\s+INTO\s+\w+/gi) ?? [];
      for (const stmt of inserts) {
        expect(stmt.toLowerCase()).toMatch(/\binsert\s+into\s+admin_users\b/);
      }
      // bare UPDATE <table> SET ... (not ON CONFLICT DO UPDATE SET)
      const updates = src.match(/(?<!DO\s)\bUPDATE\s+([a-zA-Z_]\w*)\s+SET\b/gi) ?? [];
      for (const stmt of updates) {
        expect(stmt.toLowerCase()).toMatch(/\bupdate\s+admin_users\s+set\b/);
      }
      expect(src).not.toMatch(/\bDELETE\s+FROM\b/i);
      expect(src).not.toMatch(/\bTRUNCATE\b/i);
    });
  });
});
