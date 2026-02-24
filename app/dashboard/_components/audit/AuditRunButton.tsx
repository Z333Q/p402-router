'use client';

import { useActionState } from 'react';
import { runAuditAction } from '@/lib/actions/audit';

interface Props {
    scopeType: string;
    scopeId: string;
}

export function AuditRunButton({ scopeType, scopeId }: Props) {
    const [state, formAction, isPending] = useActionState(runAuditAction, { success: false });

    return (
        <form action={formAction} className="flex flex-col gap-2">
            <input type="hidden" name="scopeType" value={scopeType} />
            <input type="hidden" name="scopeId" value={scopeId} />

            <button
                type="submit"
                disabled={isPending}
                className="w-full bg-[var(--primary)] text-[var(--neutral-900)] font-bold uppercase tracking-wide py-3 px-4 border-2 border-black rounded-none hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
                {isPending ? (
                    <span className="inline-block w-5 h-5 border-2 border-black border-t-transparent animate-spin rounded-full" />
                ) : null}
                {isPending ? 'Running...' : 'Run Setup Audit'}
            </button>

            {state?.error && (
                <div className="bg-red-600 text-white p-3 text-sm font-mono border-2 border-black rounded-none">
                    {state.error}
                    {state.requiredPlan && (
                        <a href="/dashboard/billing/upgrade" className="ml-2 underline font-bold">
                            Upgrade →
                        </a>
                    )}
                </div>
            )}
            {state?.success && state.jobId && (
                <div className="bg-green-500 text-[var(--neutral-900)] p-3 text-sm font-mono border-2 border-black rounded-none">
                    ✓ Audit queued. Job: {state.jobId.substring(0, 8)}…
                </div>
            )}
        </form>
    );
}
