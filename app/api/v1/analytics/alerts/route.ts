import { NextRequest, NextResponse } from 'next/server'
import { toApiErrorResponse } from '@/lib/errors'
import { AnomalyDetection } from '@/lib/intelligence/anomaly-detection'
import { OptimizationEngine } from '@/lib/intelligence/optimization'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    const tenantId = (session?.user as any)?.tenantId

    if (!tenantId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requestId = crypto.randomUUID()

    try {
        const [anomalies, optimizations] = await Promise.all([
            AnomalyDetection.getAnomaliesForTenant(tenantId),
            OptimizationEngine.getRecommendationsForTenant(tenantId)
        ]);

        const alerts = [
            ...anomalies.map((a: any) => ({
                id: `anomaly-${Date.now()}-${Math.random()}`,
                type: 'optimization', // UI category
                title: 'Spend Anomaly Detected',
                message: a.message,
                severity: a.severity,
                action: 'Review Ledger'
            })),
            ...optimizations.map((o: any, i: number) => ({
                id: `opt-${Date.now()}-${i}`,
                type: 'optimization',
                title: 'Cost Optimization',
                message: o.message,
                severity: 'medium',
                action: 'Apply Policy'
            }))
        ];

        // Fallback mock if nothing found to keep UI alive
        if (alerts.length === 0) {
            alerts.push({
                id: '1',
                type: 'optimization',
                title: 'Default Optimization',
                message: 'Route "translation-api" could save $0.12/call by switching to local-llama-3.',
                severity: 'medium',
                action: 'Optimize'
            });
        }

        return NextResponse.json({ alerts }, { status: 200 })
    } catch (e: any) {
        const mapped = toApiErrorResponse(e, requestId)
        return NextResponse.json(mapped.body, { status: mapped.status })
    }
}
