'use client';

import React from 'react';
import Link from 'next/link';
import { Badge, StatusDot } from '../_components/ui';
import { CodeAuditTerminal } from '@/components/intelligence/CodeAuditTerminal';

// ── Evidence export card ──────────────────────────────────────────────────────

const BUNDLE_FIELDS = [
    { label: 'requestId',      desc: 'Correlates to session_id on every traffic event.' },
    { label: 'txHash',         desc: 'On-chain transaction hash; null for receipt-reuse.' },
    { label: 'payer + payTo',  desc: 'EVM addresses — payer wallet and treasury.' },
    { label: 'scheme',         desc: '"exact" | "onchain" | "receipt".' },
    { label: 'amountUsd',      desc: 'Settlement amount in USD.' },
    { label: 'denyCode',       desc: 'Structured deny reason if the request was blocked.' },
    { label: 'timestamps',     desc: 'created / verified / settled — all ISO 8601.' },
    { label: 'auditFindings',  desc: 'Severity-tagged findings array from the audit engine.' },
    { label: 'basescanTxUrl',  desc: 'Direct Basescan link for independent verification.' },
];

function EvidenceExportCard() {
    return (
        <div className="border-2 border-black">
            {/* Card header */}
            <div className="bg-black text-white px-5 py-3 flex items-center justify-between">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-0.5">
                        Evidence engine
                    </div>
                    <h2 className="text-lg font-black uppercase tracking-tighter">
                        Exportable settlement bundles
                    </h2>
                </div>
                <Badge variant="primary">v1.0</Badge>
            </div>

            {/* Body */}
            <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-8 bg-white">

                {/* Field list */}
                <div>
                    <p className="text-xs font-medium text-neutral-600 mb-4 leading-relaxed">
                        Every settlement generates a structured <strong>EvidenceBundle</strong> — a single JSON artifact containing all fields required for compliance review, dispute resolution, and procurement evidence. Null fields signal &ldquo;not available at export time&rdquo;, never omitted.
                    </p>
                    <div className="space-y-1">
                        {BUNDLE_FIELDS.map(f => (
                            <div key={f.label} className="flex items-start gap-3 py-1.5 border-b border-neutral-100 last:border-0">
                                <code className="font-mono text-[10px] font-black text-black w-36 shrink-0 pt-0.5">
                                    {f.label}
                                </code>
                                <span className="text-[11px] text-neutral-500">{f.desc}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Export actions + endpoint */}
                <div className="flex flex-col gap-5">
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">
                            Export options
                        </div>
                        <div className="space-y-2">
                            <a
                                href="/api/v1/analytics/evidence-bundle?download=true"
                                className="flex items-center justify-between h-11 px-4 border-2 border-black bg-primary font-black text-[11px] uppercase tracking-wider hover:bg-black hover:text-primary transition-colors no-underline text-black"
                            >
                                <span>Download 30-day bundle</span>
                                <span>↓</span>
                            </a>
                            <Link
                                href="/dashboard/transactions"
                                className="flex items-center justify-between h-11 px-4 border-2 border-black font-black text-[11px] uppercase tracking-wider hover:bg-neutral-50 transition-colors no-underline text-black"
                            >
                                <span>Per-transaction bundles</span>
                                <span>→</span>
                            </Link>
                        </div>
                    </div>

                    <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">
                            API endpoint
                        </div>
                        <div className="border-2 border-black bg-[#0D0D0D] p-4">
                            <pre className="font-mono text-[10px] text-neutral-300 leading-relaxed overflow-x-auto whitespace-pre">{`GET /api/v1/analytics/evidence-bundle

# Single settlement by tx hash:
?txHash=0x…

# Single settlement by session:
?sessionId=<uuid>

# Date range (ISO 8601):
?from=2026-01-01T00:00:00Z
&to=2026-01-31T23:59:59Z

# Force download:
&download=true`}</pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AuditPage() {
    return (
        <div className="space-y-8 max-w-7xl mx-auto font-sans">

            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Badge variant="primary">Enterprise</Badge>
                        <Badge variant="default">v2.0 Stable</Badge>
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter text-black">
                        Security & Cost <span className="text-primary">Auditor</span>
                    </h1>
                    <p className="text-neutral-500 font-bold uppercase text-xs tracking-widest max-w-md">
                        Powered by Gemini 3 · Real-time threat detection · Infrastructure optimization
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <StatusDot status="healthy" label="Deep Scan Engine Active" />
                </div>
            </div>

            {/* Evidence export card — surfaced before the terminal so it's visible on first load */}
            <EvidenceExportCard />

            {/* Security audit terminal */}
            <CodeAuditTerminal variant="full" />

            {/* Zero-knowledge disclaimer */}
            <div className="p-6 bg-black text-white border-2 border-primary space-y-3">
                <h3 className="text-xl font-black uppercase tracking-tighter text-primary">
                    Zero-Knowledge Analysis.
                </h3>
                <p className="text-sm font-medium text-neutral-400 leading-relaxed max-w-3xl">
                    P402 uses ephemeral Gemini 3 sessions to audit your code. We do not store your proprietary logic indefinitely — only the metadata required for your safety report and rate-limit tracking. For private repositories, we recommend flattening your structure via GitIngest.com before performing a deep scan.
                </p>
            </div>

        </div>
    );
}
