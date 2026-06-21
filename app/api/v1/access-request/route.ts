import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { z } from 'zod';
import { Notifications } from '@/lib/notifications';
import { getIntentCopy, resolveIntent } from '@/lib/pricing/intent';

const INTENT_MAX_LEN = 80;

const schema = z.object({
    email: z.string().email(),
    company: z.string().optional(),
    role: z.string().optional(),
    rpd: z.string().optional(),
    // 3AY-8R-3: optional pricing intent from /get-access. Sanitized and
    // resolved server-side. Client-supplied plan_id / offer_id are not
    // read here — they are always derived from `resolveIntent`.
    intent: z
        .string()
        .max(INTENT_MAX_LEN)
        .optional(),
});

function sanitizeIntent(raw: unknown): string | null {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (trimmed.length > INTENT_MAX_LEN) return null;
    return trimmed;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const parsed = schema.parse(body);

        const sanitizedIntent = sanitizeIntent(parsed.intent);
        const resolved = resolveIntent(sanitizedIntent);
        const copy = sanitizedIntent !== null ? getIntentCopy(sanitizedIntent) : null;
        const planId = copy?.planId ?? null;
        const offerId = copy?.offerId ?? null;

        await pool.query(
            `INSERT INTO access_requests (
                email, company, role, rpd,
                intent, resolved_intent, plan_id, offer_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                parsed.email,
                parsed.company || null,
                parsed.role || null,
                parsed.rpd || null,
                sanitizedIntent,
                resolved,
                planId,
                offerId,
            ]
        );

        // Async Notification
        Notifications.notifyAccessRequest(parsed).catch(err =>
            console.error("Delayed Notification Error", err)
        );

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        if (e instanceof z.ZodError) {
            return NextResponse.json({ ok: false, error: "Invalid data" }, { status: 400 });
        }
        console.error("Access Request Failed", e);
        return NextResponse.json({ ok: false, error: "Internal Error" }, { status: 500 });
    }
}
