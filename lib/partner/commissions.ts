/**
 * lib/partner/commissions.ts
 * Commission calculation engine for the P402 Partner Program.
 *
 * Entry point: generateCommission(tenantId, sourceEventType, sourceEventId, invoiceAmountUsd, plan)
 *
 * Flow:
 *   1. Find active attribution for the tenant
 *   2. Find partner's group assignment
 *   3. Find the best matching offer (group + plan + event)
 *   4. Find active commission rule for that offer
 *   5. Check month_number against max_months
 *   6. Calculate commission amount
 *   7. Write idempotent ledger entry (ON CONFLICT DO NOTHING)
 *   8. Log review event if needed
 */

import db from '@/lib/db'
import { notifyCommissionCreated } from './notifications'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CommissionContext {
    tenantId: string
    sourceEventType: string  // e.g. 'checkout.session.completed', 'invoice.payment_succeeded'
    sourceEventId: string    // Stripe invoice.id or checkout session.id — used for idempotency
    invoiceAmountUsd: number // Net invoice amount (after Stripe fees if desired; use gross here)
    planId: string           // 'pro' | 'enterprise' | 'free'
    metadata?: Record<string, unknown>
}

export interface CommissionResult {
    created: boolean
    entryId?: string
    commissionAmount?: number
    currency?: string
    holdUntil?: Date
    skippedReason?: string
}

interface AttributionRow {
    id: string
    partner_id: string
    partner_link_id: string | null
    attributed_at: Date
    window_expires_at: Date | null
    status: string
}

interface OfferRow {
    id: string
    max_months: number | null
    applies_to_plans: string[]
    applies_to_events: string[]
}

interface RuleRow {
    id: string
    rule_type: 'percent_revenue' | 'fixed_amount' | 'tiered_percent'
    rate_percent: string | null
    fixed_amount: string | null
    hold_days: number
    applies_to_event: string | null
    max_amount: string | null
    currency: string
}

interface EntryCountRow {
    month_number: string
}

// ---------------------------------------------------------------------------
// Core engine
// ---------------------------------------------------------------------------

/**
 * generateCommission
 * Idempotent — safe to call multiple times for the same event.
 * Returns { created: false, skippedReason } if no commission should be issued.
 */
