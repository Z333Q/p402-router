import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { z } from 'zod';
import { Notifications } from '@/lib/notifications';

const schema = z.object({
    email: z.string().email(),
    company: z.string().optional(),
    role: z.string().optional(),
    rpd: z.string().optional()
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const parsed = schema.parse(body);

        await pool.query(
            `INSERT INTO access_requests (email, company, role, rpd) VALUES ($1, $2, $3, $4)`,
            [parsed.email, parsed.company || null, parsed.role || null, parsed.rpd || null]
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
