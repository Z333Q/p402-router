import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import pool from '@/lib/db'
import { Notifications } from '@/lib/notifications'

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
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
                }
                return true
            } catch (e) {
                console.error("Onboarding error", e)
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
                    console.error("JWT tenant fetch failed", e)
                }
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).tenantId = token.tenantId;
                (session.user as any).isAdmin = token.isAdmin;
                (session.user as any).id = token.sub;
            }
            return session
        }
    }
}