export async function generateCommission(ctx: CommissionContext): Promise<CommissionResult> {
    const { tenantId, sourceEventType, sourceEventId, invoiceAmountUsd, planId } = ctx

    // 1. Find active attribution for this tenant
    const attrRes = await db.query(
        `SELECT id, partner_id, partner_link_id, attributed_at, window_expires_at, status
         FROM partner_attributions
         WHERE attributed_tenant_id = $1
           AND status = 'active'
         ORDER BY attributed_at DESC
         LIMIT 1`,
        [tenantId]
    )
    const attribution = attrRes.rows[0] as AttributionRow | undefined
    if (!attribution) {
        return { created: false, skippedReason: 'no_active_attribution' }
    }

    // 2. Find the partner's group assignment (first active group wins)
    const groupRes = await db.query(
        `SELECT pga.partner_group_id
         FROM partner_group_assignments pga
         WHERE pga.partner_id = $1
         LIMIT 1`,
        [attribution.partner_id]
    )
    const groupId = (groupRes.rows[0] as { partner_group_id: string } | undefined)?.partner_group_id
    if (!groupId) {
        return { created: false, skippedReason: 'partner_not_in_group' }
    }

    // 3. Find the best matching offer
    //    Priority: group match + plan match + event match
    //    Falls back to: group match + empty applies_to_plans + empty applies_to_events
    const offerRes = await db.query(
        `SELECT id, max_months, applies_to_plans, applies_to_events
         FROM partner_offers
         WHERE partner_group_id = $1
           AND status = 'active'
           AND (cardinality(applies_to_plans) = 0 OR $2 = ANY(applies_to_plans))
           AND (cardinality(applies_to_events) = 0 OR $3 = ANY(applies_to_events))
         ORDER BY
           -- prefer more specific offers (more plan/event filters set)
           (cardinality(applies_to_plans) + cardinality(applies_to_events)) DESC
         LIMIT 1`,
        [groupId, planId, sourceEventType]
    )
    const offer = offerRes.rows[0] as OfferRow | undefined
    if (!offer) {
        return { created: false, skippedReason: 'no_matching_offer' }
    }

    // 4. Find the active commission rule for this offer + event
    const ruleRes = await db.query(
        `SELECT id, rule_type, rate_percent, fixed_amount, hold_days,
                applies_to_event, max_amount, currency
         FROM partner_commission_rules
         WHERE offer_id = $1
           AND is_active = true
           AND (applies_to_event IS NULL OR applies_to_event = $2)
         ORDER BY
           -- prefer event-specific rules over catch-all
           (applies_to_event IS NOT NULL) DESC
         LIMIT 1`,
        [offer.id, sourceEventType]
    )
    const rule = ruleRes.rows[0] as RuleRow | undefined
    if (!rule) {
        return { created: false, skippedReason: 'no_matching_rule' }
    }

    // 5. Check max_months — count prior entries for this attribution + offer
    if (offer.max_months !== null) {
        const countRes = await db.query(
            `SELECT COUNT(*)::int as month_number
             FROM partner_commission_entries
             WHERE attribution_id = $1
               AND offer_id = $2
               AND status NOT IN ('declined','reversed')`,
            [attribution.id, offer.id]
        )
        const priorCount = parseInt(
            (countRes.rows[0] as EntryCountRow | undefined)?.month_number ?? '0',
            10
        )
        if (priorCount >= offer.max_months) {
            return {
                created: false,
                skippedReason: `max_months_reached(${offer.max_months})`,
            }
        }
    }

    // 6. Calculate commission amount
    const monthNumberRes = await db.query(
        `SELECT COUNT(*)::int as month_number
         FROM partner_commission_entries
         WHERE attribution_id = $1 AND offer_id = $2`,
        [attribution.id, offer.id]
    )
    const monthNumber = parseInt(
        (monthNumberRes.rows[0] as EntryCountRow | undefined)?.month_number ?? '0',
        10
    ) + 1

    let commissionAmount: number
    if (rule.rule_type === 'percent_revenue') {
        const rate = parseFloat(rule.rate_percent ?? '0') / 100
        commissionAmount = Math.round(invoiceAmountUsd * rate * 100) / 100
    } else if (rule.rule_type === 'fixed_amount') {
        commissionAmount = parseFloat(rule.fixed_amount ?? '0')
    } else {
        return { created: false, skippedReason: 'unsupported_rule_type' }
    }

    // Apply per-entry cap
    if (rule.max_amount !== null) {
        commissionAmount = Math.min(commissionAmount, parseFloat(rule.max_amount))
    }

    // Reject zero or negative commissions
    if (commissionAmount <= 0) {
        return { created: false, skippedReason: 'zero_amount' }
    }

    // 7. Hold until
    const holdUntil = new Date()
    holdUntil.setDate(holdUntil.getDate() + rule.hold_days)

    // 8. Write idempotent entry
    const insertRes = await db.query(
        `INSERT INTO partner_commission_entries (
             partner_id, attribution_id, offer_id, commission_rule_id,
             attributed_tenant_id, source_event_type, source_event_id,
             invoice_amount_usd, commission_amount, currency,
             status, hold_until, month_number, metadata
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',$11,$12,$13)
         ON CONFLICT (source_event_id, commission_rule_id) DO NOTHING
         RETURNING id`,
        [
            attribution.partner_id,
            attribution.id,
            offer.id,
            rule.id,
            tenantId,
            sourceEventType,
            sourceEventId,
            invoiceAmountUsd,
            commissionAmount,
            rule.currency,
            holdUntil,
            monthNumber,
            JSON.stringify(ctx.metadata ?? {}),
        ]
    )

    const entryRow = insertRes.rows[0] as { id: string } | undefined
    if (!entryRow) {
        // Conflict — already exists (idempotent re-delivery)
        return { created: false, skippedReason: 'already_exists' }
    }

    // Notify partner (non-blocking) — fetch email for notification
    db.query(
        `SELECT t.email, p.display_name, po.name AS offer_name
         FROM partners p
         JOIN tenants t ON t.id = p.primary_tenant_id
         JOIN partner_offers po ON po.id = $2
         WHERE p.id = $1`,
        [attribution.partner_id, offer.id]
    ).then(r => {
        const row = r.rows[0] as { email: string; display_name: string; offer_name: string } | undefined
        if (!row) return
        notifyCommissionCreated({
            partnerEmail: row.email,
            partnerName: row.display_name,
            commissionAmount,
            currency: rule.currency,
            offerName: row.offer_name,
            holdUntil,
            monthNumber,
        }).catch(() => {})
    }).catch(() => {})

    return {
        created: true,
        entryId: entryRow.id,
        commissionAmount,
        currency: rule.currency,
        holdUntil,
    }
}

// ---------------------------------------------------------------------------
// Admin helpers
// ---------------------------------------------------------------------------

export interface CommissionEntryRow {
    id: string
    partner_id: string
    partner_display_name: string
    attributed_tenant_id: string
    source_event_type: string
    source_event_id: string
    invoice_amount_usd: number
    commission_amount: number
    currency: string
    status: string
    hold_until: Date
    month_number: number
    created_at: Date
}

