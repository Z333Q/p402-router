'use client';

import { useState, useCallback } from 'react';

export type EscrowState =
    | 'CREATED'
    | 'FUNDED'
    | 'ACCEPTED'
    | 'IN_PROGRESS'
    | 'DELIVERED'
    | 'SETTLED'
    | 'DISPUTED'
    | 'RESOLVED'
    | 'EXPIRED'
    | 'CANCELLED';

export type Escrow = {
    id: string;
    state: EscrowState;
    payer_address: string;
    provider_address: string;
    amount_usd: number;
    amount_usdc: string;
    reference_id: string;
    proof_hash: string | null;
    tx_hash_funded: string | null;
    tx_hash_settled: string | null;
    dispute_deadline: string | null;
    created_at: string;
    updated_at: string;
    events?: EscrowEvent[];
};

export type EscrowEvent = {
    from_state: string;
    to_state: string;
    actor: string | null;
    tx_hash: string | null;
    created_at: string;
};

export function useEscrow() {
    const [escrows, setEscrows] = useState<Escrow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [transitioning, setTransitioning] = useState<string | null>(null);

    const fetchEscrows = useCallback(async (address?: string) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (address) params.set('address', address);
            const res = await fetch(`/api/v2/escrow?${params}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json() as { data: Escrow[] };
            setEscrows(data.data ?? []);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load escrows');
        } finally {
            setLoading(false);
        }
    }, []);

    const createEscrow = useCallback(async (params: {
        payerAddress: string;
        providerAddress: string;
        amountUsd: number;
        referenceId: string;
        description?: string;
    }): Promise<Escrow | null> => {
        setCreating(true);
        setError(null);
        try {
            const res = await fetch('/api/v2/escrow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    payer_address: params.payerAddress,
                    provider_address: params.providerAddress,
                    amount_usd: params.amountUsd,
                    reference_id: params.referenceId,
                    description: params.description,
                }),
            });
            const data = await res.json() as Escrow & { error?: { message: string } };
            if (!res.ok) throw new Error(data.error?.message ?? `HTTP ${res.status}`);
            return data;
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to create escrow');
            return null;
        } finally {
            setCreating(false);
        }
    }, []);

    const transition = useCallback(async (
        escrowId: string,
        action: 'fund' | 'accept' | 'start' | 'deliver' | 'release' | 'dispute',
        extra?: { tx_hash?: string; proof_hash?: string; actor?: string }
    ): Promise<Escrow | null> => {
        setTransitioning(escrowId);
        setError(null);
        try {
            const res = await fetch(`/api/v2/escrow/${escrowId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...extra }),
            });
            const data = await res.json() as Escrow & { error?: { message: string } };
            if (!res.ok) throw new Error(data.error?.message ?? `HTTP ${res.status}`);
            setEscrows(prev => prev.map(e => e.id === escrowId ? data : e));
            return data;
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Transition failed');
            return null;
        } finally {
            setTransitioning(null);
        }
    }, []);

    return {
        escrows,
        loading,
        error,
        creating,
        transitioning,
        fetchEscrows,
        createEscrow,
        transition,
    };
}
