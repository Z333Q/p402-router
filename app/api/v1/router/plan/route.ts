import { NextRequest, NextResponse } from 'next/server'
import { toApiErrorResponse, ApiError } from '@/lib/errors'
import { z } from 'zod'
import { RouterService } from '@/lib/services/router-service'

// Validation Schema (Plan Request)
const PlanSchema = z.object({
    policyId: z.string().optional(),
    routeId: z.string().min(1),
    payment: z.object({
        network: z.string().min(1),
        scheme: z.string().min(1),
        amount: z.string().regex(/^\d*\.?\d+$/),
        asset: z.string().min(2).max(10),
        legacyXPayment: z.boolean().optional()
    }),
    buyer: z.object({
        buyerId: z.string().optional()
    }).optional()
})

export async function POST(req: NextRequest) {
    const requestId = crypto.randomUUID()

    try {
        const body = await req.json()

        // 1. Validate Input (Controller Responsibility)
        const parsed = PlanSchema.safeParse(body)
        if (!parsed.success) {
            throw new ApiError({
                code: 'INVALID_INPUT',
                status: 400,
                message: 'Input validation failed',
                requestId,
                details: parsed.error.flatten()
            })
        }

        // 2. Delegate to Service (Business Logic Responsibility)
        const response = await RouterService.plan(requestId, parsed.data)

        // 3. Return Response (Controller Responsibility)
        return NextResponse.json(response, {
            status: 200,
            headers: { 'x-request-id': requestId }
        })

    } catch (e: any) {
        const mapped = toApiErrorResponse(e, requestId)
        return NextResponse.json(mapped.body, { status: mapped.status, headers: { 'x-request-id': requestId } })
    }
}