/**
 * getPendingCommissionsReadyForReview
 * Returns commissions whose hold period has elapsed but are still 'pending'.
 */
export async function getPendingCommissionsReadyForReview(
    limit = 50
): Promise<CommissionEntryRow[]> {
    const res = await db.query(
        `SELECT ce.*, p.display_name AS partner_display_name
         FROM partner_commission_entries ce
         JOIN partners p ON p.id = ce.partner_id
         WHERE ce.status = 'pending'
           AND ce.hold_until <= NOW()
         ORDER BY ce.created_at ASC
         LIMIT $1`,
        [limit]
    )
    return res.rows as CommissionEntryRow[]
}

/**
 * approveCommission
 * Transitions entry to 'approved'. Records review event.
 */
export async function approveCommission(
    entryId: string,
    reviewerTenantId: string,
    notes?: string
): Promise<void> {
    await db.query(
        `UPDATE partner_commission_entries
         SET status = 'approved', updated_at = NOW()
         WHERE id = $1 AND status IN ('pending')`,
        [entryId]
    )
    await db.query(
        `INSERT INTO partner_commission_reviews (entry_id, reviewer_id, from_status, to_status, notes)
         VALUES ($1, $2, 'pending', 'approved', $3)`,
        [entryId, reviewerTenantId, notes ?? null]
    )
}

/**
 * declineCommission
 * Transitions entry to 'declined'. Notes required.
 */
export async function declineCommission(
    entryId: string,
    reviewerTenantId: string,
    notes: string
): Promise<void> {
    await db.query(
        `UPDATE partner_commission_entries
         SET status = 'declined', review_notes = $2, updated_at = NOW()
         WHERE id = $1 AND status IN ('pending','approved')`,
        [entryId, notes]
    )
    await db.query(
        `INSERT INTO partner_commission_reviews (entry_id, reviewer_id, from_status, to_status, notes)
         VALUES ($1, $2, 'pending', 'declined', $3)`,
        [entryId, reviewerTenantId, notes]
    )
}

/**
 * reverseCommission
 * Creates a reversal record and transitions entry to 'reversed'.
 */
export async function reverseCommission(
    entryId: string,
    createdByTenantId: string,
    reason: 'chargeback' | 'refund' | 'fraud' | 'policy_violation' | 'manual_override',
    notes?: string
): Promise<void> {
    // Fetch entry amount
    const entryRes = await db.query(
        `SELECT partner_id, commission_amount, currency FROM partner_commission_entries WHERE id = $1`,
        [entryId]
    )
    const entry = entryRes.rows[0] as
        | { partner_id: string; commission_amount: string; currency: string }
        | undefined
    if (!entry) throw new Error(`Commission entry ${entryId} not found`)

    await db.query(
        `INSERT INTO partner_reversals (commission_entry_id, partner_id, reason, reversal_amount, currency, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
            entryId,
            entry.partner_id,
            reason,
            parseFloat(entry.commission_amount),
            entry.currency,
            notes ?? null,
            createdByTenantId,
        ]
    )
    await db.query(
        `UPDATE partner_commission_entries
         SET status = 'reversed', updated_at = NOW()
         WHERE id = $1`,
        [entryId]
    )
}

/**
 * getPartnerCommissionSummary
 * Returns aggregated balance figures for a partner.
 */
export async function getPartnerCommissionSummary(partnerId: string): Promise<{
    pendingAmount: number
    approvedAmount: number
    paidAmount: number
    totalEarned: number
}> {
    const res = await db.query(
        `SELECT
             SUM(CASE WHEN status = 'pending'  THEN commission_amount ELSE 0 END)  AS pending_amount,
             SUM(CASE WHEN status = 'approved' THEN commission_amount ELSE 0 END)  AS approved_amount,
             SUM(CASE WHEN status = 'paid'     THEN commission_amount ELSE 0 END)  AS paid_amount,
             SUM(CASE WHEN status NOT IN ('declined','reversed') THEN commission_amount ELSE 0 END) AS total_earned
         FROM partner_commission_entries
         WHERE partner_id = $1`,
        [partnerId]
    )
    const row = res.rows[0] as
        | { pending_amount: string | null; approved_amount: string | null; paid_amount: string | null; total_earned: string | null }
        | undefined
    return {
        pendingAmount:  parseFloat(row?.pending_amount  ?? '0'),
        approvedAmount: parseFloat(row?.approved_amount ?? '0'),
        paidAmount:     parseFloat(row?.paid_amount     ?? '0'),
        totalEarned:    parseFloat(row?.total_earned    ?? '0'),
    }
}
