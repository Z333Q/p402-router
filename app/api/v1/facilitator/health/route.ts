import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    return NextResponse.json({
        status: "healthy",
        version: "1.0.0",
        service: "P402 Local Facilitator",
        timestamp: new Date().toISOString()
    });
}
