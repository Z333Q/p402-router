'use client';

export function PayerContextPanel() {
  return (
    <section className="border-2 border-neutral-700 p-6 flex flex-col gap-3">
      <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
        Built for
      </div>
      <h2 className="text-2xl font-bold text-neutral-50 leading-tight">
        A multi-state government-program health plan
      </h2>
      <p className="text-sm text-neutral-300 leading-relaxed max-w-3xl">
        This demo models prior authorization support for a Medicaid-first health plan operating
        across state programs, provider networks, clinical review queues, appeals, audit requests,
        and federal reporting requirements.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
        {[
          ['Lines of business', 'Medicaid · D-SNP · Marketplace · CHIP-adjacent'],
          ['Buyer', 'VP UM · Director PA · CMO staff · Compliance'],
          ['Primary pain', 'PA volume · state rules · decision clocks · audit burden'],
          ['Proof point', 'Per-operation cost attribution + reviewer governance'],
        ].map(([k, v]) => (
          <div key={k} className="border border-neutral-700 p-3">
            <div className="text-[9px] font-mono uppercase tracking-widest text-neutral-500 mb-1">
              {k}
            </div>
            <div className="text-xs text-neutral-200 leading-snug">{v}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
