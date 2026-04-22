'use client';

import { useMeterStore } from '../_store/useMeterStore';
import { ARC_TYPICAL_GAS_COST_USDC } from '@/lib/chains/arc';

// ETH mainnet at 30 gwei, ~65k gas per ERC-20 transfer
const ETH_MAINNET_COST_PER_TX = 2.85;

export function FrequencyCounter() {
  const { frequencyStats } = useMeterStore();
  const { authorizations, arcBatches, avgCostPerAction, totalCostUsd } = frequencyStats;

  const ethEquivalentCost = authorizations * ETH_MAINNET_COST_PER_TX;
  const savingMultiplier = totalCostUsd > 0 && ethEquivalentCost > 0
    ? Math.round(ethEquivalentCost / totalCostUsd)
    : null;

  return (
    <div className="border-2 border-primary bg-neutral-900 flex divide-x-2 divide-neutral-700 text-xs font-mono uppercase">
      <CounterCell
        label="Onchain Events"
        sublabel="50+ required for proof"
        value={authorizations.toString()}
        highlight
      />
      <CounterCell
        label="Arc Settlements"
        sublabel={`$${ARC_TYPICAL_GAS_COST_USDC}/tx gas`}
        value={arcBatches > 0 ? arcBatches.toString() : '—'}
      />
      <CounterCell
        label="Avg Cost / Event"
        sublabel="must be ≤ $0.01"
        value={authorizations > 0 ? `$${avgCostPerAction.toFixed(6)}` : '—'}
        pass={authorizations > 0 && avgCostPerAction < 0.01}
      />
      <CounterCell
        label="vs ETH Mainnet"
        sublabel="cost saving"
        value={savingMultiplier != null ? `${savingMultiplier}×` : '—'}
        highlight={savingMultiplier != null}
      />
    </div>
  );
}

function CounterCell({
  label,
  sublabel,
  value,
  highlight,
  pass,
}: {
  label: string;
  sublabel: string;
  value: string;
  highlight?: boolean;
  pass?: boolean;
}) {
  const valueColor = pass === true
    ? 'text-success'
    : pass === false
    ? 'text-error'
    : highlight
    ? 'text-primary'
    : 'text-neutral-50';

  return (
    <div className="flex-1 px-4 py-3">
      <div className="text-neutral-400 text-[10px] tracking-widest">{label}</div>
      <div className={`text-lg font-bold tabular-nums mt-0.5 ${valueColor}`}>{value}</div>
      <div className="text-[9px] text-neutral-600 tracking-wider mt-0.5">{sublabel}</div>
    </div>
  );
}
