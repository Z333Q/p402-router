/**
 * Escrow Service
 * ==============
 * Off-chain state management for P402Escrow.sol.
 * This service mirrors contract state in PostgreSQL for API queries and
 * triggers on-chain transactions via viem when state transitions occur.
 *
 * Phase 3.1 — V1: admin dispute resolution, all-or-nothing, USDC on Base only.
 */

import db from '@/lib/db';
import { createPublicClient, createWalletClient, http, parseAbi, type Hex } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const ESCROW_CONTRACT_ADDRESS = (
    process.env.P402_ESCROW_ADDRESS ?? ''
) as Hex;

export const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Hex;

const ESCROW_ABI = parseAbi([
    'function create(string referenceId, address provider, address token, uint256 netAmount) external returns (bytes32)',
    'function fund(bytes32 id) external',
    'function accept(bytes32 id) external',
    'function startWork(bytes32 id) external',
    'function deliver(bytes32 id, bytes32 proofHash) external',
    'function release(bytes32 id) external',
    'function dispute(bytes32 id) external',
    'function resolve(bytes32 id, bool toProvider) external',
    'function cancel(bytes32 id) external',
    // View functions (getEscrow, isDisputable, isReleasable) omitted — state is read from
    // PostgreSQL via getEscrow() JS function; abitype@1.2.3 doesn't support tuples in returns.
]);

const FEE_BASIS_POINTS = 100; // 1%

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type EscrowState =
    | 'CREATED' | 'FUNDED' | 'ACCEPTED' | 'IN_PROGRESS'
    | 'DELIVERED' | 'SETTLED' | 'DISPUTED' | 'RESOLVED'
    | 'EXPIRED' | 'CANCELLED';

