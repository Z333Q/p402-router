/**
 * Slice 3T — unit + source-shape tests for scripts/db/apply-migration.ts
 * and the quarantined scripts/migrate.ts.
 *
 * No DB connections. Pure unit tests against the runner's exported
 * helpers + the run() entrypoint with a mocked client factory and
 * mocked prompter.
 */

import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';

import {
    parseArgs,
    resolveMigrationFile,
    isDownFile,
    assertTarget,
    assertDownGate,
    assertProductionGate,
    sha256OfFile,
    formatAuditLine,
    confirmInteractive,
    RefusalError,
    run,
    AUDIT_LOG_FILE,
    type DbClient,
} from '../apply-migration';
import { redactPostgresUrl } from '../_lib/redact';

// ─────────────────────────────────────────────────────────────────────────────
// Fixture: a temp "scripts/migrations" tree with a few files
// ─────────────────────────────────────────────────────────────────────────────

function makeTempRoot(): { root: string; migrationsDir: string; cleanup: () => void } {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'migrate-test-'));
    const migrationsDir = path.join(root, 'scripts', 'migrations');
    fs.mkdirSync(migrationsDir, { recursive: true });
    fs.writeFileSync(path.join(migrationsDir, 'v2_999_test_up.sql'),
        '-- test up migration\nSELECT 1;\n');
    fs.writeFileSync(path.join(migrationsDir, 'v2_999_test_up_down.sql'),
        '-- test rollback migration\nSELECT 0;\n');
    fs.writeFileSync(path.join(migrationsDir, 'neon-sql-editor-full-apply.sql'),
        '-- this should never be applied via the runner\nSELECT 99;\n');
    return {
        root,
        migrationsDir,
        cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
    };
}

function makeMockClient(opts: { failOnSql?: boolean } = {}): {
    client: DbClient;
    calls: string[];
} {
    const calls: string[] = [];
    const client: DbClient = {
        async connect()         { calls.push('connect'); },
        async query(sql: string) {
            calls.push(sql.length > 80 ? sql.slice(0, 80) + '...' : sql);
            if (opts.failOnSql && /SELECT 1/.test(sql)) {
                throw new Error('mock SQL failure');
            }
        },
        async end() { calls.push('end'); },
    };
    return { client, calls };
}

// ─────────────────────────────────────────────────────────────────────────────
// parseArgs
// ─────────────────────────────────────────────────────────────────────────────

