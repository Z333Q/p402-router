import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import pool from '@/lib/db'
import { Notifications } from '@/lib/notifications'
import { verifyMessage } from 'viem'
import { recordFunnelEvent } from '@/lib/analytics/funnel'

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),

        /**
         * CDP Wallet Auth — wallet-address-as-identity.
         * Client signs a deterministic message with their CDP embedded wallet;
         * server verifies the signature via viem recoverAddress.
         * Identity: <address>@wallet.p402.io — auto-provisions tenant on first sign-in.
         *
         * Security: The signed message includes a timestamp so replayed signatures
         * expire after 5 minutes. No CDP server SDK call required here — signature
         * verification is fully self-contained.
         */
        CredentialsProvider({
            id: 'cdp-wallet',
            name: 'CDP Wallet',
            credentials: {
                address:   { label: 'Wallet Address', type: 'text' },
                signature: { label: 'Signature',      type: 'text' },
                message:   { label: 'Message',        type: 'text' },
            },
            async authorize(credentials) {
                if (!credentials?.address || !credentials?.signature || !credentials?.message) {
                    return null;
                }

                try {
                    // Validate message format: "Sign in to P402\nAddress: 0x...\nTimestamp: <unix>"
                    const lines = credentials.message.split('\n');
                    const tsLine = lines.find((l: string) => l.startsWith('Timestamp: '));
                    if (!tsLine) return null;

                    const ts = parseInt(tsLine.replace('Timestamp: ', ''), 10);
                    const ageSeconds = Math.floor(Date.now() / 1000) - ts;

                    // Reject signatures older than 5 minutes
                    if (ageSeconds > 300 || ageSeconds < -30) return null;

                    // Verify ECDSA signature — no external calls, purely local
                    const recovered = await verifyMessage({
                        address: credentials.address as `0x${string}`,
                        message: credentials.message,
                        signature: credentials.signature as `0x${string}`,
                    });

                    if (!recovered) return null;

                    // Wallet address is the canonical identity
                    const email = `${credentials.address.toLowerCase()}@wallet.p402.io`;
                    return {
                        id:    credentials.address,
                        email,
                        name:  `Wallet ${credentials.address.slice(0, 6)}…${credentials.address.slice(-4)}`,
                        image: null,
                    };
                } catch {
                    return null;
                }
            },
        }),
    ],
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: '/login',
    },
    callbacks: {
        async signIn({ user, account, profile }) {
            if (!user.email) return false

            let isNewTenant = false
            let resolvedTenantId: string | null = null
            try {
                // Auto-Onboarding: Check if tenant exists for this email, if not create one
                const res = await pool.query("SELECT id FROM tenants WHERE owner_email = $1", [user.email])
                if (res.rows.length === 0) {
                    // Provision new tenant
                    console.log(`Provisioning new tenant for ${user.email}`)
                    const tenantId = crypto.randomUUID()
                    await pool.query(
                        "INSERT INTO tenants (id, name, owner_email, status) VALUES ($1, $2, $3, 'active')",
                        [tenantId, user.name || 'New Tenant', user.email]
                    )
                    isNewTenant = true
                    resolvedTenantId = tenantId

                    // Notify Admin of new signup
                    Notifications.notifyNewSignup({
                        email: user.email,
                        name: user.name
                    }).catch(err => console.error("Delayed Notification Error", err));

                    // Seed default policy for new tenant
                    await pool.query(
                        `INSERT INTO policies (policy_id, tenant_id, name, rules) VALUES
                       ($1, $2, 'Default Start', '{"denyIf":{"legacyXPaymentHeader":true}}')`,
                        [`pol_${crypto.randomUUID().slice(0, 8)}`, tenantId]
                    )
                } else {
                    resolvedTenantId = (res.rows[0]?.id as string | undefined) ?? null
                }

                // 3AZ-2-B: emit funnel.signin_success. Fire-and-forget; the
                // helper swallows DB errors internally. No PII in properties.
                recordFunnelEvent({
                    eventName: 'funnel.signin_success',
                    tenantId: resolvedTenantId,
                    properties: {
                        provider: account?.provider ?? 'unknown',
                        is_new_tenant: isNewTenant,
                    },
                }).catch(() => { /* belt-and-braces */ })

                return true
            } catch (e) {
                console.error("Onboarding error", e)
                recordFunnelEvent({
                    eventName: 'funnel.error',
                    properties: {
                        stage: 'signin',
                        reason_code: 'signin_callback_error',
                    },
                }).catch(() => { /* belt-and-braces */ })
                return false
            }
        },
        async jwt({ token, user }) {
            // Initial sign in
            if (user) {
                try {
                    const res = await pool.query("SELECT id FROM tenants WHERE owner_email = $1", [user.email])
                    if (res.rows[0]) {
                        token.tenantId = res.rows[0].id
                    }

                    // Admin Authorization
                    const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase());
                    token.isAdmin = adminEmails.includes(user.email?.toLowerCase() || "");
                } catch (e) {
                    console.error("JWT initial fetch failed", e)
                }
            }

            // Fallback: If tenantId is missing but we have an email, try to fetch it
            if (!token.tenantId && token.email) {
                try {
                    const res = await pool.query("SELECT id FROM tenants WHERE owner_email = $1", [token.email])
                    if (res.rows[0]) {
                        token.tenantId = res.rows[0].id
                    }
                } catch (e) {
                    console.error("JWT fallback fetch failed", e)
                }
            }

            // Partner context — resolved once per session from partner_memberships.
            // Stored in the signed JWT so API routes need no extra DB call.
            if (token.tenantId && !token.partnerId) {
                try {
                    const partnerRes = await pool.query(
                        `SELECT
                            pm.partner_id,
                            pm.role,
                            COALESCE(
                                array_agg(pga.partner_group_id::text)
                                    FILTER (WHERE pga.partner_group_id IS NOT NULL),
                                '{}'::text[]
                            ) AS group_ids
                         FROM partner_memberships pm
                         LEFT JOIN partner_group_assignments pga ON pga.partner_id = pm.partner_id
                         WHERE pm.tenant_id = $1
                           AND pm.status = 'active'
                         GROUP BY pm.partner_id, pm.role
                         LIMIT 1`,
                        [token.tenantId]
                    );
                    if (partnerRes.rows[0]) {
                        token.partnerId      = partnerRes.rows[0].partner_id;
                        token.partnerRole    = partnerRes.rows[0].role;
                        token.partnerGroupIds = partnerRes.rows[0].group_ids ?? [];
                    }
                } catch (e) {
                    // partner_memberships table may not exist yet — fail-open
                    console.error("JWT partner fetch failed", e)
                }
            }

            return token
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).tenantId        = token.tenantId;
                (session.user as any).isAdmin         = token.isAdmin;
                (session.user as any).id              = token.sub;
                (session.user as any).partnerId       = token.partnerId;
                (session.user as any).partnerRole     = token.partnerRole;
                (session.user as any).partnerGroupIds = token.partnerGroupIds;
            }
            return session
        }
    }
}

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';

