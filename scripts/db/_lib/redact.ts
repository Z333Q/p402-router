/**
 * Redact the password segment from a Postgres connection URL so the
 * runner can log {db, host} without ever surfacing credentials.
 *
 * Pure. No I/O. Always returns a string; on parse failure returns a
 * generic placeholder rather than echoing the raw input.
 */

export interface RedactedTarget {
    db: string;
    host: string;
    user: string;
    redactedUrl: string;
}

export function redactPostgresUrl(raw: string | undefined): RedactedTarget {
    const fallback: RedactedTarget = {
        db: 'unknown',
        host: 'unknown',
        user: 'unknown',
        redactedUrl: 'postgresql://***REDACTED***',
    };
    if (!raw || typeof raw !== 'string') return fallback;
    try {
        const u = new URL(raw);
        const db = (u.pathname || '/').replace(/^\//, '') || 'unknown';
        const host = u.hostname || 'unknown';
        const user = u.username || 'unknown';
        // Reconstruct without the password, preserving the rest of the URL
        // so the log line is still useful for forensic purposes.
        const safe = new URL(raw);
        if (safe.password) safe.password = '***REDACTED***';
        return { db, host, user, redactedUrl: safe.toString() };
    } catch {
        return fallback;
    }
}
