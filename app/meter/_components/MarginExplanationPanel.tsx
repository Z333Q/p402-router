'use client';

import { ARC_TYPICAL_GAS_COST_USDC } from '@/lib/chains/arc';

interface CostRow {
  network: string;
  gasCost: string;
  aiCost: string;
  totalPerAction: string;
  viable: boolean;
}

const COST_ROWS: CostRow[] = [
  {
    network: 'Ethereum Mainnet (30 gwei)',
    gasCost: '~$2.85',
    aiCost: '~$0.0003',
    totalPerAction: '~$2.85',
    viable: false,
  },
  {
    network: 'Stripe (2.9% + $0.30 min)',
    gasCost: '$0.30 min',
    aiCost: '~$0.0003',
    totalPerAction: '~$0.30+',
    viable: false,
  },
  {
    network: 'Base L2 (typical)',
    gasCost: '~$0.02',
    aiCost: '~$0.0003',
    totalPerAction: '~$0.020',
    viable: false,
  },
  {
    network: `Arc Testnet (USDC gas)`,
    gasCost: `$${ARC_TYPICAL_GAS_COST_USDC.toFixed(3)} USDC`,
    aiCost: '~$0.0003',
    totalPerAction: '~$0.0063',
    viable: true,
  },
];

export function MarginExplanationPanel() {
  return (
    <div className="card p-0">
      <div className="section-header px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="badge badge-primary text-[10px]">⚡</span>
          <span className="text-sm font-bold text-neutral-50 uppercase tracking-wider">Why Arc works for per-step AI billing</span>
        </div>
        <div className="text-[10px] font-mono text-neutral-400 uppercase">
          Gateway-Based Micropayments · Arc Hackathon
        </div>
      </div>

      <div className="p-4 flex flex-col gap-6">
        {/* 3 verdict cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="border-2 border-error p-4 flex flex-col gap-2">
            <div className="text-sm font-bold text-neutral-50">Ethereum</div>
            <div className="text-2xl font-bold text-error">$2.85</div>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Settlement cost exceeds the AI work itself. Real-time per-token billing is structurally impossible.
            </p>
          </div>
          <div className="border-2 border-error p-4 flex flex-col gap-2">
            <div className="text-sm font-bold text-neutral-50">Stripe</div>
            <div className="text-2xl font-bold text-error">$0.30 min</div>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Minimum fee forces batching 300+ sub-cent actions. Real-time pricing is eliminated.
            </p>
          </div>
          <div className="border-2 border-primary p-4 flex flex-col gap-2">
            <div className="text-sm font-bold text-neutral-50">Arc</div>
            <div className="text-2xl font-bold text-primary">$0.006</div>
            <p className="text-sm text-neutral-300 leading-relaxed">
              Sub-cent settlement preserves real-time pricing. Every token chunk settles individually.
            </p>
          </div>
        </div>

        {/* Compact comparison table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b-2 border-neutral-700">
                <th className="text-left py-2 pr-4 text-neutral-400 uppercase text-[10px] tracking-wider font-normal">Network</th>
                <th className="text-right py-2 pr-4 text-neutral-400 uppercase text-[10px] tracking-wider font-normal">Settlement cost</th>
                <th className="text-right py-2 pr-4 text-neutral-400 uppercase text-[10px] tracking-wider font-normal">AI cost</th>
                <th className="text-right py-2 pr-4 text-neutral-400 uppercase text-[10px] tracking-wider font-normal">Total / action</th>
                <th className="text-right py-2 text-neutral-400 uppercase text-[10px] tracking-wider font-normal">Viable</th>
              </tr>
            </thead>
            <tbody>
              {COST_ROWS.map((row) => (
                <tr key={row.network} className={`border-b border-neutral-800 ${row.viable ? 'bg-neutral-800' : ''}`}>
                  <td className={`py-2 pr-4 ${row.viable ? 'text-neutral-50' : 'text-neutral-400'}`}>{row.network}</td>
                  <td className={`py-2 pr-4 text-right ${row.viable ? 'text-neutral-300' : 'text-neutral-400'}`}>{row.gasCost}</td>
                  <td className={`py-2 pr-4 text-right ${row.viable ? 'text-neutral-300' : 'text-neutral-400'}`}>{row.aiCost}</td>
                  <td className={`py-2 pr-4 text-right font-bold ${row.viable ? 'text-primary' : 'text-error'}`}>{row.totalPerAction}</td>
                  <td className={`py-2 text-right font-bold ${row.viable ? 'text-primary' : 'text-neutral-500'}`}>{row.viable ? '✓' : '✗'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Single closing sentence */}
        <p className="text-sm text-neutral-400 leading-relaxed border-l-4 border-primary pl-3">
          Arc is the first rail in this demo where settlement stays below the value of the individual AI action.
          <span className="text-neutral-500 ml-2 text-xs">ETH gas at 30 gwei, 65k gas per ERC-20 transfer. Numbers from live Arc testnet runs.</span>
        </p>

        {/* Circle infrastructure callout */}
        <div className="border border-neutral-700 px-4 py-3 flex flex-wrap items-start gap-x-4 gap-y-1">
          <div className="text-xs font-mono text-info uppercase tracking-wider whitespace-nowrap">
            Circle Infrastructure
          </div>
          <div className="text-sm text-neutral-400 leading-relaxed">
            Circle Developer-Controlled Wallets provision per-session spending accounts on <span className="text-neutral-200">ARC-TESTNET</span>.
            Circle Nanopayments handles sub-cent settlement.
            Circle Gateway domain <span className="text-neutral-200">26</span> verifies x402 payments on Arc.
          </div>
        </div>
      </div>
    </div>
  );
}
