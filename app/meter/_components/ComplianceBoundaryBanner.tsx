'use client';

export function ComplianceBoundaryBanner() {
  return (
    <div className="border-2 border-neutral-700 bg-neutral-900 px-4 py-3 flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">What this proves</span>
        <span className="text-xs font-mono text-neutral-300">
          AI compute can be metered, priced, and settled at token granularity —
          making <span className="text-primary font-bold">per-action billing economically viable</span> for the first time.
        </span>
      </div>
      <div className="flex items-center gap-4 text-[10px] font-mono text-neutral-500 uppercase tracking-widest whitespace-nowrap">
        <span className="border border-neutral-700 px-2 py-0.5">De-identified</span>
        <span className="border border-neutral-700 px-2 py-0.5">No PHI</span>
        <span className="border border-neutral-700 px-2 py-0.5">Admin Only</span>
      </div>
    </div>
  );
}
