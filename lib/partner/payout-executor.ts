/**
 * lib/partner/payout-executor.ts
 * USDC payout execution for partner commissions.
 *
 * Sends standard ERC-20 transfer() from the facilitator wallet to the
 * partner's registered USDC wallet address on Base mainnet.
 *
 * The facilitator wallet must hold sufficient USDC to cover payouts.
 * ETH balance must also be sufficient to cover gas.
 *
 * Env vars:
 *   PARTNER_PAYOUT_WALLET_ADDRESS — override source wallet (default: facilitator)
 *   (relies on existing P402_FACILITATOR_PRIVATE_KEY or CDP_SERVER_WALLET_ENABLED)
 */

import {
    createPublicClient,
    createWalletClient,
    http,
    parseUnits,
    formatUnits,
    type Hash,
} from 'viem'
import { base } from 'viem/chains'
import { P402_CONFIG } from '@/lib/constants'
import { getFacilitatorWallet } from '@/lib/x402/facilitator-wallet'
import db from '@/lib/db'
import { notifyPayoutReleased } from './notifications'

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? 'https://mainnet.base.org'
const USDC_DECIMALS = 6

// Minimal ERC-20 ABI for transfer + balanceOf
const ERC20_ABI = [
    {
        name: 'transfer',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'to',    type: 'address' },
            { name: 'value', type: 'uint256' },
        ],
        outputs: [{ type: 'bool' }],
    },
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ type: 'uint256' }],
    },
] as const

export interface PayoutExecutionResult {
    entryId: string
    partnerId: string
    amount: number
    txHash?: string
    status: 'sent' | 'failed' | 'skipped'
    reason?: string
}

export interface BatchExecutionResult {
    batchId: string
    results: PayoutExecutionResult[]
    totalSent: number
    failureCount: number
}

// ---------------------------------------------------------------------------
// Execute all pending USDC payouts in a batch
// ---------------------------------------------------------------------------

