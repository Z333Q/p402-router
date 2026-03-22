/**
 * Credit Service (Phase 4.1)
 * ==========================
 * 1 credit = $0.01 USD. Never expire.
 * Credit balance indexed by human_id_hash (World ID nullifier).
 * Unverified users fall back to tenant_id as account_key.
 *
 * Volume discounts applied at purchase time:
 *   < 10,000 credits   → face value ($0.01/credit)
 *   10,000–99,999      → 5% off ($0.0095/credit)
 *   100,000+           → 10% off ($0.009/credit)
 *
 * Free trial: 500 credits granted to any World ID-verified human on first
 * interaction from any surface. Shared pool across all surfaces.
 */

import db from '@/lib/db';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const CREDITS_PER_USD = 100;          // 1 credit = $0.01
export const FREE_TRIAL_CREDITS = 500;       // $5.00 of free usage

const VOLUME_TIERS = [
    { minCredits: 100_000, discountPct: 10 },
    { minCredits: 10_000,  discountPct: 5  },
    { minCredits: 0,       discountPct: 0  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Account key resolution
// ─────────────────────────────────────────────────────────────────────────────

/** Human-anchored key beats tenant key — one pool per person across all surfaces. */
export function accountKey(humanIdHash: string | null | undefined, tenantId: string | null | undefined): string {
    if (humanIdHash) return `human:${humanIdHash}`;
    if (tenantId) return `tenant:${tenantId}`;
    throw new Error('Either humanIdHash or tenantId is required');
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CreditAccount {
    accountKey: string;
    humanIdHash: string | null;
    tenantId: string | null;
    balance: number;
    lifetimePurchased: number;
    lifetimeSpent: number;
    freeTrialGranted: boolean;
    freeTrialGrantedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreditTransaction {
    id: number;
    accountKey: string;
    type: string;
    amount: number;
    balanceAfter: number;
    usdEquivalent: number | null;
    discountPct: number;
    referenceId: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// DB helpers
// ─────────────────────────────────────────────────────────────────────────────

function toAccount(row: Record<string, unknown>): CreditAccount {
    return {
        accountKey:         row.account_key as string,
        humanIdHash:        row.human_id_hash as string | null,
        tenantId:           row.tenant_id as string | null,
        balance:            row.balance as number,
        lifetimePurchased:  row.lifetime_purchased as number,
        lifetimeSpent:      row.lifetime_spent as number,
        freeTrialGranted:   row.free_trial_granted as boolean,
        freeTrialGrantedAt: row.free_trial_granted_at as string | null,
        createdAt:          row.created_at as string,
        updatedAt:          row.updated_at as string,
    };
}

function toTransaction(row: Record<string, unknown>): CreditTransaction {
    return {
        id:            row.id as number,
        accountKey:    row.account_key as string,
        type:          row.type as string,
        amount:        row.amount as number,
        balanceAfter:  row.balance_after as number,
        usdEquivalent: row.usd_equivalent !== null ? parseFloat(row.usd_equivalent as string) : null,
        discountPct:   parseFloat(row.discount_pct as string ?? '0'),
        referenceId:   row.reference_id as string | null,
        metadata:      row.metadata as Record<string, unknown> | null,
        createdAt:     row.created_at as string,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Core operations
// ─────────────────────────────────────────────────────────────────────────────

/** Get or create credit account. Auto-grants free trial for verified humans. */
export async function getOrCreateAccount(
    humanIdHash: string | null | undefined,
    tenantId: string | null | undefined
): Promise<CreditAccount> {
    const key = accountKey(humanIdHash, tenantId);

    const existing = await db.query(
        'SELECT * FROM credit_accounts WHERE account_key = $1',
        [key]
    );
    if (existing.rows.length > 0) {
        return toAccount(existing.rows[0] as Record<string, unknown>);
    }

    // Create new account
    await db.query(
        `INSERT INTO credit_accounts (account_key, human_id_hash, tenant_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (account_key) DO NOTHING`,
        [key, humanIdHash ?? null, tenantId ?? null]
    );

    const res = await db.query('SELECT * FROM credit_accounts WHERE account_key = $1', [key]);
    const account = toAccount(res.rows[0] as Record<string, unknown>);

    // Auto-grant free trial to new World ID-verified humans
    if (humanIdHash && !account.freeTrialGranted) {
        return grantFreeTrial(account);
    }

    return account;
}

/** Grant 500 free trial credits to a verified human (idempotent). */
export async function grantFreeTrial(account: CreditAccount): Promise<CreditAccount> {
    if (account.freeTrialGranted) return account;
    if (!account.humanIdHash) throw new Error('Free trial requires World ID verification');

    const newBalance = account.balance + FREE_TRIAL_CREDITS;

    await db.query(
        `UPDATE credit_accounts
         SET balance = $2, free_trial_granted = TRUE, free_trial_granted_at = NOW(),
             lifetime_purchased = lifetime_purchased + $3, updated_at = NOW()
         WHERE account_key = $1`,
        [account.accountKey, newBalance, FREE_TRIAL_CREDITS]
    );

    await db.query(
        `INSERT INTO credit_transactions
         (account_key, type, amount, balance_after, usd_equivalent)
         VALUES ($1, 'free_trial', $2, $3, $4)`,
        [account.accountKey, FREE_TRIAL_CREDITS, newBalance, (FREE_TRIAL_CREDITS / CREDITS_PER_USD).toFixed(4)]
    );

    const updated = await db.query('SELECT * FROM credit_accounts WHERE account_key = $1', [account.accountKey]);
    return toAccount(updated.rows[0] as Record<string, unknown>);
}

/** Get credit balance. Returns null if no account exists. */
export async function getBalance(
    humanIdHash: string | null | undefined,
    tenantId: string | null | undefined
): Promise<{ balance: number; freeTrialGranted: boolean } | null> {
    try {
        const key = accountKey(humanIdHash, tenantId);
        const res = await db.query(
            'SELECT balance, free_trial_granted FROM credit_accounts WHERE account_key = $1',
            [key]
        );
        if (res.rows.length === 0) return null;
        const row = res.rows[0] as { balance: number; free_trial_granted: boolean };
        return { balance: row.balance, freeTrialGranted: row.free_trial_granted };
    } catch {
        return null;
    }
}

/** Purchase credits. Returns new balance. Applies volume discount automatically. */
export async function purchaseCredits(
    humanIdHash: string | null | undefined,
    tenantId: string | null | undefined,
    creditsToPurchase: number,
    referenceId?: string
): Promise<{ account: CreditAccount; creditsAdded: number; usdCharged: number; discountPct: number }> {
    if (creditsToPurchase < 1) throw new Error('Must purchase at least 1 credit');

    const tier = VOLUME_TIERS.find(t => creditsToPurchase >= t.minCredits)!;
    const discountPct = tier.discountPct;
    const pricePerCredit = 0.01 * (1 - discountPct / 100);
    const usdCharged = parseFloat((creditsToPurchase * pricePerCredit).toFixed(4));

    const account = await getOrCreateAccount(humanIdHash, tenantId);

    // Additional 5% discount for World ID-verified humans
    const finalDiscount = account.humanIdHash ? Math.min(discountPct + 5, 15) : discountPct;
    const finalUsd = parseFloat((creditsToPurchase * 0.01 * (1 - finalDiscount / 100)).toFixed(4));

    const newBalance = account.balance + creditsToPurchase;

    await db.query(
        `UPDATE credit_accounts
         SET balance = $2,
             lifetime_purchased = lifetime_purchased + $3,
             updated_at = NOW()
         WHERE account_key = $1`,
        [account.accountKey, newBalance, creditsToPurchase]
    );

    await db.query(
        `INSERT INTO credit_transactions
         (account_key, type, amount, balance_after, usd_equivalent, discount_pct, reference_id)
         VALUES ($1, 'purchase', $2, $3, $4, $5, $6)`,
        [account.accountKey, creditsToPurchase, newBalance, finalUsd, finalDiscount, referenceId ?? null]
    );

    const updated = await db.query('SELECT * FROM credit_accounts WHERE account_key = $1', [account.accountKey]);
    return {
        account: toAccount(updated.rows[0] as Record<string, unknown>),
        creditsAdded: creditsToPurchase,
        usdCharged: finalUsd,
        discountPct: finalDiscount,
    };
}

/**
 * Attempt to spend credits for a request. Returns true if credits were deducted.
 * Atomic — uses UPDATE with WHERE balance >= amount to prevent overdraft.
 */
export async function spendCredits(
    humanIdHash: string | null | undefined,
    tenantId: string | null | undefined,
    costUsd: number,
    referenceId?: string
): Promise<{ success: boolean; creditsSpent: number; balanceAfter: number }> {
    const creditsNeeded = Math.ceil(costUsd * CREDITS_PER_USD);
    if (creditsNeeded <= 0) return { success: true, creditsSpent: 0, balanceAfter: 0 };

    try {
        const key = accountKey(humanIdHash, tenantId);

        const res = await db.query(
            `UPDATE credit_accounts
             SET balance = balance - $2,
                 lifetime_spent = lifetime_spent + $2,
                 updated_at = NOW()
             WHERE account_key = $1
               AND balance >= $2
             RETURNING balance`,
            [key, creditsNeeded]
        );

        if (res.rowCount === 0) {
            return { success: false, creditsSpent: 0, balanceAfter: 0 };
        }

        const balanceAfter = (res.rows[0] as { balance: number }).balance;

        await db.query(
            `INSERT INTO credit_transactions
             (account_key, type, amount, balance_after, usd_equivalent, reference_id)
             VALUES ($1, 'spend', $2, $3, $4, $5)`,
            [key, -creditsNeeded, balanceAfter, costUsd.toFixed(4), referenceId ?? null]
        );

        return { success: true, creditsSpent: creditsNeeded, balanceAfter };
    } catch {
        return { success: false, creditsSpent: 0, balanceAfter: 0 };
    }
}

/** Refund credits (e.g. request failed after deduction). Non-blocking. */
export async function refundCredits(
    humanIdHash: string | null | undefined,
    tenantId: string | null | undefined,
    creditsToRefund: number,
    referenceId?: string
): Promise<void> {
    try {
        const key = accountKey(humanIdHash, tenantId);

        const res = await db.query(
            `UPDATE credit_accounts
             SET balance = balance + $2,
                 lifetime_spent = GREATEST(0, lifetime_spent - $2),
                 updated_at = NOW()
             WHERE account_key = $1
             RETURNING balance`,
            [key, creditsToRefund]
        );

        if (res.rowCount && res.rowCount > 0) {
            const balanceAfter = (res.rows[0] as { balance: number }).balance;
            await db.query(
                `INSERT INTO credit_transactions
                 (account_key, type, amount, balance_after, reference_id)
                 VALUES ($1, 'refund', $2, $3, $4)`,
                [key, creditsToRefund, balanceAfter, referenceId ?? null]
            );
        }
    } catch { /* non-blocking */ }
}

/** Transaction history for an account. */
export async function getHistory(
    humanIdHash: string | null | undefined,
    tenantId: string | null | undefined,
    limit = 50
): Promise<CreditTransaction[]> {
    const key = accountKey(humanIdHash, tenantId);
    const res = await db.query(
        `SELECT * FROM credit_transactions
         WHERE account_key = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [key, limit]
    );
    return res.rows.map(r => toTransaction(r as Record<string, unknown>));
}

/** Compute volume discount tier for a given purchase size. */
export function computeDiscount(credits: number, humanVerified = false): { discountPct: number; pricePerCredit: number; totalUsd: number } {
    const tier = VOLUME_TIERS.find(t => credits >= t.minCredits)!;
    const base = tier.discountPct;
    const total = humanVerified ? Math.min(base + 5, 15) : base;
    const pricePerCredit = parseFloat((0.01 * (1 - total / 100)).toFixed(6));
    return { discountPct: total, pricePerCredit, totalUsd: parseFloat((credits * pricePerCredit).toFixed(4)) };
}
