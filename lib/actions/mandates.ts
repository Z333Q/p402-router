'use server';

import db from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function revokeMandateAction(mandateId: string) {
    const session = await getServerSession(authOptions);
    const tenantId = (session?.user as any)?.tenantId;
    if (!tenantId) return { success: false, error: 'Unauthorized' };

    try {
        // 1. Instantly kill the mandate to block further A2A spending
        await db.query(
            `UPDATE ap2_mandates 
       SET status = 'revoked' 
       WHERE id = $1 AND tenant_id = $2 AND status = 'active'`,
            [mandateId, tenantId]
        );

        // 2. Revalidate the page to update the UI instantly
        revalidatePath('/dashboard/mandates');
        return { success: true };
    } catch (error) {
        console.error('[MANDATES] Revoke failed:', error);
        return { success: false, error: 'Failed to revoke mandate.' };
    }
}