/**
 * Validates tenant access for API requests.
 * Uses NextAuth session if available to enforce tenant isolation, 
 * otherwise requires an explicit tenant ID for API keys.
 */
export async function requireTenantAccess(req: NextRequest) {
    const session = await getServerSession(authOptions);
    let requestedTenant = req.headers.get('x-p402-tenant');

    if (session?.user) {
        const userTenant = (session.user as any).tenantId;
        // User requested a specific tenant that is NOT theirs, and they aren't admin
        if (requestedTenant &&
            requestedTenant !== 'default' &&
            requestedTenant !== 'anonymous' &&
            requestedTenant !== userTenant &&
            !(session.user as any).isAdmin) {
            return { error: 'Forbidden: Cannot access other tenant data', status: 403 };
        }

        // S4 Safety Pack: Reject requests from banned tenants globally
        try {
            const repCheck = await pool.query('SELECT is_banned FROM tenant_reputation WHERE tenant_id = $1', [userTenant]);
            if (repCheck.rows[0]?.is_banned) {
                return { error: 'Safety Lock: Tenant access suspended due to TOS violations', status: 403 };
            }
        } catch {
            // tenant_reputation table may not exist yet (migration pending) — fail-open
        }

        return { tenantId: userTenant };
    }

    // Fallback for API keys (no NextAuth session)
    if (!requestedTenant || requestedTenant === 'default' || requestedTenant === 'anonymous') {
        return { error: 'Unauthorized: Missing or invalid tenant context', status: 401 };
    }

    // S4 Safety Pack: Reject API requests from banned tenants
    try {
        const repCheckApi = await pool.query('SELECT is_banned FROM tenant_reputation WHERE tenant_id = $1', [requestedTenant]);
        if (repCheckApi.rows[0]?.is_banned) {
            return { error: 'Safety Lock: Tenant API suspended due to TOS violations', status: 403 };
        }
    } catch {
        // tenant_reputation table may not exist yet (migration pending) — fail-open
    }

    return { tenantId: requestedTenant };
}

