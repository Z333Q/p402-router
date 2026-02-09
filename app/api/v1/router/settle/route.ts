import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { SettlementService } from '@/lib/services/settlement-service'
import { toApiErrorResponse, ApiError } from '@/lib/errors'
import type { EIP3009Authorization } from '@/lib/x402/eip3009'

// Payment Scheme Schemas
const OnchainPaymentSchema = z.object({
    scheme: z.literal('onchain'),
    txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid transaction hash format")
});

const ExactPaymentSchema = z.object({
    scheme: z.literal('exact'),
    authorization: z.object({
        from: z.string().regex(/^0x[a-fA-F0-9]{40}$/i, "Invalid from address"),
        to: z.string().regex(/^0x[a-fA-F0-9]{40}$/i, "Invalid to address"),
        value: z.union([z.string(), z.number()]).transform(String),
        validAfter: z.union([z.string(), z.number()]).transform(Number),
        validBefore: z.union([z.string(), z.number()]).transform(Number),
        nonce: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid nonce format"),
        v: z.number(),
        r: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid r format"),
        s: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid s format")
    })
});

const ReceiptPaymentSchema = z.object({
    scheme: z.literal('receipt'),
    receiptId: z.string()
});

// Unified Settlement Schema
const SettleSchema = z.object({
    tenantId: z.string().uuid().optional(),
    decisionId: z.string().optional(),
    amount: z.string().regex(/^\d*\.?\d+$/, "Invalid amount format"),
    asset: z.string().min(2).max(10).default('USDC'),
    payment: z.discriminatedUnion('scheme', [
        OnchainPaymentSchema,
        ExactPaymentSchema,
        ReceiptPaymentSchema
    ])
});

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

        const { tenantId, decisionId, amount, asset, payment } = result.data;

        // 2. Route to appropriate settlement method based on scheme
        let response;

        switch (payment.scheme) {
            case 'exact':
                // EIP-3009 gasless payment
                response = await SettlementService.settle(requestId, {
                    tenantId,
                    decisionId,
                    amount,
                    asset,
                    authorization: payment.authorization as unknown as EIP3009Authorization
                });
                break;

            case 'onchain':
                // Traditional on-chain transaction verification
                response = await SettlementService.settle(requestId, {
                    tenantId,
                    decisionId,
                    txHash: payment.txHash,
                    amount,
                    asset
                });
                break;

            case 'receipt':
                // Receipt-based settlement (reuse prior payment)
                response = await SettlementService.settleWithReceipt(requestId, {
                    tenantId,
                    decisionId,
                    receiptId: payment.receiptId,
                    amount,
                    asset
                });
                break;

            default:
                throw new ApiError({
                    code: 'UNSUPPORTED_FEATURE',
                    status: 400,
                    message: `Payment scheme '${(payment as any).scheme}' is not supported`,
                    requestId
                });
        }

        return NextResponse.json({
            scheme: payment.scheme,
            ...response
        });

    } catch (e: any) {
        return toApiErrorResponse(e, requestId)
    }
}
