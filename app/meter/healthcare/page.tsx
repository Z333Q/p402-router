'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

import { SafeModeBanner } from './_components/SafeModeBanner';
import { SessionBar } from './_components/SessionBar';
import { FrequencyCounter } from './_components/FrequencyCounter';
import { CircleInfraStrip } from './_components/CircleInfraStrip';
import { GuidedDemoStrip } from './_components/GuidedDemoStrip';
import { TempoSettlementProof } from './_components/TempoSettlementProof';
import { InheritedTrustStrip } from './_components/InheritedTrustStrip';
import { MeterFunnelFooter } from '../_components/MeterFunnelFooter';
import { MeterBrand } from '../_components/MeterBrand';

// Governance overlay
import { HealthcareHero } from './_components/HealthcareHero';
import { PayerContextPanel } from './_components/PayerContextPanel';
import { LineOfBusinessSelector } from './_components/LineOfBusinessSelector';
import { StateProgramPolicyProfileCard } from './_components/StateProgramPolicyProfileCard';
import { SyntheticPriorAuthPacket } from './_components/SyntheticPriorAuthPacket';
import { ClientBudgetControls } from './_components/ClientBudgetControls';
import { AIOperationStream } from './_components/AIOperationStream';
import { OperationReceiptLedger } from './_components/OperationReceiptLedger';
import { DocumentationCompletenessPanel } from './_components/DocumentationCompletenessPanel';
import { CriteriaMappingPanel } from './_components/CriteriaMappingPanel';
import { HumanReviewGate } from './_components/HumanReviewGate';
import { CMSReadinessPanel } from './_components/CMSReadinessPanel';
import { HIPAASafetyBoundaryPanel } from './_components/HIPAASafetyBoundaryPanel';
import { HealthEquityPanel } from './_components/HealthEquityPanel';
import { OversightPacketExport } from './_components/OversightPacketExport';
import { ComplianceTracePanel } from './_components/ComplianceTracePanel';

import { useMeterStore } from './_store/useMeterStore';
import type { HealthcarePersona } from '@/lib/meter/healthcare/types';

const VALID_PERSONAS = new Set<HealthcarePersona>(['medicaid-mco', 'dual-eligible', 'marketplace']);

