import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ policyId: string }> }) {
    const { policyId } = await params
    // fetch from DB
    return NextResponse.json({
        policyId,
        name: 'Mock Policy',
        schemaVersion: '1.0.0',
        updatedAt: new Date().toISOString(),
        rules: { routeScopes: [], budgets: [], rpmLimits: [], denyIf: {} }
    })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ policyId: string }> }) {
    const { policyId } = await params
    const body = await req.json()
    return NextResponse.json({ ...body, updatedAt: new Date().toISOString() })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ policyId: string }> }) {
    const { policyId } = await params
    return new NextResponse(null, { status: 204 })
}
