import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { SettlementService } from '@/lib/services/settlement-service'
import { toApiErrorResponse, ApiError } from '@/lib/errors'

// Validation Schemas
const SettleSchema = z.object({
    tenantId: z.string().uuid().optional(),
    decisionId: z.string().optional(),
    txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid transaction hash format"),
    amount: z.string().regex(/^\d*\.?\d+$/, "Invalid amount format"),
    asset: z.string().min(2).max(10) // e.g. USDC, USDT
})

export async function POST(req: NextRequest) {
    const requestId = crypto.randomUUID()

    try {
        const rawBody = await req.json()

        // 1. Input Validation
        const result = SettleSchema.safeParse(rawBody)
        if (!result.success) {
            throw new ApiError({
                code: 'INVALID_INPUT',
                status: 400,
                message: 'Input validation failed',
                requestId,
                details: result.error.format()
            })
        }

        // 2. Delegate to Service
        const response = await SettlementService.settle(requestId, result.data)

        return NextResponse.json(response)

    } catch (e: any) {
        return toApiErrorResponse(e, requestId)
    }
}
