'use client';

import { useMeterStore } from '../_store/useMeterStore';
import { ARC_TYPICAL_GAS_COST_USDC } from '@/lib/chains/arc';

const ETH_MAINNET_COST_PER_TX = 2.85;
const REQUIRED_TX_THRESHOLD = 50;

export function FrequencyCounter() {
  const { frequencyStats, ledgerEvents } = useMeterStore();
  const { authorizations, arcBatches, avgCostPerAction, totalCostUsd } = frequencyStats;

  // Signed authorizations = all per-chunk billing events (extraction + review variants)
  const signedAuths = authorizations;

  // Arc on-chain tx = events with a real arcTxHash
  const arcTxCount = ledgerEvents.filter((e) => e.arcTxHash != null).length;

  // Settlement batches = reconciliation / escrow_release / arcBatchId events
  const settlementBatches = arcBatches;

  const ethEquivalentCost = signedAuths * ETH_MAINNET_COST_PER_TX;
  const savingMultiplier =
    totalCostUsd > 0 && ethEquivalentCost > 0
      ? Math.round(ethEquivalentCost / totalCostUsd)
      : null;

  // Threshold check, hackathon requires 50+ onchain tx and avg ≤ $0.01
  const txThresholdMet = signedAuths >= REQUIRED_TX_THRESHOLD;
  const costThresholdMet = signedAuths > 0 && avgCostPerAction < 0.01;
  const bothMet = txThresholdMet && costThresholdMet;

  return (
    <div className="border-2 border-primary bg-neutral-900 flex flex-col">
      {/* Label row */}
      <div className="px-4 pt-2 pb-1 flex items-center justify-between border-b border-neutral-800">
        <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-500">
          Arc Settlement Proof · Hackathon Criteria
        </span>
        {signedAuths > 0 && (
          <span
            className={`text-[9px] font-mono font-bold uppercase ${bothMet ? 'text-success' : 'text-warning'}`}
          >
            {bothMet ? '✓ Requirements Met' : '⋯ In Progress'}
          </span>
        )}
      </div>

      {/* Counter cells */}
      <div className="flex divide-x-2 divide-neutral-800 text-xs font-mono uppercase">
        <CounterCell
          label="AI Events"
          sublabel={signedAuths > 0 ? 'Token-priced units' : 'Not started yet'}
          value={signedAuths > 0 ? signedAuths.toString() : '—'}
          highlight={signedAuths > 0}
        />
        <CounterCell
          label="Signed Auths"
          sublabel={signedAuths > 0 ? 'Payment authorizations' : 'Not started yet'}
          value={signedAuths > 0 ? signedAuths.toString() : '—'}
          highlight={signedAuths > 0}
        />
        <CounterCell
          label="Arc Tx"
          sublabel={arcTxCount > 0 ? `${arcTxCount} settled` : signedAuths > 0 ? `$${ARC_TYPICAL_GAS_COST_USDC}/tx gas` : 'Not started yet'}
          value={arcTxCount > 0 ? arcTxCount.toString() : settlementBatches > 0 ? settlementBatches.toString() : '—'}
        />
        <CounterCell
          label="Avg / Event"
          sublabel={signedAuths > 0 ? 'target ≤ $0.01' : 'Not started yet'}
          value={signedAuths > 0 ? `$${avgCostPerAction.toFixed(6)}` : '—'}
          pass={costThresholdMet ? true : signedAuths > 0 ? false : undefined}
        />
        <CounterCell
          label="50+ Threshold"
          sublabel={
            signedAuths >= REQUIRED_TX_THRESHOLD
              ? `${signedAuths} events · met`
              : signedAuths > 0
              ? `${signedAuths} / ${REQUIRED_TX_THRESHOLD} req.`
              : 'requirement'
          }
          value={
            signedAuths >= REQUIRED_TX_THRESHOLD
              ? 'PASS'
              : signedAuths > 0
              ? `${signedAuths}/${REQUIRED_TX_THRESHOLD}`
              : '—'
          }
          pass={signedAuths > 0 ? txThresholdMet : undefined}
        />
        {savingMultiplier != null && (
          <CounterCell
            label="vs ETH"
            sublabel="cost saving"
            value={`${savingMultiplier}×`}
            highlight
          />
        )}
      </div>
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
  const valueColor =
    pass === true
      ? 'text-success'
      : pass === false
      ? 'text-error'
      : highlight
      ? 'text-primary'
      : 'text-neutral-50';

  return (
    <div className="flex-1 px-3 py-3">
      <div className="text-neutral-400 text-[9px] tracking-widest">{label}</div>
      <div className={`text-base font-bold tabular-nums mt-0.5 ${valueColor}`}>{value}</div>
      <div className="text-[9px] text-neutral-400 tracking-wider mt-0.5 leading-tight">{sublabel}</div>
    </div>
  );
}
