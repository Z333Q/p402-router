/**
 * lib/partner/permissions.ts
 * ==========================
 * Partner permission bundles.
 *
 * Authorization is permission-driven, not page-name or raw role string driven.
 * Every route and component checks specific permission strings.
 *
 * Role → permissions mapping is the single source of truth.
 * Add new capabilities here; never scatter role checks across pages.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PartnerRole =
    | 'partner_affiliate'
    | 'partner_agency'
    | 'partner_enterprise_referrer'
    | 'partner_manager_internal'
    | 'partner_finance_internal';

export type PartnerPermission =
    // ── Self-service ─────────────────────────────────────────────────────────
    | 'partner.dashboard.read'
    | 'partner.links.read'
    | 'partner.links.write'
    | 'partner.conversions.read'
    | 'partner.commissions.read'
    | 'partner.payouts.read'
    | 'partner.payouts.write_self'
    | 'partner.tax.write_self'
    | 'partner.docs.read'
    | 'partner.assets.read'
    | 'partner.support.write'
    // ── Agency / Enterprise ───────────────────────────────────────────────────
    | 'partner.leads.read'
    | 'partner.leads.write'
    | 'partner.deals.read'
    | 'partner.deals.write'
    // ── Internal: manager ─────────────────────────────────────────────────────
    | 'partner.admin.applications.read'
    | 'partner.admin.applications.review'
    | 'partner.admin.partners.read'
    | 'partner.admin.partners.update'
    | 'partner.admin.groups.read'
    | 'partner.admin.groups.update'
    | 'partner.admin.offers.read'
    | 'partner.admin.offers.update'
    | 'partner.admin.review.read'
    | 'partner.admin.review.decide'
    | 'partner.admin.fraud.read'
    | 'partner.admin.fraud.decide'
    | 'partner.admin.attribution.override'
    | 'partner.admin.payouts.read'
    | 'partner.admin.payouts.prepare'
    // ── Internal: finance ─────────────────────────────────────────────────────
    | 'partner.admin.payouts.release'
    | 'partner.admin.tax.read'
    | 'partner.admin.tax.review'
    | 'partner.admin.ledger.export'
    | 'partner.admin.reversals.write';

// ---------------------------------------------------------------------------
// Role → permission bundles
// ---------------------------------------------------------------------------

const AFFILIATE_BASE: PartnerPermission[] = [
    'partner.dashboard.read',
    'partner.links.read',
    'partner.links.write',
    'partner.conversions.read',
    'partner.commissions.read',
    'partner.payouts.read',
    'partner.payouts.write_self',
    'partner.tax.write_self',
    'partner.docs.read',
    'partner.assets.read',
    'partner.support.write',
];

const ROLE_PERMISSIONS: Record<PartnerRole, PartnerPermission[]> = {
    partner_affiliate: AFFILIATE_BASE,

    partner_agency: [
        ...AFFILIATE_BASE,
        'partner.leads.read',
        'partner.leads.write',
        'partner.deals.read',
        'partner.deals.write',
    ],

    partner_enterprise_referrer: [
        'partner.dashboard.read',
        'partner.links.read',
        'partner.links.write',
        'partner.conversions.read',
        'partner.commissions.read',
        'partner.payouts.read',
        'partner.docs.read',
        'partner.assets.read',
        'partner.leads.read',
        'partner.leads.write',
        'partner.deals.read',
        'partner.deals.write',
        'partner.support.write',
    ],

    partner_manager_internal: [
        'partner.dashboard.read',
        'partner.admin.applications.read',
        'partner.admin.applications.review',
        'partner.admin.partners.read',
        'partner.admin.partners.update',
        'partner.admin.groups.read',
        'partner.admin.groups.update',
        'partner.admin.offers.read',
        'partner.admin.offers.update',
        'partner.admin.review.read',
        'partner.admin.review.decide',
        'partner.admin.fraud.read',
        'partner.admin.fraud.decide',
        'partner.admin.attribution.override',
        'partner.admin.payouts.read',
        'partner.admin.payouts.prepare',
    ],

    partner_finance_internal: [
        'partner.dashboard.read',
        'partner.admin.payouts.read',
        'partner.admin.payouts.prepare',
        'partner.admin.payouts.release',
        'partner.admin.tax.read',
        'partner.admin.tax.review',
        'partner.admin.ledger.export',
        'partner.admin.reversals.write',
    ],
};

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the permission bundle for a given role.
 * Returns an empty array for unknown roles — fail-safe.
 */
export function resolvePartnerPermissions(role: string): PartnerPermission[] {
    return ROLE_PERMISSIONS[role as PartnerRole] ?? [];
}

/**
 * Check whether a resolved permission bundle includes a specific permission.
 */
export function hasPermission(
    permissions: PartnerPermission[],
    required: PartnerPermission
): boolean {
    return permissions.includes(required);
}

/**
 * Check whether a resolved permission bundle includes ALL of the required permissions.
 */
export function hasAllPermissions(
    permissions: PartnerPermission[],
    required: PartnerPermission[]
): boolean {
    return required.every(p => permissions.includes(p));
}

/**
 * Returns true if the role is an internal staff role.
 * Internal roles should never be granted via the public application flow.
 */
export function isInternalPartnerRole(role: string): boolean {
    return role === 'partner_manager_internal' || role === 'partner_finance_internal';
}

/**
 * Returns true if the role is any valid partner role.
 */
export function isValidPartnerRole(role: string): role is PartnerRole {
    return role in ROLE_PERMISSIONS;
}