export interface EscrowRecord {
    id: string;
    referenceId: string;
    payer: string;
    provider: string;
    payerHumanId: string | null;
    providerHumanId: string | null;
    token: string;
    grossAmount: number;
    netAmount: number;
    feeAmount: number;
    state: EscrowState;
    proofHash: string | null;
    txCreate: string | null;
    txFund: string | null;
    txSettle: string | null;
    disputeWindowSec: number;
    createdAt: string;
    fundedAt: string | null;
    acceptedAt: string | null;
    deliveredAt: string | null;
    settledAt: string | null;
    disputedAt: string | null;
    resolvedAt: string | null;
    expiresAt: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Viem clients (lazy — only used when contract interaction needed)
// ─────────────────────────────────────────────────────────────────────────────

function getPublicClient() {
    return createPublicClient({
        chain: base,
        transport: http(process.env.BASE_RPC_URL ?? 'https://mainnet.base.org'),
    });
}

function getWalletClient() {
    const pk = process.env.P402_FACILITATOR_PRIVATE_KEY as Hex | undefined;
    if (!pk) throw new Error('P402_FACILITATOR_PRIVATE_KEY not set');
    const account = privateKeyToAccount(pk);
    return {
        client: createWalletClient({
            account,
            chain: base,
            transport: http(process.env.BASE_RPC_URL ?? 'https://mainnet.base.org'),
        }),
        account,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// DB helpers
// ─────────────────────────────────────────────────────────────────────────────

function rowToRecord(row: Record<string, unknown>): EscrowRecord {
    return {
        id: row.id as string,
        referenceId: row.reference_id as string,
        payer: row.payer as string,
        provider: row.provider as string,
        payerHumanId: row.payer_human_id as string | null,
        providerHumanId: row.provider_human_id as string | null,
        token: row.token as string,
        grossAmount: parseFloat(row.gross_amount as string),
        netAmount: parseFloat(row.net_amount as string),
        feeAmount: parseFloat(row.fee_amount as string),
        state: row.state as EscrowState,
        proofHash: row.proof_hash as string | null,
        txCreate: row.tx_create as string | null,
        txFund: row.tx_fund as string | null,
        txSettle: row.tx_settle as string | null,
        disputeWindowSec: row.dispute_window_sec as number,
        createdAt: row.created_at as string,
        fundedAt: row.funded_at as string | null,
        acceptedAt: row.accepted_at as string | null,
        deliveredAt: row.delivered_at as string | null,
        settledAt: row.settled_at as string | null,
        disputedAt: row.disputed_at as string | null,
        resolvedAt: row.resolved_at as string | null,
        expiresAt: row.expires_at as string | null,
    };
}

async function logEvent(
    escrowId: string,
    fromState: EscrowState,
    toState: EscrowState,
    actor?: string,
    txHash?: string,
    metadata?: Record<string, unknown>
) {
    await db.query(
        `INSERT INTO escrow_events (escrow_id, from_state, to_state, actor, tx_hash, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [escrowId, fromState, toState, actor ?? null, txHash ?? null, metadata ? JSON.stringify(metadata) : null]
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create an escrow record in DB. On-chain creation is separate (caller must
 * have the payer's wallet to sign the transaction). For V1 the facilitator
 * creates on-chain on the payer's behalf via EIP-3009 pre-authorisation.
 */
export async function createEscrow(params: {
    referenceId: string;
    payer: string;
    provider: string;
    netAmountUsd: number;
    payerHumanId?: string;
    providerHumanId?: string;
}): Promise<EscrowRecord> {
    const { referenceId, payer, provider, netAmountUsd, payerHumanId, providerHumanId } = params;

    const feeUsd = (netAmountUsd * FEE_BASIS_POINTS) / 10000;
    const grossUsd = netAmountUsd + feeUsd;

    // Generate a deterministic ID from the reference (mirrors contract logic)
    const id = `escrow_${Buffer.from(referenceId).toString('hex').slice(0, 32)}`;

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await db.query(
        `INSERT INTO escrows (
            id, reference_id, payer, provider, payer_human_id, provider_human_id,
            token, gross_amount, net_amount, fee_amount, state, expires_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'CREATED',$11)`,
        [id, referenceId, payer, provider, payerHumanId ?? null, providerHumanId ?? null,
         USDC_ADDRESS, grossUsd.toFixed(6), netAmountUsd.toFixed(6), feeUsd.toFixed(6), expiresAt]
    );

    await logEvent(id, 'CREATED', 'CREATED', payer);

    const res = await db.query('SELECT * FROM escrows WHERE id = $1', [id]);
    return rowToRecord(res.rows[0] as Record<string, unknown>);
}

export async function getEscrow(id: string): Promise<EscrowRecord | null> {
    const res = await db.query('SELECT * FROM escrows WHERE id = $1', [id]);
    const row = res.rows[0] as Record<string, unknown> | undefined;
    return row ? rowToRecord(row) : null;
}

export async function getEscrowByReference(referenceId: string): Promise<EscrowRecord | null> {
    const res = await db.query('SELECT * FROM escrows WHERE reference_id = $1', [referenceId]);
    const row = res.rows[0] as Record<string, unknown> | undefined;
    return row ? rowToRecord(row) : null;
}

export async function listEscrows(filter: {
    address?: string;
    state?: EscrowState;
    limit?: number;
}): Promise<EscrowRecord[]> {
    const { address, state, limit = 50 } = filter;

    let query = 'SELECT * FROM escrows WHERE 1=1';
    const params: unknown[] = [];

    if (address) {
        params.push(address);
        query += ` AND (payer = $${params.length} OR provider = $${params.length})`;
    }
    if (state) {
        params.push(state);
        query += ` AND state = $${params.length}`;
    }
    params.push(limit);
    query += ` ORDER BY created_at DESC LIMIT $${params.length}`;

    const res = await db.query(query, params);
    return res.rows.map(r => rowToRecord(r as Record<string, unknown>));
}

/** Transition to FUNDED — called after USDC transfer confirmed */
export async function markFunded(id: string, txHash: string): Promise<EscrowRecord> {
    const esc = await getEscrow(id);
    if (!esc || esc.state !== 'CREATED') throw new Error(`Escrow ${id} not in CREATED state`);

    await db.query(
        `UPDATE escrows SET state='FUNDED', funded_at=NOW(), tx_fund=$2 WHERE id=$1`,
        [id, txHash]
    );
    await logEvent(id, 'CREATED', 'FUNDED', esc.payer, txHash);

    return (await getEscrow(id))!;
}

/** Provider accepts the task */
export async function markAccepted(id: string, actor: string): Promise<EscrowRecord> {
    const esc = await getEscrow(id);
    if (!esc || esc.state !== 'FUNDED') throw new Error(`Escrow ${id} not in FUNDED state`);
    if (actor.toLowerCase() !== esc.provider.toLowerCase()) throw new Error('Only provider can accept');

    await db.query(
        `UPDATE escrows SET state='ACCEPTED', accepted_at=NOW() WHERE id=$1`,
        [id]
    );
    await logEvent(id, 'FUNDED', 'ACCEPTED', actor);

    return (await getEscrow(id))!;
}

/** Either party marks work as in progress */
export async function markInProgress(id: string, actor: string): Promise<EscrowRecord> {
    const esc = await getEscrow(id);
    if (!esc || esc.state !== 'ACCEPTED') throw new Error(`Escrow ${id} not in ACCEPTED state`);

    await db.query(
        `UPDATE escrows SET state='IN_PROGRESS' WHERE id=$1`,
        [id]
    );
    await logEvent(id, 'ACCEPTED', 'IN_PROGRESS', actor);

    return (await getEscrow(id))!;
}

/** Provider submits delivery proof */
export async function markDelivered(id: string, actor: string, proofHash: string): Promise<EscrowRecord> {
    const esc = await getEscrow(id);
    if (!esc || (esc.state !== 'ACCEPTED' && esc.state !== 'IN_PROGRESS')) {
        throw new Error(`Escrow ${id} not in deliverable state`);
    }
    if (actor.toLowerCase() !== esc.provider.toLowerCase()) throw new Error('Only provider can deliver');

    await db.query(
        `UPDATE escrows SET state='DELIVERED', delivered_at=NOW(), proof_hash=$2 WHERE id=$1`,
        [id, proofHash]
    );
    await logEvent(id, esc.state, 'DELIVERED', actor, undefined, { proof_hash: proofHash });

    return (await getEscrow(id))!;
}

/** Payer releases funds (or auto-released after 48h) */
export async function markSettled(id: string, actor: string, txHash?: string): Promise<EscrowRecord> {
    const esc = await getEscrow(id);
    if (!esc || esc.state !== 'DELIVERED') throw new Error(`Escrow ${id} not in DELIVERED state`);

    const windowMs = esc.disputeWindowSec * 1000;
    const deliveredAt = esc.deliveredAt ? new Date(esc.deliveredAt).getTime() : 0;
    const windowElapsed = Date.now() > deliveredAt + windowMs;

    const isPayerReleasing = actor.toLowerCase() === esc.payer.toLowerCase();
    if (!isPayerReleasing && !windowElapsed) {
        throw new Error('Dispute window not elapsed');
    }

    await db.query(
        `UPDATE escrows SET state='SETTLED', settled_at=NOW(), tx_settle=$2 WHERE id=$1`,
        [id, txHash ?? null]
    );
    await logEvent(id, 'DELIVERED', 'SETTLED', actor, txHash);

    // Update reputation: both parties' session_score
    Promise.resolve().then(async () => {
        try {
            const { recordSession } = await import('@/lib/identity/reputation');
            if (esc.payerHumanId) await recordSession(esc.payerHumanId, true);
            if (esc.providerHumanId) await recordSession(esc.providerHumanId, true);
        } catch { /* non-blocking */ }
    });

    return (await getEscrow(id))!;
}

/** Payer raises a dispute */
export async function markDisputed(id: string, actor: string): Promise<EscrowRecord> {
    const esc = await getEscrow(id);
    if (!esc || esc.state !== 'DELIVERED') throw new Error(`Escrow ${id} not in DELIVERED state`);
    if (actor.toLowerCase() !== esc.payer.toLowerCase()) throw new Error('Only payer can dispute');

    const windowMs = esc.disputeWindowSec * 1000;
    const deliveredAt = esc.deliveredAt ? new Date(esc.deliveredAt).getTime() : 0;
    if (Date.now() > deliveredAt + windowMs) throw new Error('Dispute window elapsed');

    await db.query(
        `UPDATE escrows SET state='DISPUTED', disputed_at=NOW() WHERE id=$1`,
        [id]
    );
    await logEvent(id, 'DELIVERED', 'DISPUTED', actor);

    return (await getEscrow(id))!;
}

/** Admin resolves dispute */
export async function markResolved(id: string, toProvider: boolean): Promise<EscrowRecord> {
    const esc = await getEscrow(id);
    if (!esc || esc.state !== 'DISPUTED') throw new Error(`Escrow ${id} not in DISPUTED state`);

    const newState = toProvider ? 'SETTLED' : 'RESOLVED';

    await db.query(
        `UPDATE escrows SET state=$2, resolved_at=NOW(), ${toProvider ? 'settled_at=NOW()' : 'settled_at=NULL'} WHERE id=$1`,
        [id, newState]
    );
    await logEvent(id, 'DISPUTED', newState as EscrowState, undefined, undefined, { to_provider: toProvider });

    // Reputation impact: losing party's dispute_score decremented
    Promise.resolve().then(async () => {
        try {
            const { recordDispute } = await import('@/lib/identity/reputation');
            if (!toProvider && esc.providerHumanId) await recordDispute(esc.providerHumanId);
            if (toProvider && esc.payerHumanId) await recordDispute(esc.payerHumanId);
        } catch { /* non-blocking */ }
    });

    return (await getEscrow(id))!;
}

/**
 * System-initiated release after successful AI task completion.
 * Advances FUNDED | ACCEPTED | IN_PROGRESS → DELIVERED → SETTLED in one call.
 * No dispute window enforcement — the AI response IS the delivery proof.
 * Returns null if no escrow exists for the referenceId (not all tasks have escrow).
 */
export async function autoReleaseEscrow(
    referenceId: string,
    proofHash: string,
    actor = 'system'
): Promise<EscrowRecord | null> {
    const esc = await getEscrowByReference(referenceId);
    if (!esc) return null;

    // Already in a terminal or disputed state — nothing to do
    if (['SETTLED', 'CANCELLED', 'RESOLVED', 'EXPIRED'].includes(esc.state)) return esc;

    const fromState = esc.state;

    // Advance to DELIVERED if not already there
    if (esc.state !== 'DELIVERED') {
        const deliverableStates: EscrowState[] = ['FUNDED', 'ACCEPTED', 'IN_PROGRESS'];
        if (!deliverableStates.includes(esc.state)) {
            // CREATED without funding — can't release yet
            return esc;
        }
        await db.query(
            `UPDATE escrows SET state='DELIVERED', delivered_at=NOW(), proof_hash=$2 WHERE id=$1`,
            [esc.id, proofHash]
        );
        await logEvent(esc.id, fromState, 'DELIVERED', actor, undefined, { proof_hash: proofHash, auto: true });
    }

    // Settle (bypass dispute window for automated flows)
    await db.query(
        `UPDATE escrows SET state='SETTLED', settled_at=NOW() WHERE id=$1`,
        [esc.id]
    );
    await logEvent(esc.id, 'DELIVERED', 'SETTLED', actor, undefined, { auto: true });

    return (await getEscrow(esc.id))!;
}

export async function getEscrowEvents(escrowId: string) {
    const res = await db.query(
        'SELECT * FROM escrow_events WHERE escrow_id = $1 ORDER BY created_at ASC',
        [escrowId]
    );
    return res.rows;
}
