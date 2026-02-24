import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { stripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenantId = session.user.tenantId;

        // 1. Fetch tenant for stripe_customer_id
        const res = await db.query(
            'SELECT stripe_customer_id FROM tenants WHERE id = $1',
            [tenantId]
        );
        const tenant = res.rows[0];

        if (!tenant || !tenant.stripe_customer_id) {
            return NextResponse.json(
                { error: 'No active billing account found' },
                { status: 400 }
            );
        }

        // 2. Create Portal Session
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: tenant.stripe_customer_id,
            return_url: `${process.env.NEXTAUTH_URL}/dashboard/billing`,
        });

        return NextResponse.json({ url: portalSession.url });
    } catch (error: any) {
        console.error('Stripe Portal Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
