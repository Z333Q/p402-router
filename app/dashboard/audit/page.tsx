'use client';

import React from 'react';
import { Badge, StatusDot } from '../_components/ui';
import { CodeAuditTerminal } from '@/components/intelligence/CodeAuditTerminal';

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
                    <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter text-black italic">
                        Security & Cost <span className="text-primary NOT-italic">Auditor</span>
                    </h1>
                    <p className="text-neutral-500 font-bold uppercase text-xs tracking-widest max-w-md">
                        Powered by Gemini 3 • Real-time Threat detection • Infrastructure optimization
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <StatusDot status="healthy" label="Deep Scan Engine Active" />
                </div>
            </div>

            {/* Main Terminal Area */}
            <CodeAuditTerminal variant="full" />

            <div className="p-8 bg-black text-white border-4 border-primary space-y-4">
                <h3 className="text-2xl font-black uppercase tracking-tighter italic text-primary">Zero-Knowledge Analysis.</h3>
                <p className="text-sm font-medium text-neutral-400 leading-relaxed max-w-3xl">
                    P402 uses ephemeral Gemini 3 sessions to audit your code. We do not store your proprietary logic indefinitely—only the metadata required for your safety report and rate-limit tracking. For private repositories, we recommend flattening your structure via GitIngest.com before performing a deep scan.
                </p>
            </div>
        </div>
    );
}
