import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pollSecret = process.env.POLL_SECRET || "";
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://${req.headers.get("host")}`;

    try {
        const res = await fetch(`${baseUrl}/api/internal/poll/facilitators`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${pollSecret}`
            },
            body: JSON.stringify({ batchSize: 50 })
        });

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
