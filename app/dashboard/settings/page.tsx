import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import { ApiKeyManager, WebhookManager } from '../_components/settings/ApiKeyManager';
import { WorldIdPanel } from '../_components/settings/WorldIdPanel';
import { Settings } from 'lucide-react';

export const metadata = {
    title: 'Developer Settings | P402',
};

export default async function SettingsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect('/login');
    const tenantId = (session.user as any).tenantId;

    // 1. Fetch active API Keys
    const keysRes = await db.query(
        `SELECT id, name, key_prefix, created_at 
     FROM api_keys 
     WHERE tenant_id = $1 AND status = 'active'
     ORDER BY created_at DESC`,
        [tenantId]
    );
    const existingKeys = keysRes.rows;

    // 2. Fetch Tenant Settings for Webhooks
    let webhookUrl = '';
    let webhookSecret = '';
    try {
        const settingsRes = await db.query(
            `SELECT webhook_url, webhook_secret 
       FROM tenant_settings 
       WHERE tenant_id = $1`,
            [tenantId]
        );
        if (settingsRes.rows.length > 0) {
            webhookUrl = settingsRes.rows[0].webhook_url || '';
            webhookSecret = settingsRes.rows[0].webhook_secret || '';
        }
    } catch (error) {
        console.error('Failed to fetch tenant settings', error);
    }

    return (
        <div className="pane flex flex-col gap-8 p-8 max-w-5xl">
            <div>
                <h1 className="page-title text-[var(--neutral-900)] flex items-center gap-3">
                    <Settings className="w-8 h-8 text-[var(--primary)]" />
                    Developer Settings
                </h1>
                <p className="text-[var(--neutral-700)] mt-2 font-mono">
                    Manage your API credentials, webhook endpoints, and integration integrations for routing autonomous agent tasks.
                </p>
            </div>

            {/* Client Components for Interactive Management */}
            <WorldIdPanel />

            <ApiKeyManager existingKeys={existingKeys} />

            <WebhookManager currentWebhook={webhookUrl} webhookSecret={webhookSecret} />

        </div>
    );
}
