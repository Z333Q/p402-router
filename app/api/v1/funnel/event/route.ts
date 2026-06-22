/**
 * 3AZ-2-A client funnel emit endpoint.
 *
 * Accepts a POST from the browser with a typed funnel event name and
 * sanitized properties. Forwards to `recordFunnelEvent` in
 * `lib/analytics/funnel.ts`, which strips forbidden keys, hashes the
 * user-agent, and classifies the IP address family before writing to
 * `funnel_events`.
 *
 * The route never blocks the caller: DB failures inside
 * `recordFunnelEvent` are swallowed; this handler returns `200 ok`
 * regardless. The only failure modes that produce 4xx are malformed
 * bodies and unknown event names, which represent client bugs and
 * deserve loud signals.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isFunnelEventName, recordFunnelEvent } from '@/lib/analytics/funnel';

export const dynamic = 'force-dynamic';

const schema = z.object({
    eventName: z.string().min(1).max(64),
    anonymousId: z.string().min(1).max(64).optional(),
    sessionId: z.string().min(1).max(128).optional(),
    properties: z.record(z.string(), z.unknown()).optional(),
});

function classifyIp(req: Request): 'ipv4' | 'ipv6' | null {
    const fwd = req.headers.get('x-forwarded-for') ?? '';
    const candidate = fwd.split(',')[0]?.trim() ?? '';
    if (!candidate) return null;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(candidate)) return 'ipv4';
    if (candidate.includes(':')) return 'ipv6';
    return null;
}

export async function POST(req: Request) {
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ ok: false, error: 'Invalid data' }, { status: 400 });
    }
    if (!isFunnelEventName(parsed.data.eventName)) {
        return NextResponse.json({ ok: false, error: 'Unknown event' }, { status: 400 });
    }

    const ua = req.headers.get('user-agent');
    const ipClass = classifyIp(req);

    await recordFunnelEvent({
        eventName: parsed.data.eventName,
        anonymousId: parsed.data.anonymousId ?? null,
        sessionId: parsed.data.sessionId ?? null,
        properties: parsed.data.properties,
        userAgent: ua,
        ipClass,
    });

    return NextResponse.json({ ok: true });
}
