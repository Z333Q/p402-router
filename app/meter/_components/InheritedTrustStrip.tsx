'use client';

import { useEffect, useState } from 'react';
import { useMeterStore } from '../_store/useMeterStore';

export function InheritedTrustStrip() {
  const { trustSummary, setTrustSummary } = useMeterStore();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch('/api/meter/trust')
      .then((r) => r.json())
      .then((d: { trust?: Parameters<typeof setTrustSummary>[0] }) => {
        if (d.trust) setTrustSummary(d.trust);
      })
      .catch(() => null);
  }, [setTrustSummary]);

  const trust = trustSummary ?? {
    hasIdentity: true,
    hasReputation: true,
    hasBudgetControls: true,
    hasEvidenceBundle: true,
  };

  return (
    <div className="border-2 border-neutral-700 bg-neutral-900">
      <div className="px-4 py-2 border-b border-neutral-700 flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase text-neutral-400 tracking-widest">
          Inherited P402 Trust Depth
        </span>
        <div className="flex items-center gap-3">
          <a
            href="https://p402.io/trust"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-mono text-info hover:text-primary uppercase tracking-wider transition-colors"
          >
            Trust Center ↗
          </a>
          <button
            className="text-[10px] font-mono text-neutral-500 hover:text-neutral-300 uppercase tracking-wider transition-colors"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? '▲ Less' : '▼ Details'}
          </button>
        </div>
      </div>

      <div className="px-4 py-3 flex flex-wrap gap-3">
        <TrustChip label="ERC-8004 Identity" active={trust.hasIdentity} />
        <TrustChip label="Reputation-Aware Routing" active={trust.hasReputation} />
        <TrustChip label="AP2 Budget Controls" active={trust.hasBudgetControls} />
        <TrustChip label="Evidence Bundle Ready" active={trust.hasEvidenceBundle} />
        <TrustChip label="Replay Protection" active={true} />
        <TrustChip label="Non-Custodial Execution" active={true} />
      </div>

      {expanded && (
        <div className="border-t border-neutral-800 px-4 py-3 flex flex-col gap-3">
          <TrustDetailRow
            label="Non-Custodial Execution"
            value="No user funds held. Circle Developer-Controlled Wallets with per-session policy locks."
          />
          <TrustDetailRow
            label="Replay Protection"
            value="EIP-3009 nonces tracked per payment. Each authorization used exactly once."
          />
          <TrustDetailRow
            label="Evidence Bundle"
            value="Each run produces an exportable audit bundle: extracted fields, Gemini trace, ledger events, Arc tx hashes."
          />
          <TrustDetailRow
            label="ERC-8004 Identity"
            value="Agent identity registered on Arc mainnet. Identity Registry: 0x8004A169..."
          />
          <TrustDetailRow
            label="AP2 Budget Controls"
            value="Spending mandates set per session. Automatic halt when budget cap is reached."
          />
          <div className="flex gap-3 mt-1">
            <a
              href="https://p402.io/trust"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-mono text-info hover:text-primary uppercase tracking-wider border border-info hover:border-primary px-3 py-1 transition-colors"
            >
              Full Trust Center ↗
            </a>
            <a
              href="https://p402.io/docs/a2a"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-mono text-neutral-400 hover:text-neutral-300 uppercase tracking-wider border border-neutral-700 hover:border-neutral-500 px-3 py-1 transition-colors"
            >
              A2A Protocol Docs ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function TrustChip({ label, active }: { label: string; active: boolean }) {
  return (
    <div
      className={`border px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5 ${
        active ? 'border-success text-success' : 'border-neutral-700 text-neutral-600'
      }`}
    >
      <span>{active ? '✓' : '○'}</span>
      {label}
    </div>
  );
}

function TrustDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-[10px] font-mono font-bold uppercase text-neutral-300 tracking-wider">{label}</div>
      <div className="text-[10px] font-mono text-neutral-500 leading-relaxed">{value}</div>
    </div>
  );
}
