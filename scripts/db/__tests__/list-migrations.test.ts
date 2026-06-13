/**
 * Slice 3T — unit tests for scripts/db/list-migrations.ts
 *
 * No DB connection. Inspect-only inventory.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
    isDownFile,
    readFirstComment,
    listMigrations,
    formatLine,
} from '../list-migrations';

function makeTempMigrations(): { dir: string; cleanup: () => void } {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'list-migrations-test-'));
    const dir = path.join(root, 'migs');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'v2_001_initial.sql'),
        '-- initial schema migration\nCREATE TABLE x();\n');
    fs.writeFileSync(path.join(dir, 'v2_055_tenant_control_settings.sql'),
        '-- v2_055: tenant_control_settings — tenant-level Control defaults.\nCREATE TABLE y();\n');
    fs.writeFileSync(path.join(dir, 'v2_055_tenant_control_settings_down.sql'),
        '-- v2_055 rollback. NEVER auto-run. Document-only safety net.\nDROP TABLE y;\n');
    fs.writeFileSync(path.join(dir, 'README.md'), '# not sql\n');  // ignored
    return { dir, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}

describe('isDownFile', () => {
    it('matches the _down.sql suffix exactly', () => {
        expect(isDownFile('v2_055_down.sql')).toBe(true);
        expect(isDownFile('v2_055_tenant_control_settings_down.sql')).toBe(true);
        expect(isDownFile('v2_055.sql')).toBe(false);
        expect(isDownFile('v2_055_down.sql.bak')).toBe(false);
    });
});

describe('readFirstComment', () => {
    it('returns the first SQL line comment, trimmed', () => {
        const t = makeTempMigrations();
        try {
            const c = readFirstComment(path.join(t.dir, 'v2_055_tenant_control_settings.sql'));
            expect(c).toMatch(/^v2_055:/);
        } finally { t.cleanup(); }
    });

    it('returns empty string for missing or unreadable files', () => {
        expect(readFirstComment('/non/existent/path.sql')).toBe('');
    });
});

describe('listMigrations', () => {
    it('lists only .sql files, sorted, and tags _down rows', () => {
        const t = makeTempMigrations();
        try {
            const all = listMigrations(t.dir);
            expect(all.map((m) => m.name)).toEqual([
                'v2_001_initial.sql',
                'v2_055_tenant_control_settings.sql',
                'v2_055_tenant_control_settings_down.sql',
            ]);
            const kinds = all.map((m) => m.kind);
            expect(kinds).toEqual(['up', 'up', 'down']);
            // First comment is captured for each.
            expect(all[0]!.firstComment).toMatch(/initial/);
        } finally { t.cleanup(); }
    });

    it('skips non-.sql files', () => {
        const t = makeTempMigrations();
        try {
            const names = listMigrations(t.dir).map((m) => m.name);
            expect(names).not.toContain('README.md');
        } finally { t.cleanup(); }
    });
});

describe('formatLine', () => {
    it('marks DOWN rows distinctly', () => {
        const line = formatLine({
            name: 'v2_055_tenant_control_settings_down.sql',
            sizeBytes: 100,
            mtimeIso: '2026-06-13T00:00:00.000Z',
            kind: 'down',
            firstComment: 'v2_055 rollback. NEVER auto-run.',
        });
        expect(line).toContain('[DOWN');
        expect(line).toContain('rollback');
        expect(line).toContain('never auto-applied');
    });

    it('marks UP rows simply', () => {
        const line = formatLine({
            name: 'v2_055_tenant_control_settings.sql',
            sizeBytes: 200,
            mtimeIso: '2026-06-13T00:00:00.000Z',
            kind: 'up',
            firstComment: 'tenant_control_settings',
        });
        expect(line).toContain('[up]');
        expect(line).not.toContain('[DOWN');
    });
});
