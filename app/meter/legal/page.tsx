import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'P402 Meter · Legal M&A Due Diligence (Coming Soon)',
  description: 'Per-matter AI contract review with model-tier routing, budget caps, and onchain audit trail. Coming soon.',
};

export default function LegalDemoPage() {
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-50">

      {/* Top bar */}
      <div className="border-b-2 border-neutral-700 px-6 py-3 flex items-center justify-between">
        <Link href="/meter" className="text-xs font-mono text-neutral-400 uppercase tracking-widest hover:text-primary transition-colors">
          ← P402 Meter
        </Link>
        <div className="flex items-center gap-3">
          <span className="border border-primary px-2 py-0.5 text-[10px] font-mono text-primary uppercase tracking-wider">
            Tempo Mainnet · MPP
          </span>
          <span className="border border-neutral-700 px-2 py-0.5 text-[10px] font-mono text-neutral-500 uppercase">
            Legal · M&A Diligence
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-24 flex flex-col gap-10 items-start">

        <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
          {'>'} _ P402 METER · LEGAL · IN DEVELOPMENT
        </div>

        <h1 className="text-4xl lg:text-5xl font-bold uppercase tracking-tight leading-none">
          M&A Due Diligence<br />
          Contract Review.<br />
          <span className="text-primary">Coming Soon.</span>
        </h1>

        <div className="border-2 border-neutral-700 p-6 flex flex-col gap-4 w-full max-w-xl">
          <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">What this demo will show</div>
          <div className="flex flex-col gap-2 text-[11px] font-mono text-neutral-400 leading-relaxed">
            {[
              'Upload a data room of 5–10 synthetic contracts (NDAs, MSAs, employment agreements)',
              'P402 routes each document to the right model tier — Flash for simple, Pro for complex',
              'The routing decision is visible: complexity score, model selected, cost, rationale',
              'Cross-document conflict detection surfaces inconsistencies across the full data room',
              'Per-matter cost readout broken down by document and by model tier',
              'Specialist escalation for complex contracts under MPP escrow',
              'Approval gate with ABA Formal Opinion 512 compliant audit artifact',
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-neutral-700 shrink-0">{String(i + 1).padStart(2, '0')}.</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full">
          {[
            { value: '&lt;$0.10', label: 'Per matter', sub: '8 contracts' },
            { value: '1,000×+', label: 'Cost delta', sub: 'vs paralegal time' },
            { value: '2 tiers', label: 'Model routing', sub: 'Flash + Pro' },
          ].map(({ value, label, sub }) => (
            <div key={label} className="border border-neutral-700 p-4 flex flex-col gap-1">
              <div className="text-2xl font-bold text-neutral-500 tabular-nums" dangerouslySetInnerHTML={{ __html: value }} />
              <div className="text-xs font-bold uppercase tracking-wider text-neutral-600">{label}</div>
              <div className="text-[10px] font-mono text-neutral-700">{sub}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-4 flex-wrap">
          <Link href="/meter/about/legal" className="btn btn-primary text-sm px-6 py-2">
            Read Case Study →
          </Link>
          <Link href="/meter/healthcare" className="btn btn-secondary text-sm px-6 py-2">
            Healthcare Demo (Live) →
          </Link>
          <Link href="/meter" className="btn btn-secondary text-sm px-6 py-2">
            All Demos
          </Link>
        </div>

      </div>
    </div>
  );
}