describe('parseArgs', () => {
    it('returns no defaults', () => {
        const a = parseArgs([]);
        expect(a.file).toBeUndefined();
        expect(a.target).toBeUndefined();
        expect(a.confirmProduction).toBeUndefined();
        expect(a.allowDown).toBe(false);
        expect(a.dryRun).toBe(false);
        expect(a.ci).toBe(false);
    });

    it('parses every documented flag', () => {
        const a = parseArgs([
            '--file', 'v2_055.sql',
            '--target', 'production',
            '--confirm-production', 'v2_055.sql',
            '--allow-down', '--dry-run', '--ci',
        ]);
        expect(a).toEqual({
            file: 'v2_055.sql',
            target: 'production',
            confirmProduction: 'v2_055.sql',
            allowDown: true,
            dryRun: true,
            ci: true,
        });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// resolveMigrationFile / isDownFile
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveMigrationFile — allowlist guard', () => {
    it('throws MISSING_FILE on empty input', () => {
        expect(() => resolveMigrationFile('')).toThrow(RefusalError);
        try { resolveMigrationFile(''); } catch (e) {
            expect((e as RefusalError).code).toBe('MISSING_FILE');
        }
    });

    it('refuses absolute paths', () => {
        try { resolveMigrationFile('/etc/passwd'); } catch (e) {
            expect((e as RefusalError).code).toBe('ABSOLUTE_PATH');
        }
    });

    it('refuses path traversal escape from scripts/migrations/', () => {
        const { root, cleanup } = makeTempRoot();
        try {
            try { resolveMigrationFile('../../../../etc/passwd', root); } catch (e) {
                expect((e as RefusalError).code).toBe('OUTSIDE_MIGRATIONS_DIR');
                return;
            }
            throw new Error('expected refusal');
        } finally { cleanup(); }
    });

    it('refuses subdirectory escape inside scripts/migrations/', () => {
        const { root, migrationsDir, cleanup } = makeTempRoot();
        try {
            // Nested file inside a sub-dir — must be refused because dirname !== migrationsAbs
            const sub = path.join(migrationsDir, 'sub');
            fs.mkdirSync(sub);
            fs.writeFileSync(path.join(sub, 'nested.sql'), '-- nope\n');
            try { resolveMigrationFile('sub/nested.sql', root); } catch (e) {
                expect((e as RefusalError).code).toBe('OUTSIDE_MIGRATIONS_DIR');
                return;
            }
            throw new Error('expected refusal');
        } finally { cleanup(); }
    });

    it('accepts a normal v2_NNN_*.sql', () => {
        const { root, cleanup } = makeTempRoot();
        try {
            const abs = resolveMigrationFile('v2_999_test_up.sql', root);
            expect(abs.endsWith('v2_999_test_up.sql')).toBe(true);
        } finally { cleanup(); }
    });

    it('accepts neon-sql-editor-full-apply.sql ONLY if it is in scripts/migrations/ AND other gates pass — but the down/allowlist gates do not apply here', () => {
        // Because the file resolver only checks "lives inside scripts/migrations/",
        // we cannot use the resolver alone to refuse this file. Refusal happens
        // through other gates (target / production / down) — we still document
        // here that scripts/migrations/neon-sql-editor-full-apply.sql, if it
        // existed there, would pass the resolver. The actual neon-sql file
        // lives at the repo root, not in scripts/migrations/, so:
        const { root, cleanup } = makeTempRoot();
        try {
            // Confirm: the actual neon-sql file outside scripts/migrations/ is refused.
            try { resolveMigrationFile('../neon-sql-editor-full-apply.sql', root); } catch (e) {
                expect((e as RefusalError).code).toBe('OUTSIDE_MIGRATIONS_DIR');
            }
        } finally { cleanup(); }
    });

    it('throws NOT_SQL for files without .sql extension', () => {
        const { root, migrationsDir, cleanup } = makeTempRoot();
        try {
            fs.writeFileSync(path.join(migrationsDir, 'README.txt'), '-- not sql\n');
            try { resolveMigrationFile('README.txt', root); } catch (e) {
                expect((e as RefusalError).code).toBe('NOT_SQL');
            }
        } finally { cleanup(); }
    });

    it('throws FILE_NOT_FOUND for missing files', () => {
        const { root, cleanup } = makeTempRoot();
        try {
            try { resolveMigrationFile('does_not_exist.sql', root); } catch (e) {
                expect((e as RefusalError).code).toBe('FILE_NOT_FOUND');
            }
        } finally { cleanup(); }
    });
});

describe('isDownFile', () => {
    it('matches _down.sql suffix', () => {
        expect(isDownFile('/x/v2_055_tenant_control_settings_down.sql')).toBe(true);
        expect(isDownFile('/x/v2_055_tenant_control_settings.sql')).toBe(false);
        expect(isDownFile('/x/v2_054_down.sql')).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Target + gate assertions
// ─────────────────────────────────────────────────────────────────────────────

describe('assertTarget', () => {
    it('throws MISSING_TARGET on undefined', () => {
        try { assertTarget(undefined); } catch (e) {
            expect((e as RefusalError).code).toBe('MISSING_TARGET');
        }
    });
    it('throws UNKNOWN_TARGET on garbage', () => {
        try { assertTarget('prod'); } catch (e) {
            expect((e as RefusalError).code).toBe('UNKNOWN_TARGET');
        }
    });
    it('accepts dev | staging | production', () => {
        expect(assertTarget('dev')).toBe('dev');
        expect(assertTarget('staging')).toBe('staging');
        expect(assertTarget('production')).toBe('production');
    });
});

describe('assertDownGate', () => {
    it('refuses _down.sql without --allow-down', () => {
        try { assertDownGate('/x/v2_055_down.sql', false); } catch (e) {
            expect((e as RefusalError).code).toBe('DOWN_WITHOUT_FLAG');
        }
    });
    it('permits _down.sql with --allow-down', () => {
        assertDownGate('/x/v2_055_down.sql', true);  // no throw
    });
    it('does not interfere with up files', () => {
        assertDownGate('/x/v2_055.sql', false);
        assertDownGate('/x/v2_055.sql', true);
    });
});

describe('assertProductionGate', () => {
    it('no-op for dev/staging', () => {
        assertProductionGate('dev', 'v2_055.sql', undefined);
        assertProductionGate('staging', 'v2_055.sql', undefined);
    });
    it('refuses production without --confirm-production', () => {
        try { assertProductionGate('production', 'v2_055.sql', undefined); } catch (e) {
            expect((e as RefusalError).code).toBe('PROD_CONFIRM_MISSING');
        }
    });
    it('refuses on filename mismatch', () => {
        try { assertProductionGate('production', 'v2_055.sql', 'v2_054.sql'); } catch (e) {
            expect((e as RefusalError).code).toBe('PROD_CONFIRM_MISMATCH');
        }
    });
    it('permits exact-match confirmation', () => {
        assertProductionGate('production', 'v2_055.sql', 'v2_055.sql');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// sha256
// ─────────────────────────────────────────────────────────────────────────────

describe('sha256OfFile', () => {
    it('returns a 64-char hex digest of file contents', () => {
        const { root, migrationsDir, cleanup } = makeTempRoot();
        try {
            const abs = path.join(migrationsDir, 'v2_999_test_up.sql');
            const h = sha256OfFile(abs);
            expect(h).toMatch(/^[0-9a-f]{64}$/);
            // Same input -> same hash.
            expect(sha256OfFile(abs)).toBe(h);
        } finally { cleanup(); }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Audit log redaction
// ─────────────────────────────────────────────────────────────────────────────

describe('audit log redaction', () => {
    it('redactPostgresUrl strips password but keeps db/host/user', () => {
        const r = redactPostgresUrl('postgresql://neondb_owner:supersecret@ep-host-pooler.neon.tech/neondb?sslmode=require');
        expect(r.db).toBe('neondb');
        expect(r.host).toBe('ep-host-pooler.neon.tech');
        expect(r.user).toBe('neondb_owner');
        expect(r.redactedUrl).toContain('***REDACTED***');
        expect(r.redactedUrl).not.toContain('supersecret');
    });

    it('falls back gracefully on unparseable input', () => {
        const r = redactPostgresUrl('not a url at all');
        expect(r.db).toBe('unknown');
        expect(r.redactedUrl).toContain('***REDACTED***');
    });

    it('formatAuditLine never contains the raw password', () => {
        const url = 'postgresql://neondb_owner:DO_NOT_LEAK@ep-host-pooler.neon.tech/neondb';
        const r = redactPostgresUrl(url);
        const line = formatAuditLine({
            timestampIso: '2026-06-13T18:30:00.000Z',
            file: 'v2_055.sql',
            sha256: '0'.repeat(64),
            target: 'production',
            db: r.db,
            host: r.host,
            user: r.user,
            status: 'ok',
            durationMs: 123,
            detail: '',
        });
        expect(line).not.toContain('DO_NOT_LEAK');
        expect(line).toContain('status=ok');
        expect(line).toContain('file=v2_055.sql');
        expect(line).toContain('duration=123ms');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// confirmInteractive
// ─────────────────────────────────────────────────────────────────────────────

describe('confirmInteractive', () => {
    it('accepts exact match', async () => {
        await confirmInteractive('v2_055.sql', async () => 'v2_055.sql');
    });
    it('rejects mismatch', async () => {
        await expect(confirmInteractive('v2_055.sql', async () => 'v2_054.sql'))
            .rejects.toBeInstanceOf(RefusalError);
    });
    it('trims operator answer', async () => {
        await confirmInteractive('v2_055.sql', async () => '  v2_055.sql\n');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// run() — end-to-end with mocked client + prompter
// ─────────────────────────────────────────────────────────────────────────────

describe('run()', () => {
    function setup() {
        const t = makeTempRoot();
        const lines: string[] = [];
        const logger = (l: string) => { lines.push(l); };
        return { ...t, lines, logger };
    }

    it('missing --file: refuses, never opens a client', async () => {
        const t = setup();
        try {
            let called = false;
            const code = await run({
                argv: ['--target', 'dev'],
                env: { DATABASE_URL: 'postgresql://u:p@h/d' },
                rootDir: t.root,
                logger: t.logger,
                clientFactory: async () => { called = true; return makeMockClient().client; },
            });
            expect(code).toBe(3);
            expect(called).toBe(false);
            expect(t.lines.join('\n')).toMatch(/MISSING_FILE/);
        } finally { t.cleanup(); }
    });

    it('missing --target: refuses, never opens a client', async () => {
        const t = setup();
        try {
            let called = false;
            const code = await run({
                argv: ['--file', 'v2_999_test_up.sql'],
                env: { DATABASE_URL: 'postgresql://u:p@h/d' },
                rootDir: t.root,
                logger: t.logger,
                clientFactory: async () => { called = true; return makeMockClient().client; },
            });
            expect(code).toBe(3);
            expect(called).toBe(false);
            expect(t.lines.join('\n')).toMatch(/MISSING_TARGET/);
        } finally { t.cleanup(); }
    });

    it('--dry-run never opens a client', async () => {
        const t = setup();
        try {
            let called = false;
            const code = await run({
                argv: ['--file', 'v2_999_test_up.sql', '--target', 'dev', '--dry-run'],
                env: { DATABASE_URL: 'postgresql://u:p@h/d' },
                rootDir: t.root,
                logger: t.logger,
                clientFactory: async () => { called = true; return makeMockClient().client; },
            });
            expect(code).toBe(0);
            expect(called).toBe(false);
            expect(t.lines.join('\n')).toMatch(/status=dry_run/);
            expect(t.lines.join('\n')).toMatch(/sha256=[0-9a-f]{64}/);
        } finally { t.cleanup(); }
    });

    it('successful apply: BEGIN, file SQL, COMMIT, exit 0', async () => {
        const t = setup();
        try {
            const m = makeMockClient();
            const code = await run({
                argv: ['--file', 'v2_999_test_up.sql', '--target', 'dev'],
                env: { DATABASE_URL: 'postgresql://u:p@h/d' },
                rootDir: t.root,
                logger: t.logger,
                clientFactory: async () => m.client,
            });
            expect(code).toBe(0);
            expect(m.calls[0]).toBe('connect');
            expect(m.calls[1]).toBe('BEGIN');
            expect(m.calls[2]).toMatch(/^-- test up migration/);
            expect(m.calls[3]).toBe('COMMIT');
            expect(m.calls[4]).toBe('end');
            expect(t.lines.join('\n')).toMatch(/status=ok/);
        } finally { t.cleanup(); }
    });

    it('SQL failure: BEGIN, file SQL throws, ROLLBACK, exit 1', async () => {
        const t = setup();
        try {
            const m = makeMockClient({ failOnSql: true });
            const code = await run({
                argv: ['--file', 'v2_999_test_up.sql', '--target', 'dev'],
                env: { DATABASE_URL: 'postgresql://u:p@h/d' },
                rootDir: t.root,
                logger: t.logger,
                clientFactory: async () => m.client,
            });
            expect(code).toBe(1);
            expect(m.calls).toContain('BEGIN');
            expect(m.calls).toContain('ROLLBACK');
            expect(m.calls).not.toContain('COMMIT');
            expect(t.lines.join('\n')).toMatch(/status=rolled_back/);
        } finally { t.cleanup(); }
    });

    it('_down.sql refused without --allow-down, never opens a client', async () => {
        const t = setup();
        try {
            let called = false;
            const code = await run({
                argv: ['--file', 'v2_999_test_up_down.sql', '--target', 'dev'],
                env: { DATABASE_URL: 'postgresql://u:p@h/d' },
                rootDir: t.root,
                logger: t.logger,
                clientFactory: async () => { called = true; return makeMockClient().client; },
            });
            expect(code).toBe(3);
            expect(called).toBe(false);
            expect(t.lines.join('\n')).toMatch(/DOWN_WITHOUT_FLAG/);
        } finally { t.cleanup(); }
    });

    it('_down.sql in production requires --allow-down AND --confirm-production AND interactive confirmation', async () => {
        const t = setup();
        try {
            const m = makeMockClient();
            // Missing --allow-down
            let code = await run({
                argv: ['--file', 'v2_999_test_up_down.sql', '--target', 'production',
                       '--confirm-production', 'v2_999_test_up_down.sql'],
                env: { DATABASE_URL: 'postgresql://u:p@h/d' },
                rootDir: t.root,
                logger: t.logger,
                clientFactory: async () => m.client,
            });
            expect(code).toBe(3);
            expect(m.calls).toEqual([]);

            // Missing --confirm-production
            code = await run({
                argv: ['--file', 'v2_999_test_up_down.sql', '--target', 'production', '--allow-down'],
                env: { DATABASE_URL: 'postgresql://u:p@h/d' },
                rootDir: t.root,
                logger: t.logger,
                clientFactory: async () => m.client,
            });
            expect(code).toBe(3);
            expect(m.calls).toEqual([]);

            // Mismatched interactive confirmation
            code = await run({
                argv: ['--file', 'v2_999_test_up_down.sql', '--target', 'production',
                       '--allow-down', '--confirm-production', 'v2_999_test_up_down.sql'],
                env: { DATABASE_URL: 'postgresql://u:p@h/d' },
                rootDir: t.root,
                logger: t.logger,
                prompter: async () => 'wrong-name.sql',
                clientFactory: async () => m.client,
            });
            expect(code).toBe(3);
            expect(m.calls).toEqual([]);

            // Full gauntlet passed
            code = await run({
                argv: ['--file', 'v2_999_test_up_down.sql', '--target', 'production',
                       '--allow-down', '--confirm-production', 'v2_999_test_up_down.sql'],
                env: { DATABASE_URL: 'postgresql://u:p@h/d' },
                rootDir: t.root,
                logger: t.logger,
                prompter: async () => 'v2_999_test_up_down.sql',
                clientFactory: async () => m.client,
            });
            expect(code).toBe(0);
            expect(m.calls[0]).toBe('connect');
            expect(m.calls).toContain('BEGIN');
            expect(m.calls).toContain('COMMIT');
            expect(t.lines.join('\n')).toMatch(/status=ok/);
        } finally { t.cleanup(); }
    });

    it('production --ci bypasses interactive prompt but still requires --confirm-production', async () => {
        const t = setup();
        try {
            const m = makeMockClient();
            // --ci without --confirm-production must still refuse.
            let code = await run({
                argv: ['--file', 'v2_999_test_up.sql', '--target', 'production', '--ci'],
                env: { DATABASE_URL: 'postgresql://u:p@h/d' },
                rootDir: t.root,
                logger: t.logger,
                clientFactory: async () => m.client,
            });
            expect(code).toBe(3);
            expect(m.calls).toEqual([]);

            // --ci with matching --confirm-production: skip interactive, apply.
            code = await run({
                argv: ['--file', 'v2_999_test_up.sql', '--target', 'production', '--ci',
                       '--confirm-production', 'v2_999_test_up.sql'],
                env: { DATABASE_URL: 'postgresql://u:p@h/d' },
                rootDir: t.root,
                logger: t.logger,
                prompter: async () => { throw new Error('interactive prompter should not be called in --ci'); },
                clientFactory: async () => m.client,
            });
            expect(code).toBe(0);
        } finally { t.cleanup(); }
    });

    it('missing DATABASE_URL: refuses before connect', async () => {
        const t = setup();
        try {
            let called = false;
            const code = await run({
                argv: ['--file', 'v2_999_test_up.sql', '--target', 'dev'],
                env: { /* no DATABASE_URL */ },
                rootDir: t.root,
                logger: t.logger,
                clientFactory: async () => { called = true; return makeMockClient().client; },
            });
            expect(code).toBe(3);
            expect(called).toBe(false);
            expect(t.lines.join('\n')).toMatch(/MISSING_DATABASE_URL/);
        } finally { t.cleanup(); }
    });

    it('audit log line never contains the password', async () => {
        const t = setup();
        try {
            const m = makeMockClient();
            await run({
                argv: ['--file', 'v2_999_test_up.sql', '--target', 'dev'],
                env: { DATABASE_URL: 'postgresql://u:DO_NOT_LEAK@h/d' },
                rootDir: t.root,
                logger: t.logger,
                clientFactory: async () => m.client,
            });
            expect(t.lines.join('\n')).not.toContain('DO_NOT_LEAK');
            // And the .migration-audit.log on disk also must not contain it
            const auditPath = path.join(t.root, AUDIT_LOG_FILE);
            if (fs.existsSync(auditPath)) {
                const audit = fs.readFileSync(auditPath, 'utf8');
                expect(audit).not.toContain('DO_NOT_LEAK');
            }
        } finally { t.cleanup(); }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Source-shape regression: scripts/migrate.ts is quarantined
// ─────────────────────────────────────────────────────────────────────────────

describe('scripts/migrate.ts — quarantined', () => {
    const SRC = readFileSync(resolvePath(process.cwd(), 'scripts', 'migrate.ts'), 'utf8');

    it('does not import pg (no DB connection possible)', () => {
        expect(SRC).not.toMatch(/from\s+['"]pg['"]/);
        expect(SRC).not.toMatch(/require\s*\(\s*['"]pg['"]\s*\)/);
    });

    it('does not reference any specific .sql migration filename', () => {
        expect(SRC).not.toMatch(/v2_\d{3}_[a-z_]+\.sql/);
    });

    it('exits non-zero and points at the safe runner', () => {
        expect(SRC).toMatch(/process\.exit\(\s*2\s*\)/);
        expect(SRC).toMatch(/migrate:apply/);
        expect(SRC).toMatch(/deprecated|quarantined/i);
    });
});
