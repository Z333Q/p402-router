'use client';

export function HealthcareHero() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-4xl lg:text-5xl font-bold leading-tight text-neutral-50 mb-4">
        Metered AI governance for<br />
        <span className="text-primary">Medicaid managed care utilization review</span>
      </h1>
      <p className="text-base text-neutral-300 leading-relaxed mb-6">
        Assist prior authorization review with per-action AI cost attribution, human approval gates,
        decision-clock tracking, denial-reason evidence, and audit-ready proof for state and federal
        oversight.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { label: 'Medicaid MCO Demo', primary: true },
          { label: 'Synthetic Records Only' },
          { label: 'Human Review Required' },
          { label: 'CMS-0057-F Ready' },
          { label: 'HIPAA-Aligned Demo Mode' },
          { label: 'Operation Receipts' },
          { label: 'Client Budget Controls' },
          { label: 'Tempo Mainnet Settlement' },
        ].map((b) => (
          <span
            key={b.label}
            className={`border-2 text-xs font-bold font-mono px-3 py-1.5 ${
              b.primary
                ? 'border-primary text-primary'
                : 'border-neutral-600 text-neutral-300'
            }`}
          >
            {b.label}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <a href="#demo" className="btn btn-primary text-sm px-5">
          Run Medicaid PA Demo →
        </a>
        <a href="#compliance-trace" className="btn btn-secondary text-sm">
          View Compliance Trace
        </a>
        <a href="/meter/about/healthcare" className="btn btn-secondary text-sm">
          About
        </a>
        <a href="/meter" className="btn btn-secondary text-sm">
          ← All Demos
        </a>
      </div>
    </div>
  );
}
