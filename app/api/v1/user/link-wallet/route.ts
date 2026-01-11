import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from '@/lib/db';
import { z } from 'zod';

const schema = z.object({
    walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address")
});

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const parsed = schema.parse(body);

        // Update the owner_wallet for the tenant associated with this email
        const result = await pool.query(
            "UPDATE tenants SET owner_wallet = $1 WHERE owner_email = $2 RETURNING id",
            [parsed.walletAddress, session.user.email]
        );

        if (result.rowCount === 0) {
            return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
        }

        console.log(`Linked wallet ${parsed.walletAddress} to user ${session.user.email}`);
        return NextResponse.json({ ok: true, tenantId: result.rows[0].id });
    } catch (e: any) {
        if (e instanceof z.ZodError) {
            return NextResponse.json({ error: e.issues[0]?.message || "Invalid input" }, { status: 400 });
        }
        console.error("Link Wallet Error", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
