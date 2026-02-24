import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import db from '@/lib/db';
import { MandateTable } from '../_components/mandates/MandateTable';
import { ShieldAlert } from 'lucide-react';

export const metadata = {
    title: 'Agent Governance | P402'
};

export default async function MandatesPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect('/login');
    const tenantId = (session.user as any).tenantId;

    // Fetch all mandates for this tenant directly on the server
    let mandates = [];
    try {
        const res = await db.query(
            `SELECT id, agent_did, type, constraints, amount_spent_usd, status, created_at 
       FROM ap2_mandates 
       WHERE tenant_id = $1 
       ORDER BY CASE status WHEN 'active' THEN 1 ELSE 2 END, created_at DESC`,
            [tenantId]
        );
        mandates = res.rows;
    } catch (error) {
        console.error('Failed to fetch mandates', error);
    }

    return (
        <div className="pane flex flex-col gap-8 p-8 max-w-5xl">
            <div>
                <h1 className="page-title text-[var(--neutral-900)] flex items-center gap-3">
                    <ShieldAlert className="w-8 h-8 text-[var(--error)]" />
                    Agent Governance
                </h1>
                <p className="text-[var(--neutral-700)] mt-2 font-mono">
                    Monitor and control autonomous agent spending via AP2 Mandates. Revoke budget authorization instantly in case of rogue activity.
                </p>
            </div>

            {/* SSR Data passed to interactive Client Component */}
            <MandateTable mandates={mandates} />
        </div>
    );
}
