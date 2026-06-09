import type { Metadata } from 'next';
import Link from 'next/link';
import { SCENARIO_META } from '@/lib/demo/scenarios';

export const metadata: Metadata = {
  title: 'Real Estate Tenant Screening · P402 Meter',
  description:
    'P402 Meter real estate case study: multimodal AI tenant application screening with fraud signal surfacing, per-applicant cost at sub-penny scale, and a HUD fair-housing audit posture. Human reviewer makes the final decision.',
};

export default function RealEstateAboutPage() {
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-50">

      {/* Top bar */}
      <div className="border-b-2 border-neutral-700 px-6 py-3 flex items-center justify-between">
        <Link href="/meter/about" className="text-xs font-mono text-neutral-400 uppercase tracking-widest hover:text-primary transition-colors">
          P402 Meter
        </Link>
        <div className="flex items-center gap-3">
          <span className="border border-neutral-700 px-2 py-0.5 text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
            Real Estate · Tenant Screening
          </span>
          <span className="border border-success px-2 py-0.5 text-[10px] font-mono text-success uppercase">
            Live demo
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16 flex flex-col gap-20">

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
            {'>'} _ P402 METER · REAL ESTATE · TENANT APPLICATION SCREENING
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold uppercase tracking-tight leading-none">
            Every applicant<br />
            screened.<br />
            <span className="text-primary">Every cent visible.</span>
          </h1>
          <p className="text-base font-bold text-neutral-50 max-w-2xl leading-relaxed">
            Property managers process thousands of applications. The AI that reads them costs
            roughly $0.02 to $0.05 per applicant. P402 makes that cost visible, governed by
            fair-housing rules, and settled onchain: one Tempo tx per application batch.
          </p>
          <div className="flex flex-wrap gap-2">
            {SCENARIO_META.real_estate_tenant_screening.safety_labels.map((label) => (
              <span key={label} className="border-2 border-neutral-600 text-neutral-300 text-[10px] font-mono uppercase tracking-wide px-3 py-1.5">
                {label}
              </span>
            ))}
          </div>
          <p className="text-[11px] font-mono text-neutral-500 leading-relaxed">
            <span className="text-neutral-200 font-extrabold">Human final decision required.</span> {SCENARIO_META.real_estate_tenant_screening.framing_disclaimer}
          </p>
          <div className="flex gap-4 flex-wrap">
            <Link href="/dashboard?demo=1&scenario=real_estate_tenant_screening" className="btn btn-primary text-sm px-6 py-2">
              View dashboard proof
            </Link>
            <Link href="/dashboard/prove?demo=1&scenario=real_estate_tenant_screening" className="btn btn-secondary text-sm px-6 py-2">
              See evidence
            </Link>
            <Link href="/meter/real-estate" className="btn btn-secondary text-sm px-6 py-2">
              Run screening demo
            </Link>
            <Link href="/meter/about" className="btn btn-secondary text-sm px-6 py-2">
              All industries
            </Link>
          </div>
        </section>

        {/* ── The Problem ───────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="01" label="The Problem" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            Tenant screening is high-volume, document-heavy, and legally adversarial.
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ProblemCard
              stat="Legacy"
              label="Operating cost per applicant in the legacy workflow"
              detail="Background check fees plus human review time for income verification and reference checking add up to a materially higher per-applicant cost than the AI-metered path; the exact figure depends on the property and the service mix."
            />
            <ProblemCard
              stat="Real"
              label="Document fraud in rental applications is a scaled problem"
              detail="Falsified bank statements and pay stubs are a real, scaled problem in rental applications. AI document review surfaces likely inconsistencies for a human reviewer; the property manager makes the final call."
            />
            <ProblemCard
              stat="$0"
              label="Per-applicant cost breakdown in current AI screening tools"
              detail="Existing AI screening platforms (Snappt, MeasureOne) charge per-seat or per-unit. There is no per-applicant AI cost breakdown. Property managers cannot see what the AI actually did or what it cost."
            />
            <ProblemCard
              stat="0"
              label="Settlement rails for sub-penny per-applicant billing"
              detail="If you want to charge $0.03 for an AI-assisted tenant screening, you need a settlement rail that handles $0.03. Stripe's per-transaction floor is well above that level. Tempo settles for under $0.000001 per event."
            />
          </div>
        </section>

        {/* ── The Workflow ──────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="02" label="The Workflow" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            Six steps. One applicant packet. Full audit trail.
          </h2>
          {[
            {
              step: '01',
              name: 'Application intake (multimodal)',
              detail: 'Upload an applicant packet: rental application form (PNG of a filled-out form), 2 pay stubs (PDFs), 1 bank statement (PDF), 1 ID document (image). Each document is SHA-256 hashed on ingestion. This is the multimodal intake test.',
            },
            {
              step: '02',
              name: 'Structured extraction',
              detail: 'Gemini Flash reads all four documents multimodally. Extracts: claimed income, employer name, employment duration, bank account holder, deposit history, address history, ID name match. Returns a typed Applicant object with a confidence score per field.',
            },
            {
              step: '03',
              name: 'Cross-document consistency check',
              detail: 'Gemini Pro reasons across all four documents simultaneously: does claimed income match pay stubs? Do bank deposits match claimed income? Does the ID name match the application? Does the address on the bank statement match the rental application? Each check produces a consistency flag.',
            },
            {
              step: '04',
              name: 'Fraud signal and escalation',
              detail: 'If the anomaly score crosses a threshold (inconsistent income, metadata manipulation detected, name mismatch), the application is flagged for escalation. In the current demo, this surfaces the case to the human reviewer with Gemini Pro extended-reasoning analysis attached; a future capability will route the case to a specialist agent under MPP escrow.',
            },
            {
              step: '05',
              name: 'Per-applicant cost readout',
              detail: 'Every screening costs roughly $0.02 to $0.05 in tokens. The ledger shows: extraction cost (Flash), consistency check cost (Pro), and any escalated review cost (Pro). The total is visible per applicant and aggregatable across a property.',
            },
            {
              step: '06',
              name: 'Decision gate: human in the loop',
              detail: 'The property manager reviews the AI assessment and approves or denies. P402 records the decision without recording PII; only a redacted applicant ID is stored onchain. The decision log supports a HUD fair-housing and ECOA audit posture; the property manager makes the final decision and the audit log does not replace fair-housing compliance.',
            },
          ].map(({ step, name, detail }) => (
            <div key={step} className="border border-neutral-700 flex">
              <div className="flex-shrink-0 w-12 flex items-center justify-center border-r border-neutral-700 bg-neutral-800">
                <span className="text-primary font-bold font-mono text-sm">{step}</span>
              </div>
              <div className="p-4 flex flex-col gap-1">
                <div className="text-sm font-bold text-neutral-50">{name}</div>
                <div className="text-[11px] font-mono text-neutral-400 leading-relaxed">{detail}</div>
              </div>
            </div>
          ))}
        </section>

        {/* ── What this demo emphasizes ─────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="03" label="What This Demo Emphasizes" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            Volume economics. Fraud signal surfacing. Fair-housing audit posture.
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <MetricCard value="$0.03" label="Avg per applicant" sublabel="clean application, no escalation" highlight />
            <MetricCard value="Per-app" label="Cost visible per application" sublabel="legacy workflow operating cost is materially higher" />
            <MetricCard value="4 docs" label="Multimodal intake" sublabel="form, pay stubs, bank stmt, ID" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FacetCard
              label="Multimodal volume economics"
              detail="Property managers screen thousands of applications per year. At $0.03 per applicant, 1,000 applications cost roughly $30 in AI compute; the operating cost in the legacy workflow is materially higher. The economics are not marginal."
            />
            <FacetCard
              label="A2A escrow as a real workflow"
              detail="The fraud specialist escalation is a future capability: a different agent doing a different job under a different budget envelope. The workflow naturally produces it; the current page surfaces the escalated case for a human reviewer."
            />
            <FacetCard
              label="Fair-housing governance"
              detail="The audit trail is load-bearing because tenant screening decisions are legally adversarial. P402 records what AI did, what data it used, what score it produced, and what the human decided, with consistent criteria applied to every applicant."
            />
            <FacetCard
              label="Three applicant scenarios"
              detail="Clean applicant (passes all checks). Income mismatch (low fraud score, manual review flagged). Likely fraud (forged pay stub triggers escalation; specialist agent under MPP escrow is a future capability). Each scenario exercises a different path through the system."
            />
          </div>
        </section>

        {/* ── Sample scenarios ──────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="04" label="Sample Applicant Scenarios" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            Three scenarios. Three paths through the system.
          </h2>
          <div className="flex flex-col gap-4">
            {[
              {
                scenario: 'Clean Applicant',
                label: 'All checks pass',
                color: 'border-success text-success',
                cost: '~$0.022',
                path: 'Flash extraction, then Pro consistency check; all fields consistent; no fraud signal; property manager approves',
                detail: 'Income matches pay stubs. Bank deposits match claimed income. ID name matches application. Address consistent across all four documents. Confidence score: 0.94.',
              },
              {
                scenario: 'Income Mismatch',
                label: 'Low fraud, manual review flagged',
                color: 'border-warning text-warning',
                cost: '~$0.031',
                path: 'Flash extraction, then Pro consistency check; income flag; anomaly score 0.42; manual review recommended; property manager reviews',
                detail: 'Claimed income $95K. Pay stubs show $72K annualized. Bank deposits inconsistent with either figure. Not clear fraud; could be freelance income or recent job change. Flagged for human review.',
              },
              {
                scenario: 'Likely Fraud',
                label: 'Specialist escalation triggered',
                color: 'border-error text-error',
                cost: '~$0.065',
                path: 'Flash extraction, then Pro consistency check; anomaly score 0.87; escalation surfaced to reviewer (specialist agent under MPP escrow is a future capability); deliverable hash on Tempo; property manager denies',
                detail: 'Pay stub metadata shows creation date after claimed employment period. Bank statement deposit pattern inconsistent with claimed pay schedule. Gemini Pro forensic analysis confirms document manipulation indicators.',
              },
            ].map(({ scenario, label, color, cost, path, detail }) => (
              <div key={scenario} className={`border-2 ${color.split(' ')[0]} p-5 flex flex-col gap-3`}>
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <div className={`text-xs font-bold uppercase tracking-wider ${color.split(' ')[1]}`}>{scenario}</div>
                    <div className="text-[10px] font-mono text-neutral-500 mt-0.5">{label}</div>
                  </div>
                  <span className={`text-lg font-bold font-mono tabular-nums ${color.split(' ')[1]}`}>{cost}</span>
                </div>
                <div className="text-[10px] font-mono text-neutral-500 border-l-2 border-neutral-700 pl-3 leading-relaxed">
                  {path}
                </div>
                <p className="text-[11px] font-mono text-neutral-400 leading-relaxed">{detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Unit Economics ────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="05" label="Unit Economics" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            Scale is where the economics become undeniable.
          </h2>
          <div className="border border-neutral-700 p-5 font-mono text-[11px]">
            <div className="grid grid-cols-3 gap-4 mb-3 text-neutral-600 text-[9px] uppercase tracking-wider">
              <span>Volume</span>
              <span>Manual screening cost</span>
              <span>P402 AI screening cost</span>
            </div>
            {[
              ['100 apps / month', 'Legacy: materially higher', '~$3'],
              ['500 apps / month', 'Legacy: materially higher', '~$15'],
              ['2,000 apps / month', 'Legacy: materially higher', '~$60'],
              ['10,000 apps / month', 'Legacy: materially higher', '~$300'],
            ].map(([vol, manual, ai]) => (
              <div key={vol} className="grid grid-cols-3 gap-4 py-2 border-t border-neutral-800">
                <span className="text-neutral-300">{vol}</span>
                <span className="text-error">{manual}</span>
                <span className="text-primary">{ai}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] font-mono text-neutral-500 leading-relaxed">
            Cost includes Gemini Flash extraction, Gemini Pro consistency check, and Tempo settlement.
            Escalated fraud cases add ~$0.04 per flagged application. Assumes 10% fraud escalation rate.
          </p>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────────────── */}
        <section className="border-2 border-primary p-8 flex flex-col gap-4">
          <div className="text-[10px] font-mono text-primary uppercase tracking-wider">See it live</div>
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            The demo is the proof.
          </h2>
          <p className="font-mono text-neutral-400 leading-relaxed max-w-xl">
            Three synthetic applicant scenarios (clean, mismatch, and likely fraud). Multimodal
            intake across application form, pay stubs, bank statement, and ID. Cross-document
            consistency check. Fraud score with escalation threshold. Real USDC.e settlement on
            Tempo. HUD fair-housing audit posture on every decision; the property manager makes the final call.
          </p>
          <div className="flex gap-4 flex-wrap mt-2">
            <Link href="/meter/real-estate" className="btn btn-primary text-sm px-8 py-3">
              Run screening demo
            </Link>
            <a
              href="https://explore.tempo.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary text-sm px-8 py-3"
            >
              Verify on Tempo
            </a>
            <Link href="/meter/about" className="btn btn-secondary text-sm px-8 py-3">
              All Industries
            </Link>
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-neutral-700 pt-6 flex items-center justify-between text-[10px] font-mono text-neutral-600 uppercase tracking-wider flex-wrap gap-3">
          <span>P402 Meter · Real Estate · Tempo Mainnet · MPP</span>
          <span>Tempo × MPP × Gemini 3.1</span>
        </div>

      </div>
    </div>
  );
}