export async function executeUsdcPayouts(batchId: string): Promise<BatchExecutionResult> {
    // Fetch all pending entries in the batch that have a crypto_usdc payout method
    const entriesRes = await db.query(
        `SELECT
             pe.id, pe.partner_id, pe.amount, pe.currency,
             pm.destination_reference AS wallet_address,
             p.display_name AS partner_name,
             t.email AS partner_email
         FROM partner_payout_entries pe
         JOIN partners p ON p.id = pe.partner_id
         JOIN tenants t ON t.id = p.primary_tenant_id
         LEFT JOIN partner_payout_methods pm
             ON pm.partner_id = pe.partner_id
             AND pm.provider = 'crypto_usdc'
             AND pm.is_default = true
         WHERE pe.batch_id = $1
           AND pe.status = 'pending'`,
        [batchId]
    )

    const entries = entriesRes.rows as {
        id: string
        partner_id: string
        amount: string
        currency: string
        wallet_address: string | null
        partner_name: string
        partner_email: string
    }[]

    const facilitator = await getFacilitatorWallet()
    const publicClient = createPublicClient({ chain: base, transport: http(RPC_URL) })

    // Check facilitator USDC balance before we start
    const facilitatorBalance = await publicClient.readContract({
        address: P402_CONFIG.USDC_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [facilitator.address as `0x${string}`],
    })

    const totalRequired = entries
        .filter(e => e.wallet_address)
        .reduce((sum, e) => sum + parseFloat(e.amount), 0)

    const balanceUsd = Number(formatUnits(facilitatorBalance as bigint, USDC_DECIMALS))
    if (balanceUsd < totalRequired) {
        throw new Error(
            `Insufficient USDC balance in facilitator wallet. ` +
            `Have: $${balanceUsd.toFixed(2)}, Need: $${totalRequired.toFixed(2)}`
        )
    }

    const results: PayoutExecutionResult[] = []

    for (const entry of entries) {
        if (!entry.wallet_address) {
            results.push({
                entryId: entry.id,
                partnerId: entry.partner_id,
                amount: parseFloat(entry.amount),
                status: 'skipped',
                reason: 'no_usdc_wallet_configured',
            })
            continue
        }

        // Validate address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(entry.wallet_address)) {
            results.push({
                entryId: entry.id,
                partnerId: entry.partner_id,
                amount: parseFloat(entry.amount),
                status: 'failed',
                reason: 'invalid_wallet_address',
            })
            await markEntryFailed(entry.id, 'invalid_wallet_address')
            continue
        }

        try {
            const amountInUnits = parseUnits(entry.amount, USDC_DECIMALS)

            // Mark as processing before submit
            await db.query(
                `UPDATE partner_payout_entries SET status = 'processing', updated_at = NOW() WHERE id = $1`,
                [entry.id]
            )

            // Execute ERC-20 transfer via facilitator wallet
            const txHash = await executeTransfer(
                facilitator.address,
                entry.wallet_address,
                amountInUnits
            )

            // Mark sent
            await db.query(
                `UPDATE partner_payout_entries
                 SET status = 'sent', provider_transfer_id = $2, sent_at = NOW(), updated_at = NOW()
                 WHERE id = $1`,
                [entry.id, txHash]
            )

            // Mark commission entries as paid
            await db.query(
                `UPDATE partner_commission_entries
                 SET status = 'paid', updated_at = NOW()
                 WHERE payout_batch_id = $1 AND partner_id = $2 AND status = 'in_payout'`,
                [batchId, entry.partner_id]
            )

            // Notify partner
            notifyPayoutReleased({
                partnerEmail: entry.partner_email,
                partnerName: entry.partner_name,
                payoutAmount: parseFloat(entry.amount),
                currency: 'USDC',
                provider: 'USDC on Base',
                providerReference: txHash,
            }).catch(() => {})

            results.push({
                entryId: entry.id,
                partnerId: entry.partner_id,
                amount: parseFloat(entry.amount),
                txHash,
                status: 'sent',
            })
        } catch (err: unknown) {
            const reason = err instanceof Error ? err.message : 'unknown_error'
            await markEntryFailed(entry.id, reason)
            results.push({
                entryId: entry.id,
                partnerId: entry.partner_id,
                amount: parseFloat(entry.amount),
                status: 'failed',
                reason,
            })
        }
    }

    const totalSent = results
        .filter(r => r.status === 'sent')
        .reduce((s, r) => s + r.amount, 0)

    const failureCount = results.filter(r => r.status === 'failed').length

    // Update batch status
    const allDone = results.every(r => r.status === 'sent' || r.status === 'skipped')
    const anyFailed = failureCount > 0

    await db.query(
        `UPDATE partner_payout_batches
         SET status = $2, updated_at = NOW()
         WHERE id = $1`,
        [batchId, allDone && !anyFailed ? 'completed' : anyFailed ? 'failed' : 'processing']
    )

    return { batchId, results, totalSent, failureCount }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function executeTransfer(
    fromAddress: string,
    toAddress: string,
    amountInUnits: bigint
): Promise<Hash> {
    const facilitator = await getFacilitatorWallet()
    const publicClient = createPublicClient({ chain: base, transport: http(RPC_URL) })

    // Dynamically import viem account utilities to avoid top-level import issues
    const { privateKeyToAccount } = await import('viem/accounts')
    const pk = process.env.P402_FACILITATOR_PRIVATE_KEY
    if (!pk) throw new Error('P402_FACILITATOR_PRIVATE_KEY not set')

    const account = privateKeyToAccount(pk as `0x${string}`)
    const walletClient = createWalletClient({ account, chain: base, transport: http(RPC_URL) })

    const { request } = await publicClient.simulateContract({
        account,
        address: P402_CONFIG.USDC_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [toAddress as `0x${string}`, amountInUnits],
    })

    return walletClient.writeContract(request)
}

async function markEntryFailed(entryId: string, reason: string) {
    await db.query(
        `UPDATE partner_payout_entries
         SET status = 'failed', failure_reason = $2, updated_at = NOW()
         WHERE id = $1`,
        [entryId, reason]
    )
}

// ---------------------------------------------------------------------------
// Balance check helper (admin health endpoint)
// ---------------------------------------------------------------------------

export async function getPayoutWalletBalance(): Promise<{
    address: string
    usdcBalance: string
    ethBalance: string
}> {
    const facilitator = await getFacilitatorWallet()
    const publicClient = createPublicClient({ chain: base, transport: http(RPC_URL) })

    const [usdcRaw, ethRaw] = await Promise.all([
        publicClient.readContract({
            address: P402_CONFIG.USDC_ADDRESS as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [facilitator.address as `0x${string}`],
        }),
        publicClient.getBalance({ address: facilitator.address as `0x${string}` }),
    ])

    return {
        address: facilitator.address,
        usdcBalance: formatUnits(usdcRaw as bigint, USDC_DECIMALS),
        ethBalance: formatUnits(ethRaw, 18),
    }
}
