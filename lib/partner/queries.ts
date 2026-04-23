/**
 * lib/partner/queries.ts
 * =======================
 * Typed DB helpers for the partner program.
 * All queries use parameterized statements — no string interpolation.
 */

import db from '@/lib/db';
import type { PartnerRole } from './permissions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PartnerMembershipRow {
    partner_id: string;
    partner_type: string;
    partner_status: string;
    role: PartnerRole;
    display_name: string;
    referral_code: string;
    group_ids: string[];
}

export interface PartnerRow {
    id: string;
    program_id: string;
    primary_tenant_id: string;
    type: string;
    status: string;
    display_name: string;
    legal_name: string | null;
    website_url: string | null;
    referral_code: string;
    created_at: string;
}

export interface PartnerApplicationRow {
    id: string;
    email: string;
    name: string;
    website_url: string | null;
    channel_type: string | null;
    audience_size: string | null;
    audience_description: string | null;
    partner_type_interest: string;
    why_p402: string | null;
    promotion_plan: string | null;
    status: string;
    created_at: string;
}

// ---------------------------------------------------------------------------
// Membership queries
// ---------------------------------------------------------------------------

/**
 * Get the active partner membership for a tenant.
 * Returns null if the tenant has no partner membership.
 * Phase 1: single membership per user (first active row).
 */
export async function getPartnerMembershipForTenant(
    tenantId: string
): Promise<PartnerMembershipRow | null> {
    const res = await db.query(
        `SELECT
            pm.partner_id,
            p.type              AS partner_type,
            p.status            AS partner_status,
            pm.role,
            p.display_name,
            p.referral_code,
            COALESCE(
                array_agg(pga.partner_group_id::text) FILTER (WHERE pga.partner_group_id IS NOT NULL),
                '{}'::text[]
            ) AS group_ids
        FROM partner_memberships pm
        JOIN partners p ON p.id = pm.partner_id
        LEFT JOIN partner_group_assignments pga ON pga.partner_id = pm.partner_id
        WHERE pm.tenant_id = $1
          AND pm.status = 'active'
          AND p.status = 'approved'
        GROUP BY pm.partner_id, p.type, p.status, pm.role, p.display_name, p.referral_code
        LIMIT 1`,
        [tenantId]
    );
    return (res.rows[0] as PartnerMembershipRow | undefined) ?? null;
}

/**
 * Get a partner record by ID.
 */
export async function getPartnerById(partnerId: string): Promise<PartnerRow | null> {
    const res = await db.query(
        `SELECT id, program_id, primary_tenant_id, type, status, display_name,
                legal_name, website_url, referral_code, created_at
         FROM partners WHERE id = $1`,
        [partnerId]
    );
    return (res.rows[0] as PartnerRow | undefined) ?? null;
}

/**
 * Get a partner record by referral code.
 */
export async function getPartnerByCode(code: string): Promise<PartnerRow | null> {
    const res = await db.query(
        `SELECT id, program_id, primary_tenant_id, type, status, display_name,
                legal_name, website_url, referral_code, created_at
         FROM partners WHERE referral_code = $1`,
        [code]
    );
    return (res.rows[0] as PartnerRow | undefined) ?? null;
}

// ---------------------------------------------------------------------------
// Application queries
// ---------------------------------------------------------------------------

/**
 * Insert a new partner application.
 * Returns the created application ID.
 */
export async function createPartnerApplication(data: {
    email: string;
    name: string;
    website_url?: string;
    channel_type?: string;
    audience_size?: string;
    audience_description?: string;
    partner_type_interest: string;
    why_p402?: string;
    promotion_plan?: string;
}): Promise<string> {
    const res = await db.query(
        `INSERT INTO partner_applications
            (email, name, website_url, channel_type, audience_size,
             audience_description, partner_type_interest, why_p402, promotion_plan)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id`,
        [
            data.email,
            data.name,
            data.website_url ?? null,
            data.channel_type ?? null,
            data.audience_size ?? null,
            data.audience_description ?? null,
            data.partner_type_interest,
            data.why_p402 ?? null,
            data.promotion_plan ?? null,
        ]
    );
    const row = res.rows[0] as { id: string } | undefined;
    if (!row) throw new Error('Application insert returned no row');
    return row.id;
}

/**
 * Check whether an email already has a pending or approved application.
 */
export async function getExistingApplication(
    email: string
): Promise<{ id: string; status: string } | null> {
    const res = await db.query(
        `SELECT id, status FROM partner_applications
         WHERE email = $1 AND status IN ('pending','reviewing','approved')
         LIMIT 1`,
        [email]
    );
    return (res.rows[0] as { id: string; status: string } | undefined) ?? null;
}

