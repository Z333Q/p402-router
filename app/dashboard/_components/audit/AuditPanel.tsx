'use client';

import { useAuditSummary } from '@/hooks/useAuditSummary';
import { AuditScorecard } from './AuditScorecard';
import { AuditRunButton } from './AuditRunButton';
import type { AuditContractPayload } from '@/lib/types/audit';

interface Props {
    scopeType: string;
    scopeId: string;
    initialData: AuditContractPayload | null;
}

export function AuditPanel({ scopeType, scopeId, initialData }: Props) {
    const { auditData, realtime } = useAuditSummary(scopeType, scopeId, initialData);

    return (
        <div className="flex flex-col gap-6">
            {auditData ? (
                <AuditScorecard audit={auditData} />
            ) : (
                <div className="p-6 border-2 border-black rounded-none bg-[var(--neutral-50)]">
                    <h3 className="font-bold uppercase mb-2 text-[var(--neutral-900)]">Setup Audit</h3>
                    <p className="text-sm text-neutral-700 font-mono">
                        Run an integration audit to verify your x402 endpoints and idempotency keys.
                    </p>
                </div>
            )}

            <div className="bg-[var(--primary)] p-4 border-2 border-black rounded-none text-[var(--neutral-900)]">
                <p className="font-bold mb-3 uppercase text-sm tracking-wide">Action Required</p>

                {realtime.status === 'running' || realtime.status === 'queued' ? (
                    <div className="w-full bg-black text-white font-bold uppercase tracking-wide py-3 px-4 border-2 border-black rounded-none flex justify-center items-center gap-2">
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                        Auditing… {realtime.progress}%
                    </div>
                ) : (
                    <AuditRunButton scopeType={scopeType} scopeId={scopeId} />
                )}

                {realtime.status === 'success' && (
                    <p className="mt-2 text-xs font-mono font-bold text-green-800">
                        ✓ Audit completed successfully.
                    </p>
                )}
                {realtime.status === 'failed' && (
                    <p className="mt-2 text-xs font-mono font-bold text-red-800">
                        ✗ Audit failed. Try again.
                    </p>
                )}
            </div>
        </div>
    );
}
