import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const isAdmin = (session?.user as any)?.isAdmin;

    if (!session || !isAdmin) {
        return NextResponse.json({ error: "Forbidden: Admin Access Required" }, { status: 403 });
    }

    const pollSecret = process.env.POLL_SECRET || "";
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://${req.headers.get("host")}`;

    try {
        const res = await fetch(`${baseUrl}/api/internal/poll/bazaar`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${pollSecret}`
            }
        });

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