// ---------------------------------------------------------------------------
// Analytics (lightweight — full analytics come in a later phase)
// ---------------------------------------------------------------------------

export interface PartnerOverviewStats {
    total_clicks: number;
    attributed_signups: number;
    pending_commissions_cents: number;
}

export async function getPartnerOverviewStats(
    partnerId: string
): Promise<PartnerOverviewStats> {
    const [clicksRes, signupsRes] = await Promise.all([
        db.query(
            `SELECT COUNT(*)::text AS count
             FROM partner_link_clicks WHERE partner_id = $1`,
            [partnerId]
        ),
        db.query(
            `SELECT COUNT(*)::text AS count
             FROM partner_attributions
             WHERE partner_id = $1 AND status = 'active'`,
            [partnerId]
        ),
    ]);

    const clickRow  = clicksRes.rows[0]  as { count: string } | undefined;
    const signupRow = signupsRes.rows[0] as { count: string } | undefined;

    return {
        total_clicks: parseInt(clickRow?.count ?? '0', 10),
        attributed_signups: parseInt(signupRow?.count ?? '0', 10),
        pending_commissions_cents: 0, // populated in Phase 3 (commission engine)
    };
}

// ---------------------------------------------------------------------------
// Link queries
// ---------------------------------------------------------------------------

export interface PartnerLinkRow {
    id: string;
    partner_id: string;
    campaign_id: string | null;
    code: string;
    destination_path: string;
    label: string | null;
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    default_subid: string | null;
    status: string;
    click_count: number;
    created_at: string;
    updated_at: string;
}

/**
 * Get all links for a partner with click counts.
 */
export async function getPartnerLinks(partnerId: string): Promise<PartnerLinkRow[]> {
    const res = await db.query(
        `SELECT
            pl.id, pl.partner_id, pl.campaign_id, pl.code,
            pl.destination_path, pl.label,
            pl.utm_source, pl.utm_medium, pl.utm_campaign, pl.default_subid,
            pl.status, pl.created_at, pl.updated_at,
            COUNT(plc.id)::int AS click_count
         FROM partner_links pl
         LEFT JOIN partner_link_clicks plc ON plc.partner_link_id = pl.id
         WHERE pl.partner_id = $1
         GROUP BY pl.id
         ORDER BY pl.created_at DESC`,
        [partnerId]
    );
    return res.rows as PartnerLinkRow[];
}

/**
 * Get a single link by code (for the click handler).
 */
export async function getPartnerLinkByCode(code: string): Promise<{
    id: string;
    partner_id: string;
    destination_path: string;
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    default_subid: string | null;
    status: string;
} | null> {
    const res = await db.query(
        `SELECT id, partner_id, destination_path,
                utm_source, utm_medium, utm_campaign, default_subid, status
         FROM partner_links WHERE code = $1 LIMIT 1`,
        [code]
    );
    return (res.rows[0] as typeof res.rows[0] | undefined) ?? null;
}

/**
 * Create a new partner link.
 * code must be unique — caller is responsible for uniqueness check or ON CONFLICT.
 */
export async function createPartnerLink(data: {
    partnerId: string;
    code: string;
    destinationPath?: string;
    label?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    defaultSubid?: string;
    campaignId?: string;
}): Promise<{ id: string; code: string }> {
    const res = await db.query(
        `INSERT INTO partner_links
            (partner_id, campaign_id, code, destination_path, label,
             utm_source, utm_medium, utm_campaign, default_subid)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id, code`,
        [
            data.partnerId,
            data.campaignId ?? null,
            data.code,
            data.destinationPath ?? '/',
            data.label ?? null,
            data.utmSource ?? null,
            data.utmMedium ?? null,
            data.utmCampaign ?? null,
            data.defaultSubid ?? null,
        ]
    );
    const row = res.rows[0] as { id: string; code: string } | undefined;
    if (!row) throw new Error('Link insert returned no row');
    return row;
}

/**
 * Pause or activate a link. Verifies ownership before updating.
 */
export async function setPartnerLinkStatus(
    linkId: string,
    partnerId: string,
    status: 'active' | 'paused'
): Promise<boolean> {
    const res = await db.query(
        `UPDATE partner_links SET status = $1, updated_at = NOW()
         WHERE id = $2 AND partner_id = $3
         RETURNING id`,
        [status, linkId, partnerId]
    );
    return (res.rows.length ?? 0) > 0;
}

/**
 * Check whether a link code already exists.
 */
export async function linkCodeExists(code: string): Promise<boolean> {
    const res = await db.query(
        `SELECT 1 FROM partner_links WHERE code = $1 LIMIT 1`,
        [code]
    );
    return (res.rows.length ?? 0) > 0;
}

