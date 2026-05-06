import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'P402 Meter · Real Estate Tenant Screening (Coming Soon)',
  description: 'Multimodal AI tenant application screening with fraud detection, per-applicant cost at sub-penny scale. Coming soon.',
};

export default function RealEstateDemoPage() {
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
            Real Estate · Tenant Screening
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-24 flex flex-col gap-10 items-start">

        <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
          {'>'} _ P402 METER · REAL ESTATE · IN DEVELOPMENT
        </div>

        <h1 className="text-4xl lg:text-5xl font-bold uppercase tracking-tight leading-none">
          Tenant Application<br />
          Screening.<br />
          <span className="text-primary">Coming Soon.</span>
        </h1>

        <div className="border-2 border-neutral-700 p-6 flex flex-col gap-4 w-full max-w-xl">
          <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">What this demo will show</div>
          <div className="flex flex-col gap-2 text-[11px] font-mono text-neutral-400 leading-relaxed">
            {[
              'Upload an applicant packet: rental form (PNG), pay stubs (PDFs), bank statement, ID image',
              'Gemini Flash multimodal extraction: income, employment, address, name — all four documents',
              'Gemini Pro cross-document consistency check: does claimed income match pay stubs and deposits?',
              'Fraud signal scoring — anomaly above threshold triggers specialist escalation under MPP escrow',
              'Specialist agent runs forensic check with extended reasoning; deliverable hash recorded on Tempo',
              'Per-applicant cost readout: extraction + consistency check + fraud escalation broken out',
              'Three pre-loaded scenarios: clean applicant, income mismatch, likely fraud',
              'Decision gate: property manager approves or denies with HUD-compliant audit trail',
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
            { value: '$0.03', label: 'Per applicant', sub: 'clean application' },
            { value: '600–2,400×', label: 'Cost delta', sub: 'vs manual screening' },
            { value: '4 docs', label: 'Multimodal', sub: 'form · stubs · bank · ID' },
          ].map(({ value, label, sub }) => (
            <div key={label} className="border border-neutral-700 p-4 flex flex-col gap-1">
              <div className="text-2xl font-bold text-neutral-500 tabular-nums">{value}</div>
              <div className="text-xs font-bold uppercase tracking-wider text-neutral-600">{label}</div>
              <div className="text-[10px] font-mono text-neutral-700">{sub}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-4 flex-wrap">
          <Link href="/meter/about/real-estate" className="btn btn-primary text-sm px-6 py-2">
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
