import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function isAdmin(req: NextRequest) {
    const session = await getServerSession(authOptions);
    return (session?.user as any)?.isAdmin === true;
}

export async function POST(req: NextRequest) {
    if (!await isAdmin(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const pollSecret = process.env.POLL_SECRET;

        if (!pollSecret) {
            throw new Error("POLL_SECRET not configured");
        }

        // Trigger global facilitator health poll
        const healthRes = await fetch(`${appUrl}/api/internal/poll/facilitators`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${pollSecret}`,
                'Content-Type': 'application/json'
            }
        });

        // Trigger global bazaar sync
        const bazaarRes = await fetch(`${appUrl}/api/internal/poll/bazaar`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${pollSecret}`,
                'Content-Type': 'application/json'
            }
        });

        const healthOk = healthRes.ok;
        const bazaarOk = bazaarRes.ok;

        return NextResponse.json({
            ok: healthOk && bazaarOk,
            healthStatus: healthOk ? 'Polling started' : 'Polling failed',
            bazaarStatus: bazaarOk ? 'Sync started' : 'Sync failed'
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