function SectionLabel({ number, label }: { number: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="border-2 border-primary text-primary text-[10px] font-bold font-mono px-2 py-0.5 uppercase">
        {number}
      </span>
      <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">{label}</span>
    </div>
  );
}

function ProblemCard({ stat, label, detail }: { stat: string; label: string; detail: string }) {
  return (
    <div className="border-2 border-neutral-700 p-4 flex flex-col gap-2">
      <div className="text-2xl font-bold text-error tabular-nums">{stat}</div>
      <div className="text-xs font-bold uppercase tracking-wider text-neutral-50">{label}</div>
      <div className="text-[11px] font-mono text-neutral-400 leading-relaxed">{detail}</div>
    </div>
  );
}

function MetricCard({ value, label, sublabel, highlight }: {
  value: string; label: string; sublabel: string; highlight?: boolean;
}) {
  return (
    <div className={`border-2 p-4 flex flex-col gap-1 ${highlight ? 'border-primary' : 'border-neutral-700'}`}>
      <div className={`text-3xl font-bold tabular-nums ${highlight ? 'text-primary' : 'text-neutral-50'}`}>{value}</div>
      <div className="text-xs font-bold uppercase tracking-wider text-neutral-50">{label}</div>
      <div className="text-[10px] font-mono text-neutral-500">{sublabel}</div>
    </div>
  );
}

function FacetCard({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="border border-neutral-700 p-4 flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <span className="text-primary mt-0.5 shrink-0">·</span>
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-50">{label}</span>
      </div>
      <p className="text-[11px] font-mono text-neutral-400 leading-relaxed pl-4">{detail}</p>
    </div>
  );
}
