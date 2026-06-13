/**
 * Slice 3T — migrate:list
 *
 * Inspect mode for scripts/migrations/. Never connects to the DB. Does
 * not require DATABASE_URL. Safe to run anywhere.
 *
 * Output format per file:
 *   <name>   <size>B   <mtime ISO>   <kind>   <first-comment>
 *
 * Where <kind> is one of:
 *   - up   : an additive migration file
 *   - DOWN : a rollback file (matches *_down.sql). Flagged distinctly so
 *           anyone scanning the list cannot miss it.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ListedMigration {
    name: string;
    sizeBytes: number;
    mtimeIso: string;
    kind: 'up' | 'down';
    firstComment: string;
}

export const MIGRATIONS_DIR = path.join(process.cwd(), 'scripts', 'migrations');

export function isDownFile(name: string): boolean {
    return name.endsWith('_down.sql');
}

export function readFirstComment(absPath: string): string {
    try {
        const head = fs.readFileSync(absPath, 'utf8').split('\n').slice(0, 30);
        for (const line of head) {
            const t = line.trim();
            if (t.startsWith('--')) {
                return t.replace(/^--\s?/, '').trim();
            }
        }
        return '';
    } catch {
        return '';
    }
}

export function listMigrations(dir: string = MIGRATIONS_DIR): ListedMigration[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files = entries
        .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.sql'))
        .map((e) => e.name)
        .sort();

    return files.map((name) => {
        const abs = path.join(dir, name);
        const st = fs.statSync(abs);
        return {
            name,
            sizeBytes: st.size,
            mtimeIso: st.mtime.toISOString(),
            kind: isDownFile(name) ? 'down' : 'up',
            firstComment: readFirstComment(abs),
        };
    });
}

export function formatLine(m: ListedMigration): string {
    const tag = m.kind === 'down' ? '[DOWN · rollback · never auto-applied]' : '[up]';
    const head = m.firstComment ? ` — ${m.firstComment}` : '';
    return `${m.name.padEnd(50)}  ${String(m.sizeBytes).padStart(7)}B  ${m.mtimeIso}  ${tag}${head}`;
}

export function main(): number {
    const all = listMigrations();
    const ups   = all.filter((m) => m.kind === 'up');
    const downs = all.filter((m) => m.kind === 'down');

    process.stdout.write(`# scripts/migrations/ — ${all.length} files (${ups.length} up, ${downs.length} down)\n`);
    process.stdout.write(`# Read-only inventory. No DB connection. Use migrate:apply to apply one file.\n\n`);
    for (const m of all) {
        process.stdout.write(formatLine(m) + '\n');
    }
    return 0;
}

if (process.argv[1] && process.argv[1].endsWith('list-migrations.ts')) {
    process.exit(main());
}
