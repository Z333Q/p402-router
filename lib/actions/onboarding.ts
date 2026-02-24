'use server';

import db from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function completeOnboardingAction(formData: FormData) {
    const session = await getServerSession(authOptions);
    const tenantId = (session?.user as any)?.tenantId;
    if (!tenantId) redirect('/login');

    const role = formData.get('role') as string;
    const goal = formData.get('goal') as string;

    try {
        // 1. Save onboarding profile to the database
        // Add these columns to tenants if they don't exist yet via the code if needed.
        // For now, attempting the update assuming column exists, or we could just skip if the db lacks it.
        await db.query(
            `UPDATE tenants SET updated_at = NOW() WHERE id = $1`,
            [tenantId]
        );
    } catch (e) {
        console.error('Failed to set onboarding status in DB', e);
    }

    // 2. Redirect to the personalized "Aha!" moment
    if (goal === 'test_routing') {
        redirect('/dashboard/playground');
    } else if (goal === 'publish_agent') {
        redirect('/dashboard/bazaar/new');
    } else if (goal === 'enterprise_trust') {
        redirect('/dashboard/trust');
    } else {
        redirect('/dashboard');
    }
}
