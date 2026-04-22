'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useMeterStore } from '../_store/useMeterStore';

export function InheritedTrustStrip() {
  const { trustSummary, setTrustSummary } = useMeterStore();

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
        <Link
          href="/meter/trust"
          className="text-[10px] font-mono text-info hover:text-primary uppercase tracking-wider"
        >
          View Details →
        </Link>
      </div>
      <div className="px-4 py-3 flex flex-wrap gap-3">
        <TrustChip label="ERC-8004 Identity" active={trust.hasIdentity} />
        <TrustChip label="Reputation-Aware Routing" active={trust.hasReputation} />
        <TrustChip label="AP2 Budget Controls" active={trust.hasBudgetControls} />
        <TrustChip label="Evidence Bundle Ready" active={trust.hasEvidenceBundle} />
      </div>
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
