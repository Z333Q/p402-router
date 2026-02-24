'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuditContractPayload } from '@/lib/types/audit';

export function useAuditSummary(
    scopeType: string,
    scopeId: string,
    initialData?: AuditContractPayload | null
) {
    const queryClient = useQueryClient();
    const queryKey = ['audit', 'summary', scopeType, scopeId];

    const { data, isLoading, error } = useQuery({
        queryKey,
        queryFn: async () => {
            const res = await fetch(
                `/api/v1/audit/summary?scope_type=${scopeType}&scope_id=${scopeId}`
            );
            if (!res.ok) throw new Error('Failed to fetch audit summary');
            return res.json() as Promise<AuditContractPayload>;
        },
        initialData: initialData ?? undefined,
        staleTime: 1000 * 60 * 5, // 5 min
    });

    // Real-time SSE status tracking
    const [jobStatus, setJobStatus] = useState<
        'idle' | 'queued' | 'running' | 'success' | 'failed'
    >('idle');
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const eventSource = new EventSource(
            `/api/v1/audit/stream?scope_type=${scopeType}&scope_id=${scopeId}`
        );

        eventSource.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);

                switch (payload.type) {
                    case 'AUDIT_QUEUED':
                        setJobStatus('queued');
                        break;
                    case 'AUDIT_RUNNING':
                        setJobStatus('running');
                        setProgress(payload.progress || 0);
                        break;
                    case 'AUDIT_SUCCESS':
                        setJobStatus('success');
                        setProgress(100);
                        if (payload.data) {
                            queryClient.setQueryData(queryKey, payload.data);
                        }
                        setTimeout(() => setJobStatus('idle'), 3000);
                        break;
                    case 'AUDIT_FAILED':
                        setJobStatus('failed');
                        setTimeout(() => setJobStatus('idle'), 5000);
                        break;
                }
            } catch (err) {
                console.error('[SSE] Parse error:', err);
            }
        };

        eventSource.onerror = () => {
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, [scopeType, scopeId, queryClient]); // queryKey excluded intentionally — stable ref

    return {
        auditData: data,
        isLoading,
        error,
        realtime: { status: jobStatus, progress },
    };
}
