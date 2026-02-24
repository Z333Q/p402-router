import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import db from "@/lib/db";
import { ShieldCheck, ShieldAlert, BadgeCheck, AlertTriangle } from 'lucide-react';

export const metadata = {
    title: 'Trust & Safety | P402',
};

export default async function TrustDashboardPage() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        redirect('/login');
    }

    const tenantId = (session.user as any).tenantId;

    // Fetch Tenant Reputation
    let reputationScore = 100;
    let isBanned = false;
    let rankScore = 0;
    try {
        const repRes = await db.query(`SELECT trust_score, is_banned FROM tenant_reputation WHERE tenant_id = $1`, [tenantId]);
        if (repRes.rows.length > 0) {
            reputationScore = repRes.rows[0].trust_score;
            isBanned = repRes.rows[0].is_banned;
        }

        // Just aggregate some mock or real rank score from bazaar listings
        const rankRes = await db.query(`SELECT AVG(rank_score) as avg_rank FROM bazaar_resources WHERE tenant_id = $1`, [tenantId]);
        rankScore = rankRes.rows[0]?.avg_rank || 0;
    } catch (e) {
        console.error('Failed to fetch reputation', e);
    }

    // Fetch Safety Incidents
    let incidents: any[] = [];
    try {
        const incRes = await db.query(`
            SELECT * FROM safety_incidents 
            WHERE tenant_id = $1 
            ORDER BY created_at DESC 
            LIMIT 10
        `, [tenantId]);
        incidents = incRes.rows;
    } catch (e) {
        console.error('Failed to fetch incidents', e);
    }

    return (
        <div className="space-y-8 max-w-6xl">
            <div>
                <h1 className="page-title !text-3xl mb-2 flex items-center gap-3">
                    <ShieldCheck className="w-8 h-8 text-[var(--primary)]" />
                    Trust & Safety Command Center
                </h1>
                <p className="text-[var(--neutral-600)] font-medium">
                    Manage your Enterprise trust posture, publisher identity, and safety incidents.
                </p>
            </div>

            {/* TOP PANE: Audit & Scorecard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card bg-[var(--neutral-50)] border-2 border-black flex flex-col justify-center items-center p-8">
                    <div className="text-[var(--neutral-500)] font-black uppercase text-sm mb-2">Network Reputation</div>
                    <div className="text-6xl font-black text-black">{Number(reputationScore).toFixed(0)}</div>
                    {isBanned && (
                        <div className="mt-4 bg-[var(--error)] text-white text-xs font-bold uppercase px-3 py-1 border-2 border-black">
                            Account Suspended
                        </div>
                    )}
                </div>
                <div className="card bg-[var(--neutral-50)] border-2 border-black flex flex-col justify-center items-center p-8">
                    <div className="text-[var(--neutral-500)] font-black uppercase text-sm mb-2">Bazaar Rank</div>
                    <div className="text-6xl font-black text-black">{Number(rankScore).toFixed(1)}</div>
                </div>
                <div className="card bg-[var(--primary)] text-black border-2 border-black flex flex-col justify-center items-center p-8 shadow-[4px_4px_0px_#000]">
                    <ShieldCheck className="w-12 h-12 mb-4" />
                    <div className="font-black uppercase text-center leading-tight">
                        ERC-8004 Validation Guard Active
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* PUBLISHER MODE */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-black uppercase text-black border-b-4 border-[var(--primary)] inline-block pb-1">Publisher Mode</h2>
                    <div className="card border-2 border-black p-6 bg-white">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="w-12 h-12 bg-[var(--neutral-100)] border-2 border-black flex items-center justify-center shrink-0">
                                <BadgeCheck className="w-6 h-6 text-[var(--success)]" />
                            </div>
                            <div>
                                <h3 className="font-black text-lg uppercase mb-1">On-Chain Identity</h3>
                                <p className="text-sm text-[var(--neutral-600)] leading-relaxed">
                                    Register your Publisher DID on Base to receive a verified Trust Badge in the public Bazaar. High reputation publishers receive priority routing in the A2A network.
                                </p>
                            </div>
                        </div>
                        <button className="btn bg-black text-white w-full uppercase font-black tracking-widest border-2 border-black hover:bg-[var(--primary)] hover:text-black transition-colors">
                            Connect DID Registry
                        </button>
                    </div>
                </div>

                {/* OPERATOR MODE */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-black uppercase text-black border-b-4 border-[var(--error)] inline-block pb-1">Operator Mode</h2>
                    <div className="card border-2 border-black p-0 bg-white overflow-hidden">
                        <div className="p-4 bg-[var(--neutral-50)] border-b-2 border-black flex justify-between items-center">
                            <h3 className="font-black text-sm uppercase flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-[var(--error)]" />
                                Safety Incidents
                            </h3>
                            <span className="text-xs font-bold uppercase text-[var(--neutral-500)]">Last 10 Events</span>
                        </div>

                        {incidents.length === 0 ? (
                            <div className="p-8 text-center text-[var(--neutral-500)] font-medium text-sm">
                                No safety incidents detected.
                            </div>
                        ) : (
                            <div className="divide-y-2 divide-black">
                                {incidents.map((incident: any) => (
                                    <div key={incident.id} className="p-4 flex items-center justify-between hover:bg-[var(--neutral-50)] transition-colors">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 border-2 border-black ${incident.severity === 'critical' ? 'bg-[var(--error)] text-white' :
                                                        incident.severity === 'high' ? 'bg-[var(--warning)] text-black' :
                                                            'bg-[var(--neutral-200)] text-black'
                                                    }`}>
                                                    {incident.severity}
                                                </span>
                                                <span className="font-bold text-sm tracking-tight">{incident.category}</span>
                                            </div>
                                            <span className="text-xs text-[var(--neutral-600)] font-mono">{incident.id.split('-')[0]} • {new Date(incident.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <div>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${incident.status === 'open' ? 'text-[var(--error)]' : 'text-[var(--success)]'}`}>
                                                {incident.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
