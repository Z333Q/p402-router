'use client'
import React, { useState, useEffect } from 'react'
import { Badge, Button, Card, CodeBox, EmptyState, Input, Select } from '../_components/ui'
import { WalletRequired } from '../_components/WalletRequired';
import { usePolicies, POLICY_TEMPLATES, Policy } from '@/hooks/usePolicies'
import { clsx } from 'clsx'

export default function PolicyBuilderPage() {
    const {
        policies,
        selectedId,
        setSelectedId,
        loading,
        error,
        draft,
        setDraft,
        save,
        applyTemplate,
        refresh
    } = usePolicies()

    const [jsonMode, setJsonMode] = useState(false)
    const [rawJson, setRawJson] = useState('')

    // Simulation State
    const [simParams, setSimParams] = useState({
        routeId: 'rt_weather',
        buyerId: 'buyer_demo',
        network: 'eip155:8453',
        amount: '0.01',
        legacyHeader: 'false'
    })

    const [plan, setPlan] = useState<any>(null)
    const [planErr, setPlanErr] = useState('')
    const [simLoading, setSimLoading] = useState(false)

    useEffect(() => {
        if (draft) setRawJson(JSON.stringify(draft, null, 2))
    }, [draft])

    const handleSave = async () => {
        let toSave = draft;
        if (jsonMode) {
            try {
                toSave = JSON.parse(rawJson)
            } catch (e) {
                alert('Invalid JSON structure');
                return;
            }
        }
        if (toSave) await save(toSave)
    }

    const runSimulation = async () => {
        setSimLoading(true)
        setPlan(null)
        setPlanErr('')
        try {
            const res = await fetch('/api/v1/router/plan', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    policyId: selectedId,
                    routeId: simParams.routeId,
                    payment: {
                        network: simParams.network,
                        scheme: 'exact',
                        amount: simParams.amount,
                        asset: 'USDC',
                        legacyXPayment: simParams.legacyHeader === 'true'
                    },
                    buyer: { buyerId: simParams.buyerId }
                })
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
            setPlan(data)
        } catch (e: any) {
            setPlanErr(e?.message || 'Simulation logic error')
        } finally {
            setSimLoading(false)
        }
    }

    return (
        <WalletRequired
            mode="soft"
            title="Design Mode"
            description="You are in Design Mode. Connect your wallet to persist policies to the control plane and enable production routing."
        >
            <div className="space-y-8">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black uppercase tracking-tighter text-black">Policies</h1>
                        <p className="text-neutral-500 font-medium">Builder & Simulator for spend controls (v1.1.0).</p>
                    </div>
                    <div className="flex gap-3">
                        <Button onClick={handleSave}>Save Active Policy</Button>
                        <Button variant="secondary" onClick={refresh}>Reset Builder</Button>
                    </div>
                </div>

                {loading && <div className="h-1 bg-black w-full animate-pulse" />}
                {error && <div className="p-4 bg-error text-white font-bold border-2 border-black">{error}</div>}

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

                    {/* Left: Policy List & Templates (3/12) */}
                    <div className="xl:col-span-3 space-y-6">
                        <Card title="Control Index" className="p-0 overflow-hidden">
                            <div className="flex flex-col border-b-2 border-black">
                                {policies.length === 0 && !loading && (
                                    <div className="p-6 text-center text-xs font-bold text-neutral-400 uppercase">No policies found</div>
                                )}
                                {policies.map(p => (
                                    <button
                                        key={p.policyId}
                                        onClick={() => setSelectedId(p.policyId)}
                                        className={clsx(
                                            "w-full px-5 py-4 text-left font-black transition-all",
                                            selectedId === p.policyId
                                                ? "bg-primary text-black"
                                                : "bg-white text-neutral-500 hover:bg-neutral-50 border-b border-black/5"
                                        )}
                                    >
                                        <div className="text-sm uppercase tracking-tight">{p.name}</div>
                                        <div className="font-mono text-[9px] opacity-60 mt-1">{p.policyId}</div>
                                    </button>
                                ))}
                            </div>

                            <div className="p-5 bg-neutral-900 border-t-2 border-black">
                                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4">Quick Templates</div>
                                <div className="flex flex-col gap-2">
                                    {POLICY_TEMPLATES.map(t => (
                                        <button
                                            key={t.name}
                                            onClick={() => applyTemplate(t)}
                                            className="w-full text-left bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 px-3 py-2 text-[10px] font-bold uppercase transition-colors"
                                        >
                                            + {t.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Middle: Builder (5/12) */}
                    <div className="xl:col-span-12 lg:xl:col-span-5">
                        {draft ? (
                            <Card title="Policy Configuration" className="bg-white">
                                <div className="flex justify-end mb-6">
                                    <button
                                        onClick={() => setJsonMode(!jsonMode)}
                                        className="text-[10px] font-black uppercase underline hover:text-primary transition-colors"
                                    >
                                        {jsonMode ? 'Switch to UI Form' : 'Switch to Raw JSON'}
                                    </button>
                                </div>

                                {jsonMode ? (
                                    <div className="space-y-4">
                                        <textarea
                                            value={rawJson}
                                            onChange={e => setRawJson(e.target.value)}
                                            className="w-full h-[500px] font-mono text-xs p-5 bg-neutral-50 border-2 border-black focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                                            placeholder="Paste policy JSON here..."
                                        />
                                        <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
                                            Schema v1.0.0 · Full Revalidation on Save
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        <Input
                                            label="Friendly Name"
                                            value={draft.name}
                                            onChange={v => setDraft({ ...draft, name: v })}
                                        />

                                        <div className="space-y-4">
                                            <div className="text-xs font-black uppercase tracking-widest text-neutral-400 border-b-2 border-black/5 pb-2">Active Enforcement Rules</div>
                                            <div className="grid grid-cols-1 gap-3">
                                                <ToggleRule
                                                    label="Reject legacy X-PAYMENT"
                                                    checked={draft.rules?.denyIf?.legacyXPaymentHeader}
                                                    onChange={v => setDraft({
                                                        ...draft,
                                                        rules: { ...draft.rules, denyIf: { ...draft.rules?.denyIf, legacyXPaymentHeader: v } }
                                                    })}
                                                />
                                                <ToggleRule
                                                    label="Require PAYMENT-SIGNATURE"
                                                    checked={draft.rules?.denyIf?.missingPaymentSignature}
                                                    onChange={v => setDraft({
                                                        ...draft,
                                                        rules: { ...draft.rules, denyIf: { ...draft.rules?.denyIf, missingPaymentSignature: v } }
                                                    })}
                                                />
                                                <ToggleRule
                                                    label="Strict price floor enforcement"
                                                    checked={draft.rules?.denyIf?.amountBelowRequired}
                                                    onChange={v => setDraft({
                                                        ...draft,
                                                        rules: { ...draft.rules, denyIf: { ...draft.rules?.denyIf, amountBelowRequired: v } }
                                                    })}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="text-xs font-black uppercase tracking-widest text-neutral-400 border-b-2 border-black/5 pb-2">Rate & Budget Overlays</div>
                                            <CodeBox
                                                title="Limits Definition"
                                                value={{
                                                    rpmLimits: draft.rules?.rpmLimits,
                                                    budgets: draft.rules?.budgets
                                                }}
                                                className="bg-neutral-50"
                                            />
                                        </div>
                                    </div>
                                )}
                            </Card>
                        ) : (
                            <EmptyState title="No active selection" body="Select a policy from the index or start with a template." />
                        )}
                    </div>

                    {/* Right: Simulator (4/12) */}
                    <div className="xl:col-span-4 lg:xl:col-span-4 space-y-6">
                        <Card title="Traffic Simulator" body="Validate logic against the selected policy before going live." className="bg-neutral-50 shadow-none border-dashed border-neutral-300">
                            <div className="space-y-6 mt-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Target Route" value={simParams.routeId} onChange={v => setSimParams({ ...simParams, routeId: v })} />
                                    <Input label="Buyer ID" value={simParams.buyerId} onChange={v => setSimParams({ ...simParams, buyerId: v })} />
                                </div>

                                <div className="space-y-4 p-5 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Request Context</div>
                                    <Input label="Chain ID / Network" value={simParams.network} onChange={v => setSimParams({ ...simParams, network: v })} />
                                    <Input label="Provided Amount (USDC)" value={simParams.amount} onChange={v => setSimParams({ ...simParams, amount: v })} />
                                    <Select
                                        label="Signature Protocol"
                                        value={simParams.legacyHeader}
                                        onChange={v => setSimParams({ ...simParams, legacyHeader: v })}
                                        options={[
                                            { value: 'false', label: 'EIP-712 (Modern)' },
                                            { value: 'true', label: 'X-PAYMENT (Legacy)' }
                                        ]}
                                    />
                                </div>

                                <Button
                                    onClick={runSimulation}
                                    className="w-full flex items-center justify-center gap-2"
                                    disabled={simLoading}
                                >
                                    {simLoading ? 'Simulating...' : 'Run Simulation'}
                                </Button>

                                {planErr && <div className="p-3 bg-error text-white font-bold text-xs border-2 border-black">FAILED: {planErr}</div>}

                                {plan && (
                                    <div className={clsx(
                                        "p-6 border-2 border-black animate-in zoom-in-95 duration-200",
                                        plan.allow ? "bg-success" : "bg-error"
                                    )}>
                                        <div className="flex justify-between items-center mb-6">
                                            <span className="font-black text-xl uppercase tracking-tighter">
                                                {plan.allow ? 'Policy: PASS' : 'Policy: FAIL'}
                                            </span>
                                            <Badge tone="neutral" className="bg-white/30 border-white/40 text-black">
                                                {plan.candidates?.length || 0} Routes Found
                                            </Badge>
                                        </div>

                                        {plan.policy?.deny && (
                                            <div className="bg-white/90 p-4 border-2 border-black space-y-2 mb-4">
                                                <div className="text-[10px] font-black text-error uppercase">Violated Rule</div>
                                                <div className="font-mono text-xs font-bold">{plan.policy.deny.code}</div>
                                                <div className="text-xs font-medium text-neutral-600 leading-relaxed">{plan.policy.deny.detail}</div>
                                            </div>
                                        )}

                                        {plan.policy?.reasons?.length > 0 && (
                                            <div className="space-y-1 mt-4">
                                                <div className="text-[10px] font-black text-black/40 uppercase mb-2">Diagnostic Log</div>
                                                {plan.policy.reasons.map((r: string, i: number) => (
                                                    <div key={i} className="text-[10px] font-bold text-black flex gap-2">
                                                        <span className="opacity-40">→</span> {r}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </WalletRequired>
    )
}

function ToggleRule({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <label className={clsx(
            "flex items-center justify-between p-4 border-2 border-black cursor-pointer transition-colors group",
            checked ? "bg-primary/5" : "bg-white"
        )}>
            <span className="text-sm font-bold text-black uppercase tracking-tight group-hover:underline underline-offset-4 decoration-2">{label} spans</span>
            <input
                type="checkbox"
                checked={checked}
                onChange={e => onChange(e.target.checked)}
                className="w-5 h-5 accent-primary border-2 border-black cursor-pointer"
            />
        </label>
    )
}
