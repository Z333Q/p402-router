'use client';

import { useGovernance } from '../_store/useGovernance';
import { budgetStatus } from '@/lib/meter/healthcare/governance';

interface Row {
  label: string;
  spent: number;
  cap: number;
  format?: (n: number) => string;
}

function fmtUsd(n: number): string {
  if (n >= 100) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

function Bar({ label, spent, cap, format = fmtUsd }: Row) {
  const status = budgetStatus(spent, cap);
  const pct = cap > 0 ? Math.min(100, (spent / cap) * 100) : 0;
  const barColor =
    status === 'blocked'
      ? 'bg-error'
      : status === 'warning'
        ? 'bg-warning'
        : 'bg-primary';
  const borderColor =
    status === 'blocked'
      ? 'border-error'
      : status === 'warning'
        ? 'border-warning'
        : 'border-neutral-700';

  return (
    <div className={`border ${borderColor} p-2 flex flex-col gap-1`}>
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
          {label}
        </span>
        <span className="text-[10px] font-mono text-neutral-300">
          {format(spent)} / {format(cap)}
        </span>
      </div>
      <div className="h-1.5 bg-neutral-800 w-full">
        <div className={`h-1.5 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span
        className={`text-[9px] font-mono uppercase tracking-widest ${
          status === 'blocked'
            ? 'text-error'
            : status === 'warning'
              ? 'text-warning'
              : 'text-success'
        }`}
      >
        {status}
      </span>
    </div>
  );
}

export function ClientBudgetControls() {
  const { hierarchy } = useGovernance();
  const agents = Object.entries(hierarchy.agentCapsUsd);

  return (
    <section className="border-2 border-neutral-700 p-6 flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-neutral-50 uppercase tracking-tight">
          Client Budget Controls
        </h2>
        <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
          Synthetic demo values
        </span>
      </div>
      <p className="text-xs text-neutral-400 leading-relaxed">
        Budgets are controlled at the client, line-of-business, workflow, case, and agent level.
        Receipts prove individual operations.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Bar
          label="Client (monthly)"
          spent={hierarchy.currentSpendUsd.client}
          cap={hierarchy.clientMonthlyBudgetUsd}
        />
        <Bar
          label="Medicaid UM (monthly)"
          spent={hierarchy.currentSpendUsd.lineOfBusiness}
          cap={hierarchy.lineOfBusinessBudgetUsd}
        />
        <Bar
          label="PA Workflow (monthly)"
          spent={hierarchy.currentSpendUsd.workflow}
          cap={hierarchy.workflowBudgetUsd}
        />
        <Bar
          label="Current Case"
          spent={hierarchy.currentSpendUsd.case}
          cap={hierarchy.caseCapUsd}
        />
      </div>

      <div className="border-t border-neutral-700 pt-3">
        <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2">
          Per-agent caps
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {agents.map(([agent, cap]) => (
            <Bar
              key={agent}
              label={agent}
              spent={hierarchy.currentSpendUsd.agents[agent] ?? 0}
              cap={cap}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
