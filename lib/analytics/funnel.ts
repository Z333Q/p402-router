/**
 * 3AZ-2-A funnel telemetry — server emit helper.
 *
 * Records typed onboarding/conversion funnel events to the
 * funnel_events table (migration v2_060). First-party only; no
 * third-party analytics SDK is invoked.
 *
 * Privacy contract (enforced here, asserted by source-shape tests):
 *   - No prompts, responses, messages, completions, request bodies,
 *     response bodies, file contents, transcripts.
 *   - No email, password, token, api_key.
 *   - No raw IP or raw user-agent. ip_class records only address
 *     family; user_agent_hash stores a salted SHA-256.
 *
 * Resilience contract:
 *   - recordFunnelEvent never throws to the caller. Analytics must
 *     not block a route. DB failures are warn-logged and swallowed.
 *
 * Vocabulary contract:
 *   - The FUNNEL_EVENTS array is the canonical list of allowed event
 *     names. The client emit endpoint rejects anything not in this
 *     list. Adding an event = adding a string to this array.
 */

import crypto from 'node:crypto';
import db from '@/lib/db';

export const FUNNEL_EVENTS = [
    'funnel.login_view',
    'funnel.signin_started',
    'funnel.signin_success',
    'funnel.onboarding_view',
    'funnel.role_selected',
    'funnel.api_key_issued',
    'funnel.onboarding_completed',
    'funnel.dashboard_view',
    'funnel.dashboard_meaningful',
    'funnel.error',
] as const;

export type FunnelEventName = typeof FUNNEL_EVENTS[number];

const FUNNEL_EVENT_SET: ReadonlySet<string> = new Set(FUNNEL_EVENTS);

/**
 * Property keys that are stripped before write. The scan is on key
 * names only; we never inspect values. This is a coarse forbidden-key
 * deny-list, not a content classifier.
 */
const FORBIDDEN_PROPERTY_KEYS: ReadonlySet<string> = new Set([
    'prompt', 'prompts',
    'response', 'responses',
    'completion', 'completions', 'completion_text',
    'messages', 'message_content',
    'content', 'text',
    'file', 'files', 'document', 'documents',
    'chat', 'chat_history', 'transcript',
    'raw_trace', 'stored_content',
    'request_body', 'response_body',
    'email', 'password', 'token', 'api_key', 'apikey',
    'ip', 'ip_address', 'remote_addr', 'user_agent',
]);

const UA_HASH_SALT = process.env.FUNNEL_UA_SALT ?? 'p402-funnel-v1';
const MAX_PROPERTY_KEYS = 32;
const MAX_PROPERTY_VALUE_LEN = 200;
const MAX_EVENT_NAME_LEN = 64;

export interface RecordFunnelEventInput {
    eventName: FunnelEventName | string;
    tenantId?: string | null;
    anonymousId?: string | null;
    sessionId?: string | null;
    properties?: Record<string, unknown>;
    userAgent?: string | null;
    ipClass?: 'ipv4' | 'ipv6' | null;
}

export function isFunnelEventName(value: unknown): value is FunnelEventName {
    return typeof value === 'string' && FUNNEL_EVENT_SET.has(value);
}

/**
 * Strip forbidden keys, drop nested objects/arrays, cap key count and
 * value length. Returns a flat scalar-only properties object that is
 * safe to JSON-encode into JSONB.
 */
export function sanitizeProperties(input: unknown): Record<string, unknown> {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
    const obj = input as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    let count = 0;
    for (const key of Object.keys(obj)) {
        if (count >= MAX_PROPERTY_KEYS) break;
        if (FORBIDDEN_PROPERTY_KEYS.has(key.toLowerCase())) continue;
        const raw = obj[key];
        if (raw === null || raw === undefined) continue;
        if (typeof raw === 'string') {
            if (raw.length > MAX_PROPERTY_VALUE_LEN) continue;
            out[key] = raw;
        } else if (typeof raw === 'number' || typeof raw === 'boolean') {
            out[key] = raw;
        } else {
            // Skip nested objects/arrays. This is deliberate: the funnel
            // schema is flat-by-design to keep query paths predictable
            // and to prevent accidental nested-PII smuggling.
            continue;
        }
        count++;
    }
    return out;
}

/**
 * Returns a salted SHA-256 of the user-agent string, truncated to 32
 * hex chars. Returns null for missing/empty input.
 */
export function hashUserAgent(ua: string | null | undefined): string | null {
    if (typeof ua !== 'string' || ua.length === 0) return null;
    return crypto
        .createHash('sha256')
        .update(UA_HASH_SALT)
        .update(ua)
        .digest('hex')
        .slice(0, 32);
}

/**
 * Fire-and-forget event emit. Never throws. Returns a Promise that
 * resolves once the DB write completes or fails; callers can await
 * for testing, but production callers should not block on it.
 */
export async function recordFunnelEvent(input: RecordFunnelEventInput): Promise<void> {
    try {
        const rawName = typeof input.eventName === 'string' ? input.eventName : '';
        const eventName = rawName.slice(0, MAX_EVENT_NAME_LEN);
        if (eventName.length === 0) return;

        const properties = sanitizeProperties(input.properties);
        const userAgentHash = hashUserAgent(input.userAgent);
        const ipClass =
            input.ipClass === 'ipv4' || input.ipClass === 'ipv6' ? input.ipClass : null;

        await db.query(
            `INSERT INTO funnel_events (
                tenant_id, anonymous_id, session_id, event_name, properties,
                user_agent_hash, ip_class
            ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)`,
            [
                input.tenantId ?? null,
                input.anonymousId ?? null,
                input.sessionId ?? null,
                eventName,
                JSON.stringify(properties),
                userAgentHash,
                ipClass,
            ]
        );
    } catch (err) {
        // Analytics must never block a route. Warn-log and swallow.
        console.warn(
            '[funnel] emit failed (non-blocking):',
            err instanceof Error ? err.message : String(err)
        );
    }
}