export default function MeterHealthcarePage() {
  const error = useMeterStore((s) => s.error);
  const setError = useMeterStore((s) => s.setError);
  const reset = useMeterStore((s) => s.reset);
  const safeMode = useMeterStore((s) => s.safeMode);
  const lightMode = useMeterStore((s) => s.lightMode);
  const setLightMode = useMeterStore((s) => s.setLightMode);
  const setPersona = useMeterStore((s) => s.setPersona);

  // Honor ?persona= query parameter on mount.
  const search = useSearchParams();
  useEffect(() => {
    const p = search?.get('persona');
    if (p && VALID_PERSONAS.has(p as HealthcarePersona)) {
      setPersona(p as HealthcarePersona);
    }
  }, [search, setPersona]);

  const themeClass = lightMode ? 'meter-light' : 'meter-dark';

  return (
    <div className={`min-h-screen flex flex-col ${lightMode ? 'bg-neutral-50' : 'bg-neutral-900'}`}>
      <SafeModeBanner />

      <div
        className={`border-b-2 px-6 py-3 flex items-center justify-between ${
          lightMode ? 'border-neutral-300 bg-white' : 'border-neutral-700 bg-neutral-900'
        }`}
      >
        <div className="flex items-center gap-3">
          <MeterBrand section="Healthcare" light={lightMode} />
          <span className={lightMode ? 'text-neutral-400' : 'text-neutral-700'}>·</span>
          <span
            className={`border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide ${
              lightMode ? 'border-neutral-400 text-neutral-600' : 'border-neutral-700 text-neutral-400'
            }`}
          >
            Tempo Mainnet
          </span>
          <span
            className={`text-[10px] font-mono uppercase px-2 py-0.5 border ${
              safeMode ? 'border-warning text-warning' : 'border-success text-success'
            }`}
          >
            {safeMode ? 'Demo' : 'Live'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLightMode(!lightMode)}
            className={`text-[10px] font-mono uppercase tracking-wider px-3 py-1.5 border-2 transition-none ${
              lightMode
                ? 'border-neutral-900 bg-neutral-900 text-neutral-50'
                : 'border-neutral-600 bg-transparent text-neutral-400 hover:border-neutral-400 hover:text-neutral-200'
            }`}
          >
            {lightMode ? '◐ Dark' : '◑ Light'}
          </button>
          <button className="btn btn-secondary text-xs" onClick={reset}>
            Reset
          </button>
        </div>
      </div>

      <div
        className={`${themeClass} flex-1 px-6 py-8 flex flex-col gap-8 max-w-[1400px] mx-auto w-full`}
      >
        {/* 1. Hero */}
        <HealthcareHero />

        {/* 2. Payer context */}
        <PayerContextPanel />

        {/* 3. Line-of-business selector */}
        <LineOfBusinessSelector />

        {/* 4. State program policy profile */}
        <StateProgramPolicyProfileCard />

        {/* 5. Synthetic packet */}
        <SyntheticPriorAuthPacket />

        {/* 6. Client budget controls */}
        <ClientBudgetControls />

        {/* Demo runner anchor — kicks off live Tempo settlement pipeline */}
        <div id="demo">
          <GuidedDemoStrip />
        </div>

        {/* Live volume metrics (real Tempo settlements) */}
        <SessionBar />
        <FrequencyCounter />

        {error && (
          <div className="border-2 border-error bg-neutral-900 px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-mono text-error">{error}</span>
            <button
              className="text-[10px] font-mono text-neutral-400 hover:text-neutral-50 uppercase"
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 7. AI operation stream (visualization over live receipts) */}
        <AIOperationStream />

        {/* 8 + 9. Documentation completeness + Criteria mapping */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DocumentationCompletenessPanel />
          <CriteriaMappingPanel />
        </div>

        {/* 10. Operation receipts */}
        <OperationReceiptLedger />

        {/* 11. Human review gate */}
        <HumanReviewGate />

        {/* 12. CMS readiness */}
        <CMSReadinessPanel />

        {/* 13. HIPAA boundary */}
        <HIPAASafetyBoundaryPanel />

        {/* 14. Health equity */}
        <HealthEquityPanel />

        {/* 15. Oversight packet export */}
        <OversightPacketExport />

        {/* Compliance trace */}
        <ComplianceTracePanel />

        {/* Tempo settlement proof — the on-chain receipt for this session's reconciliation */}
        <TempoSettlementProof />

        {/* Trust chain */}
        <CircleInfraStrip />
        <InheritedTrustStrip />

        {/* 16. Technical footnote */}
        <section className="border-2 border-neutral-700 p-6 flex flex-col gap-2">
          <h2 className="text-xs font-mono uppercase tracking-widest text-neutral-500">
            How P402 backs every receipt
          </h2>
          <p className="text-xs text-neutral-300 leading-relaxed">
            Each operation receipt is one metered AI action settled through P402&apos;s payment-aware
            orchestration layer: <span className="text-primary">x402</span> for per-operation payment
            authorization (EIP-3009 USDC.e on Tempo mainnet),{' '}
            <span className="text-primary">AP2 mandates</span> for client-level spending authority,
            policy enforcement at the tenant / line-of-business / workflow / case / agent level, and
            evidence bundles that bind operation, cost, model, policy decision, and reviewer outcome.
          </p>
          <p className="text-[11px] text-neutral-500 leading-snug">
            Receipts are evidence. Budgets live in policy. Decisions live with the reviewer.
          </p>
        </section>

        <MeterFunnelFooter context="healthcare" />
      </div>
    </div>
  );
}
