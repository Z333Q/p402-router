/**
 * Slice 3T — migrate:apply
 *
 * Gated, single-file migration runner. Replaces the dangerous
 * scripts/migrate.ts which was hardcoded to v2_001_initial_schema.sql.
 *
 * Hard rules:
 *   - --file <name> is REQUIRED. No default.
 *   - --target dev|staging|production is REQUIRED. No default.
 *   - The resolved file must live directly inside scripts/migrations/.
 *     Absolute paths, path traversal, and files outside that directory
 *     are refused.
 *   - *_down.sql files are refused unless --allow-down is passed.
 *   - --target production also requires:
 *       --confirm-production <same filename>
 *       interactive prompt with the same filename (unless --ci is set)
 *   - --dry-run validates everything but never opens a DB connection.
 *   - Apply runs in a single transaction: BEGIN, file SQL, COMMIT.
 *     On any error: ROLLBACK.
 *   - Audit log line is written to stderr and appended to
 *     .migration-audit.log (local-only, gitignored). The log line
 *     redacts the password and includes: filename, sha256, target, db,
 *     host, status, duration_ms.
 *
 * This runner does NOT:
 *   - default any argument
 *   - run CREATE EXTENSION
 *   - apply more than one file per invocation
 *   - read from outside scripts/migrations/
 *   - print DATABASE_URL or any credential
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

import { redactPostgresUrl } from './_lib/redact';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const MIGRATIONS_DIR_NAME = 'scripts/migrations';
export const AUDIT_LOG_FILE = '.migration-audit.log';

export type Target = 'dev' | 'staging' | 'production';
export const TARGETS: readonly Target[] = ['dev', 'staging', 'production'];

// ─────────────────────────────────────────────────────────────────────────────
// Argument parsing — pure, no I/O
// ─────────────────────────────────────────────────────────────────────────────

export interface ParsedArgs {
    file?: string;
    target?: string;
    confirmProduction?: string;
    allowDown: boolean;
    dryRun: boolean;
    ci: boolean;
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
    const args: ParsedArgs = {
        allowDown: false,
        dryRun: false,
        ci: false,
    };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        switch (a) {
            case '--file':
                args.file = argv[++i];
                break;
            case '--target':
                args.target = argv[++i];
                break;
            case '--confirm-production':
                args.confirmProduction = argv[++i];
                break;
            case '--allow-down':
                args.allowDown = true;
                break;
            case '--dry-run':
                args.dryRun = true;
                break;
            case '--ci':
                args.ci = true;
                break;
            default:
                // ignore unknown flags rather than coerce — but flag them on stderr
                if (a && a.startsWith('--')) {
                    process.stderr.write(`warning: unknown flag ignored: ${a}\n`);
                }
        }
    }
    return args;
}

// ─────────────────────────────────────────────────────────────────────────────
// File resolution — pure, no DB I/O
// ─────────────────────────────────────────────────────────────────────────────

export class RefusalError extends Error {
    public readonly code: string;
    constructor(code: string, message: string) {
        super(message);
        this.code = code;
    }
}

export function resolveMigrationFile(
    rawFile: string,
    rootDir: string = process.cwd(),
): string {
    if (!rawFile || rawFile.length === 0) {
        throw new RefusalError('MISSING_FILE', '--file is required');
    }
    if (path.isAbsolute(rawFile)) {
        throw new RefusalError('ABSOLUTE_PATH', `--file must not be an absolute path: ${rawFile}`);
    }
    const migrationsAbs = path.resolve(rootDir, MIGRATIONS_DIR_NAME);
    const candidate = path.resolve(migrationsAbs, rawFile);
    const candidateDir = path.dirname(candidate);
    if (candidateDir !== migrationsAbs) {
        throw new RefusalError(
            'OUTSIDE_MIGRATIONS_DIR',
            `--file must be a name inside ${MIGRATIONS_DIR_NAME}/, not "${rawFile}"`,
        );
    }
    if (!fs.existsSync(candidate)) {
        throw new RefusalError('FILE_NOT_FOUND', `migration file does not exist: ${rawFile}`);
    }
    if (!candidate.endsWith('.sql')) {
        throw new RefusalError('NOT_SQL', `--file must end with .sql: ${rawFile}`);
    }
    return candidate;
}

export function isDownFile(absPath: string): boolean {
    return path.basename(absPath).endsWith('_down.sql');
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation — pure, no DB I/O
// ─────────────────────────────────────────────────────────────────────────────

export function assertTarget(raw: string | undefined): Target {
    if (!raw) {
        throw new RefusalError('MISSING_TARGET', '--target dev|staging|production is required');
    }
    if (!(TARGETS as readonly string[]).includes(raw)) {
        throw new RefusalError('UNKNOWN_TARGET', `--target must be one of: ${TARGETS.join(', ')}; got "${raw}"`);
    }
    return raw as Target;
}

export function assertDownGate(absFile: string, allowDown: boolean): void {
    if (isDownFile(absFile) && !allowDown) {
        throw new RefusalError(
            'DOWN_WITHOUT_FLAG',
            `${path.basename(absFile)} is a rollback file; pass --allow-down to apply a down migration`,
        );
    }
}

export function assertProductionGate(
    target: Target,
    fileName: string,
    confirmProduction: string | undefined,
): void {
    if (target !== 'production') return;
    if (!confirmProduction) {
        throw new RefusalError(
            'PROD_CONFIRM_MISSING',
            `--target production requires --confirm-production <filename>`,
        );
    }
    if (confirmProduction !== fileName) {
        throw new RefusalError(
            'PROD_CONFIRM_MISMATCH',
            `--confirm-production "${confirmProduction}" does not match --file "${fileName}"`,
        );
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hash + audit
// ─────────────────────────────────────────────────────────────────────────────

export function sha256OfFile(absPath: string): string {
    const buf = fs.readFileSync(absPath);
    return crypto.createHash('sha256').update(buf).digest('hex');
}

export interface AuditLogLine {
    timestampIso: string;
    file: string;
    sha256: string;
    target: Target;
    db: string;
    host: string;
    user: string;
    status: 'dry_run' | 'ok' | 'rolled_back' | 'refused';
    durationMs: number | null;
    detail: string;
}

export function formatAuditLine(l: AuditLogLine): string {
    const dur = l.durationMs === null ? 'n/a' : `${l.durationMs}ms`;
    return [
        `[${l.timestampIso}]`,
        `status=${l.status}`,
        `file=${l.file}`,
        `sha256=${l.sha256}`,
        `target=${l.target}`,
        `db=${l.db}`,
        `host=${l.host}`,
        `user=${l.user}`,
        `duration=${dur}`,
        l.detail ? `detail=${JSON.stringify(l.detail)}` : '',
    ].filter(Boolean).join(' ');
}

export function appendAuditLog(line: string, rootDir: string = process.cwd()): void {
    try {
        fs.appendFileSync(path.join(rootDir, AUDIT_LOG_FILE), line + '\n', { encoding: 'utf8' });
    } catch {
        // Audit log is best-effort. Failing to write must not break the apply.
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Interactive confirmation
// ─────────────────────────────────────────────────────────────────────────────

export type Prompter = (question: string) => Promise<string>;

export function defaultPrompter(): Prompter {
    return (question: string) => new Promise<string>((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

export async function confirmInteractive(fileName: string, prompter: Prompter): Promise<void> {
    const answer = await prompter(`Type the migration filename to confirm: `);
    if (answer.trim() !== fileName) {
        throw new RefusalError(
            'INTERACTIVE_MISMATCH',
            `interactive confirmation "${answer.trim()}" does not match --file "${fileName}"`,
        );
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DB client interface (so tests can inject a mock)
// ─────────────────────────────────────────────────────────────────────────────

export interface DbClient {
    connect(): Promise<void>;
    query(sql: string): Promise<unknown>;
    end(): Promise<void>;
}

export type ClientFactory = (connectionString: string) => DbClient;

export async function defaultClientFactory(connectionString: string): Promise<DbClient> {
    const { Client } = await import('pg');
    return new Client({ connectionString }) as unknown as DbClient;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main runner
// ─────────────────────────────────────────────────────────────────────────────

export interface RunnerOptions {
    argv: readonly string[];
    env?: NodeJS.ProcessEnv;
    rootDir?: string;
    prompter?: Prompter;
    clientFactory?: (connectionString: string) => Promise<DbClient>;
    now?: () => Date;
    logger?: (line: string) => void;
}

export async function run(opts: RunnerOptions): Promise<number> {
    const env       = opts.env ?? process.env;
    const rootDir   = opts.rootDir ?? process.cwd();
    const prompter  = opts.prompter ?? defaultPrompter();
    const factory   = opts.clientFactory ?? defaultClientFactory;
    const now       = opts.now ?? (() => new Date());
    const logger    = opts.logger ?? ((line: string) => process.stderr.write(line + '\n'));

    let absFile = '';
    let fileName = '';
    let target: Target = 'dev';
    let sha = 'unknown';
    let target_db = redactPostgresUrl(env.DATABASE_URL);

    try {
        const args = parseArgs(opts.argv);
        absFile  = resolveMigrationFile(args.file ?? '', rootDir);
        fileName = path.basename(absFile);
        target   = assertTarget(args.target);
        assertDownGate(absFile, args.allowDown);
        assertProductionGate(target, fileName, args.confirmProduction);

        sha = sha256OfFile(absFile);

        if (args.dryRun) {
            const line = formatAuditLine({
                timestampIso: now().toISOString(),
                file: fileName,
                sha256: sha,
                target,
                db: target_db.db,
                host: target_db.host,
                user: target_db.user,
                status: 'dry_run',
                durationMs: null,
                detail: 'no DB connection',
            });
            logger(line);
            appendAuditLog(line, rootDir);

            // For human inspection: head + tail of the SQL
            const sql = fs.readFileSync(absFile, 'utf8');
            const lines = sql.split('\n');
            const head = lines.slice(0, 40).join('\n');
            const tail = lines.length > 60 ? lines.slice(-20).join('\n') : '';
            process.stdout.write(`\n-- dry-run preview: ${fileName} (sha256=${sha})\n`);
            process.stdout.write(head + '\n');
            if (tail) process.stdout.write(`\n-- ... [${lines.length - 60} lines elided] ...\n\n` + tail + '\n');
            return 0;
        }

        // Production-only interactive third confirmation, unless --ci.
        if (target === 'production' && !args.ci) {
            await confirmInteractive(fileName, prompter);
        }

        const connectionString = env.DATABASE_URL;
        if (!connectionString) {
            throw new RefusalError('MISSING_DATABASE_URL', 'DATABASE_URL is not set in the environment');
        }
        target_db = redactPostgresUrl(connectionString);

        const client = await factory(connectionString);
        const startedAt = Date.now();
        let status: 'ok' | 'rolled_back' = 'ok';
        let detail = '';
        try {
            await client.connect();
            await client.query('BEGIN');
            const sql = fs.readFileSync(absFile, 'utf8');
            try {
                await client.query(sql);
                await client.query('COMMIT');
                status = 'ok';
            } catch (e) {
                status = 'rolled_back';
                detail = e instanceof Error ? e.message : String(e);
                try { await client.query('ROLLBACK'); } catch { /* best effort */ }
            }
        } finally {
            try { await client.end(); } catch { /* best effort */ }
        }
        const durationMs = Date.now() - startedAt;
        const line = formatAuditLine({
            timestampIso: now().toISOString(),
            file: fileName,
            sha256: sha,
            target,
            db: target_db.db,
            host: target_db.host,
            user: target_db.user,
            status,
            durationMs,
            detail,
        });
        logger(line);
        appendAuditLog(line, rootDir);
        return status === 'ok' ? 0 : 1;
    } catch (e) {
        if (e instanceof RefusalError) {
            const line = formatAuditLine({
                timestampIso: now().toISOString(),
                file: fileName || (parseArgs(opts.argv).file ?? '(none)'),
                sha256: sha,
                target,
                db: target_db.db,
                host: target_db.host,
                user: target_db.user,
                status: 'refused',
                durationMs: null,
                detail: `${e.code}: ${e.message}`,
            });
            logger(line);
            appendAuditLog(line, rootDir);
            return 3;
        }
        logger(`migrate:apply failed: ${e instanceof Error ? e.message : String(e)}`);
        return 1;
    }
}

// CLI entrypoint — only runs when invoked directly.
if (process.argv[1] && process.argv[1].endsWith('apply-migration.ts')) {
    run({ argv: process.argv.slice(2) }).then((code) => process.exit(code));
}
