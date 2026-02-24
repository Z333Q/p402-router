'use server';

import { randomBytes, createHash } from 'crypto';
import db from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function generateApiKeyAction(prevState: any, formData: FormData) {
    try {
        const session = await getServerSession(authOptions);
        const tenantId = (session?.user as any)?.tenantId;
        if (!tenantId) throw new Error("Unauthorized");
        const name = formData.get('name') as string || 'Default Key';

        // 1. Generate secure key (Format: p402_live_[32_bytes_hex])
        const rawSecret = randomBytes(32).toString('hex');
        const rawKey = `p402_live_${rawSecret}`;

        // 2. Hash for storage
        const keyHash = createHash('sha256').update(rawKey).digest('hex');
        const keyPrefix = rawKey.substring(0, 15);

        // 3. Insert into DB
        await db.query(
            `INSERT INTO api_keys (tenant_id, name, key_prefix, key_hash, status)
       VALUES ($1, $2, $3, $4, 'active')`,
            [tenantId, name, keyPrefix, keyHash]
        );

        revalidatePath('/dashboard/settings');

        // Return the RAW key exactly once. The UI must display it and never again.
        return { success: true, rawKey, name };
    } catch (error) {
        return { success: false, error: 'Failed to generate API Key.' };
    }
}

export async function revokeApiKeyAction(keyId: string) {
    const session = await getServerSession(authOptions);
    const tenantId = (session?.user as any)?.tenantId;
    if (!tenantId) return;

    await db.query(
        `UPDATE api_keys SET status = 'revoked', revoked_at = NOW() 
     WHERE id = $1 AND tenant_id = $2`,
        [keyId, tenantId]
    );
    revalidatePath('/dashboard/settings');
}

export async function saveWebhookAction(prevState: any, formData: FormData) {
    try {
        const session = await getServerSession(authOptions);
        const tenantId = (session?.user as any)?.tenantId;
        if (!tenantId) throw new Error("Unauthorized");
        const webhookUrl = formData.get('webhookUrl') as string;

        // Generate a signing secret if it doesn't exist
        const secret = `whsec_${randomBytes(24).toString('hex')}`;

        await db.query(
            `INSERT INTO tenant_settings (tenant_id, webhook_url, webhook_secret) 
       VALUES ($1, $2, $3)
       ON CONFLICT (tenant_id) DO UPDATE SET 
         webhook_url = EXCLUDED.webhook_url,
         updated_at = NOW()`,
            [tenantId, webhookUrl, secret]
        );

        revalidatePath('/dashboard/settings');
        return { success: true, message: 'Webhook URL updated.' };
    } catch (error) {
        return { success: false, error: 'Failed to update Webhook URL.' };
    }
}