/**
 * Strict admin gate for tenant-scoped governance routes (privacy settings,
 * scope overrides, retention rules, etc.).
 *
 * Returns { tenantId, actorEmail } only when ALL of these are true:
 *   1. The caller has a NextAuth session — API keys cannot reach this gate.
 *   2. The session user is the tenant owner (tenants.owner_email matches the
 *      session email), OR the session user has the global ADMIN_EMAILS flag.
 *
 * The `actorEmail` field is intentionally returned so the caller can record
 * who saved a sensitive row (e.g. metadata.last_modified_by_email on a
 * widening privacy override).
 *
 * Returns { error, status } on failure; do NOT fall back to less-restrictive
 * gates from this function — privacy widening is one of those decisions that
 * must fail closed.
 */
export async function requireTenantAdminAccess(req: NextRequest): Promise<
    | { tenantId: string; actorEmail: string; isAdmin: boolean }
    | { error: string; status: number }
> {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return { error: 'Unauthorized: signed-in session required for admin action', status: 401 };
    }

    const sessionTenantId = (session.user as any).tenantId as string | undefined;
    const sessionEmail    = (session.user as any).email   as string | undefined;
    const sessionIsAdmin  = !!(session.user as any).isAdmin;

    if (!sessionTenantId || !sessionEmail) {
        return { error: 'Unauthorized: incomplete session', status: 401 };
    }

    const requestedTenant = req.headers.get('x-p402-tenant');
    if (requestedTenant && requestedTenant !== sessionTenantId && !sessionIsAdmin) {
        return { error: 'Forbidden: cannot manage other tenant', status: 403 };
    }

    const tenantId = (requestedTenant && sessionIsAdmin) ? requestedTenant : sessionTenantId;

    // The owner check: tenants.owner_email must match the session email.
    // Global admins bypass the owner match.
    if (!sessionIsAdmin) {
        try {
            const r = await pool.query('SELECT owner_email FROM tenants WHERE id = $1', [tenantId]);
            const row = r.rows[0];
            const ownerEmail = row?.owner_email?.toLowerCase?.();
            if (!ownerEmail || ownerEmail !== sessionEmail.toLowerCase()) {
                return { error: 'Forbidden: tenant-admin role required', status: 403 };
            }
        } catch {
            // Fail closed on a DB lookup error — never grant admin access by accident.
            return { error: 'Forbidden: unable to verify tenant ownership', status: 403 };
        }
    }

    return { tenantId, actorEmail: sessionEmail, isAdmin: sessionIsAdmin };
}
