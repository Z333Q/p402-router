'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

export type PolicyRule = {
    routeScopes: string[];
    budgets: { buyerId: string; dailyUsd: number }[];
    rpmLimits: { buyerId: string; rpm: number }[];
    denyIf: {
        legacyXPaymentHeader: boolean;
        missingPaymentSignature: boolean;
        amountBelowRequired: boolean;
    };
};

export type Policy = {
    policyId: string;
    name: string;
    schemaVersion: '1.0.0';
    updatedAt: string;
    rules: PolicyRule;
};

export const POLICY_TEMPLATES = [
    {
        name: "Agent-Safe Default",
        rules: {
            routeScopes: ["*"],
            budgets: [{ buyerId: "default", dailyUsd: 10 }],
            rpmLimits: [{ buyerId: "default", rpm: 60 }],
            denyIf: {
                legacyXPaymentHeader: true,
                missingPaymentSignature: true,
                amountBelowRequired: true
            }
        }
    },
    {
        name: "Legacy Compatible",
        rules: {
            routeScopes: ["*"],
            budgets: [{ buyerId: "default", dailyUsd: 100 }],
            rpmLimits: [{ buyerId: "default", rpm: 300 }],
            denyIf: {
                legacyXPaymentHeader: false,
                missingPaymentSignature: false,
                amountBelowRequired: true
            }
        }
    }
];

export function usePolicies() {
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [selectedId, setSelectedId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [draft, setDraft] = useState<Policy | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/v1/policies', { cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const fetched = data.policies || [];
            setPolicies(fetched);

            if (fetched.length > 0 && !selectedId) {
                setSelectedId(fetched[0].policyId);
            }
        } catch (e: any) {
            setError(e?.message || 'Failed to load policies');
        } finally {
            setLoading(false);
        }
    }, [selectedId]);

    useEffect(() => { load() }, []);

    const selected = useMemo(() =>
        policies.find((p) => p.policyId === selectedId) || null,
        [policies, selectedId]);

    useEffect(() => {
        if (selected) setDraft(JSON.parse(JSON.stringify(selected)));
    }, [selected]);

    const save = async (policyToSave: Policy) => {
        setError(null);
        try {
            const res = await fetch('/api/v1/policies', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ policy: policyToSave })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            await load();
            return true;
        } catch (e: any) {
            setError(e?.message || 'Failed to save policy');
            return false;
        }
    };

    const applyTemplate = (template: typeof POLICY_TEMPLATES[0]) => {
        const newPolicy: Policy = {
            policyId: `pol_new_${Math.random().toString(36).substring(2, 7)}`,
            name: template.name,
            schemaVersion: "1.0.0",
            updatedAt: new Date().toISOString(),
            rules: template.rules
        };
        setDraft(newPolicy);
        setSelectedId(newPolicy.policyId);
    };

    return {
        policies,
        selectedId,
        setSelectedId,
        loading,
        error,
        draft,
        setDraft,
        save,
        applyTemplate,
        refresh: load
    };
}
