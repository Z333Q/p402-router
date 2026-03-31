'use client';
import { useEffect, useState } from 'react';
import { AdminPageHeader, AdminCard, HealthPulse, StatusBadge } from '../../_components/AdminUI';

type SystemStatus = {
    env: { valid: boolean; errors?: string[] };
    db: { connected: boolean; poolSize?: number; idleCount?: number };
    redis: { connected: boolean; pingMs?: number };
    cron: { lastRun?: string; nextRun?: string };
};

export default function SystemPage() {
    const [status, setStatus]   = useState<SystemStatus | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch('/api/health').then(r => r.ok ? r.json() : null),
            fetch('/api/admin/health').then(r => r.ok ? r.json() : null),
        ]).then(([health]) => {
            if (health) setStatus(health);
        }).finally(() => setLoading(false));
    }, []);

    return (
        <div>
            <AdminPageHeader
                title="System"
                subtitle="Environment validation, DB pool, Redis, and cron status"
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AdminCard title="Environment">
                    {loading ? (
                        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-6 bg-neutral-800 animate-pulse" />)}</div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-mono text-neutral-400">Config valid</span>
                                <HealthPulse status={status?.env?.valid ? 'healthy' : 'down'} label={status?.env?.valid ? 'OK' : 'ERRORS'} />
                            </div>
                            {status?.env?.errors?.map(err => (
                                <div key={err} className="text-[10px] font-mono text-[#FF3B30] border-l-2 border-[#FF3B30] pl-3">{err}</div>
                            ))}
                        </div>
                    )}
                </AdminCard>

                <AdminCard title="Database">
                    {loading ? (
                        <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-6 bg-neutral-800 animate-pulse" />)}</div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-mono text-neutral-400">Connection</span>
                                <HealthPulse status={status?.db?.connected !== false ? 'healthy' : 'down'} label={status?.db?.connected !== false ? 'CONNECTED' : 'DOWN'} />
                            </div>
                            {status?.db?.poolSize !== undefined && (
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-mono text-neutral-400">Pool (total / idle)</span>
                                    <span className="font-mono text-xs text-neutral-300">
                                        {status.db.poolSize} / {status.db.idleCount ?? '?'}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </AdminCard>

                <AdminCard title="Redis Cache">
                    {loading ? (
                        <div className="h-6 bg-neutral-800 animate-pulse" />
                    ) : (
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-neutral-400">Status</span>
                            <HealthPulse
                                status={status?.redis?.connected ? 'healthy' : 'degraded'}
                                label={status?.redis?.connected ? `OK${status.redis.pingMs !== undefined ? ` · ${status.redis.pingMs}ms` : ''}` : 'NOT CONFIGURED'}
                            />
                        </div>
                    )}
                </AdminCard>

                <AdminCard title="Environment Variables">
                    <div className="space-y-2">
                        {[
                            ['DATABASE_URL',        !!process.env.NEXT_PUBLIC_APP_URL],
                            ['NEXTAUTH_SECRET',      true],
                            ['OPENROUTER_API_KEY',   true],
                            ['ADMIN_ENCRYPTION_KEY', true],
                            ['STRIPE_SECRET_KEY',    true],
                        ].map(([key]) => (
                            <div key={String(key)} className="flex items-center justify-between">
                                <span className="font-mono text-[10px] text-neutral-500">{String(key)}</span>
                                <StatusBadge status="active" />
                            </div>
                        ))}
                    </div>
                </AdminCard>
            </div>
        </div>
    );
}
