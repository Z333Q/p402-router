import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Legal M&A Due Diligence · P402 Meter',
  description:
    'P402 Meter legal case study: per-matter AI contract review with model-tier routing, budget caps, and ABA-compliant audit trails. Under $0.10 per matter vs $200–800 paralegal time.',
};

export default function LegalAboutPage() {
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-50">

      {/* Top bar */}
      <div className="border-b-2 border-neutral-700 px-6 py-3 flex items-center justify-between">
        <Link href="/meter/about" className="text-xs font-mono text-neutral-400 uppercase tracking-widest hover:text-primary transition-colors">
          ← P402 Meter
        </Link>
        <div className="flex items-center gap-3">
          <span className="border border-neutral-700 px-2 py-0.5 text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
            Legal · M&A Diligence
          </span>
          <span className="border border-neutral-700 px-2 py-0.5 text-[10px] font-mono text-neutral-600 uppercase">
            Demo coming soon
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16 flex flex-col gap-20">

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
            {'>'} _ P402 METER · LEGAL · M&A DUE DILIGENCE CONTRACT REVIEW
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold uppercase tracking-tight leading-none">
            Every contract<br />
            reviewed.<br />
            <span className="text-primary">Every cent tracked.</span>
          </h1>
          <p className="text-base font-bold text-neutral-50 max-w-2xl leading-relaxed">
            M&A due diligence involves hundreds of contracts. The AI that reads them has a
            measurable cost per document. P402 makes that cost visible, governed, and settled
            onchain — per contract, per clause, per model tier.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="border-2 border-primary text-primary text-xs font-bold font-mono px-3 py-1.5">
              &lt;$0.10 per matter
            </span>
            <span className="border-2 border-neutral-700 text-neutral-400 text-xs font-mono px-3 py-1.5">
              vs $200–800 paralegal time per matter
            </span>
            <span className="border-2 border-neutral-700 text-neutral-400 text-xs font-mono px-3 py-1.5">
              ABA Formal Opinion 512 compliant audit trail
            </span>
          </div>
          <div className="flex gap-4 flex-wrap">
            <Link href="/meter/legal" className="btn btn-secondary text-sm px-6 py-2 opacity-50 cursor-not-allowed">
              Demo Coming Soon
            </Link>
            <Link href="/meter/about" className="btn btn-secondary text-sm px-6 py-2">
              ← All Industries
            </Link>
          </div>
        </section>

        {/* ── The Problem ───────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="01" label="The Problem" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            Legal AI has a cost attribution problem.
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ProblemCard
              stat="$150–500"
              label="Manual contract abstraction cost per document"
              detail="Traditional paralegal or associate time to read, extract key terms, and flag deviations from a playbook. Complex MSAs and employment agreements can exceed $500 each."
            />
            <ProblemCard
              stat="200–500"
              label="Contracts in a typical M&A data room"
              detail="NDAs, MSAs, employment agreements, real estate leases, vendor SaaS contracts, amendments. A mid-market deal can mean $30K–$250K in diligence review costs."
            />
            <ProblemCard
              stat="$0"
              label="Cost visibility per document in existing AI tools"
              detail="Current legal AI platforms (Harvey, Spellbook, Ironclad) charge per seat or per month. There is no per-document, per-model-tier, per-clause cost breakdown. The billing is as opaque as the AI."
            />
            <ProblemCard
              stat="0"
              label="Per-matter settlement rails that work at sub-cent scale"
              detail="If you want to charge a client for AI-assisted diligence at actual cost, you need a settlement rail that handles $0.003 per document. Stripe cannot. Ethereum cannot. Tempo can."
            />
          </div>
        </section>

        {/* ── The Workflow ──────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="02" label="The Workflow" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            Six steps. One matter. Full audit trail.
          </h2>
          {[
            {
              step: '01',
              name: 'Project intake',
              detail: 'Upload a "data room" of 5–10 sample contracts: NDAs, MSAs, employment agreements, a real estate side letter, a vendor SaaS contract, amendments. Each gets a SHA-256 hash on ingestion.',
            },
            {
              step: '02',
              name: 'Per-document classification and routing',
              detail: 'Gemini Flash classifies each document: type, jurisdiction, redline complexity score (1–10). The P402 router uses the complexity score to route — simple NDAs get Flash, MSAs get Pro, ambiguous documents escalate. The routing decision is the visible thing in this demo.',
            },
            {
              step: '03',
              name: 'Multi-document agentic review',
              detail: 'Gemini Flash handles simple contracts (NDA clause extraction, standard deviation flags). Gemini Pro handles complex ones (MSA negotiation history, employment agreement non-competes, cross-document conflict detection). Each review event writes a ledger entry with the model tier used and the cost.',
            },
            {
              step: '04',
              name: 'Cost-per-matter readout',
              detail: 'Running USDC.e cost broken down by document, by model tier. The Stripe comparison is reframed for legal: "what would this matter cost if every clause review were a separate Stripe charge?" ($0.30 × 400 clause extractions = $120 in Stripe fees alone.)',
            },
            {
              step: '05',
              name: 'Specialist escalation under MPP escrow',
              detail: 'When a contract exceeds a complexity threshold, P402 routes to a "specialist agent" with a budget envelope locked in MPP escrow. The specialist produces a conflict analysis report. A cryptographic hash of the deliverable is recorded on Tempo.',
            },
            {
              step: '06',
              name: 'Matter close and approval gate',
              detail: 'The supervising lawyer reviews the AI assessment and approves or rejects the diligence summary. P402 records the decision. The final ledger is the ABA-audit artifact — every AI action, every cost, every model tier, timestamped and onchain.',
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
            Routing is the headline. Cost transparency is the buyer value.
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <MetricCard
              value="&lt;$0.10"
              label="Total per matter"
              sublabel="8 contracts, full extraction"
              highlight
            />
            <MetricCard
              value="1,000×+"
              label="Cost delta vs manual"
              sublabel="$0.10 AI vs $200–800 paralegal"
            />
            <MetricCard
              value="2 tiers"
              label="Model routing in action"
              sublabel="Flash for NDAs · Pro for MSAs"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FacetCard
              label="Routing decisions are the visible thing"
              detail="This is the demo where you see the router actually picking different models for different documents and saving money. Each document card shows: type, complexity score, model assigned, cost, and why."
            />
            <FacetCard
              label="Budget caps per matter"
              detail="A senior partner sets a $50 cap for a tier-3 contract review. The cap is enforced. If projected cost exceeds the cap, the analysis is blocked before the model is invoked. The decision is logged."
            />
            <FacetCard
              label="Cost transparency is the buyer-visible value"
              detail="Law firms billing clients per matter need defensible per-matter unit economics. This demo produces exactly that: a cost receipt for AI-assisted diligence that can be passed through to the client."
            />
            <FacetCard
              label="ABA ethics audit trail"
              detail="ABA Formal Opinion 512 (2024) requires lawyers using AI to understand and supervise its work. The P402 ledger provides the documentation: what model, what input, what output, at what cost, with human review recorded."
            />
          </div>
        </section>

        {/* ── Unit Economics ────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="04" label="Unit Economics" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            The 1,000× delta is the headline.
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="border-2 border-neutral-700 p-4 flex flex-col gap-2">
              <div className="text-lg font-bold text-error tabular-nums">$200–800</div>
              <div className="text-xs font-bold uppercase tracking-wider text-neutral-50">Manual diligence per matter</div>
              <div className="text-[11px] font-mono text-neutral-400 leading-relaxed">
                8 contracts × $25–100 per contract = associate/paralegal time for a mid-market deal data room.
              </div>
            </div>
            <div className="border-2 border-primary p-4 flex flex-col gap-2">
              <div className="text-lg font-bold text-primary tabular-nums">&lt;$0.10</div>
              <div className="text-xs font-bold uppercase tracking-wider text-neutral-50">AI-metered diligence per matter</div>
              <div className="text-[11px] font-mono text-neutral-400 leading-relaxed">
                Gemini Flash for simple contracts + Pro for complex ones + Tempo settlement. Every cent tracked per document.
              </div>
            </div>
            <div className="border-2 border-neutral-700 p-4 flex flex-col gap-2">
              <div className="text-lg font-bold text-success tabular-nums">Per-model billing</div>
              <div className="text-xs font-bold uppercase tracking-wider text-neutral-50">Flash vs Pro cost breakdown</div>
              <div className="text-[11px] font-mono text-neutral-400 leading-relaxed">
                Simple NDA: ~$0.003 (Flash). Complex MSA: ~$0.018 (Pro). The model tier is visible in the ledger.
              </div>
            </div>
          </div>
        </section>

        {/* ── Sample matter ─────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="05" label="Sample Matter" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            Acme acquires Beta Co. — synthetic diligence pack.
          </h2>
          <p className="font-mono text-neutral-400 text-sm leading-relaxed">
            All documents are synthetic, de-identified, and clearly marked SAMPLE. No real entity names.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 font-mono text-xs">
            {[
              ['NDA — Mutual (Acme / Beta)', 'Complexity 2 · Flash · ~$0.003'],
              ['NDA — Unilateral (Acme / Vendor)', 'Complexity 2 · Flash · ~$0.003'],
              ['Master Services Agreement (Beta / SaaS)', 'Complexity 7 · Pro · ~$0.018'],
              ['Employment Agreement (Beta CTO)', 'Complexity 6 · Pro · ~$0.016'],
              ['Real Estate Side Letter (Beta HQ Lease)', 'Complexity 5 · Pro · ~$0.013'],
              ['Vendor SaaS Contract (Beta / Salesforce)', 'Complexity 4 · Flash → escalate · ~$0.008'],
              ['Amendment #1 to MSA', 'Complexity 3 · Flash · ~$0.005'],
              ['Amendment #2 to MSA', 'Complexity 3 · Flash · ~$0.005'],
            ].map(([doc, meta]) => (
              <div key={doc} className="border border-neutral-700 px-3 py-2 flex flex-col gap-0.5">
                <span className="text-neutral-300 font-bold">{doc}</span>
                <span className="text-neutral-600">{meta}</span>
              </div>
            ))}
          </div>
          <div className="border border-neutral-700 px-4 py-2 text-[10px] font-mono text-neutral-500">
            Total estimated matter cost: ~$0.071 · vs $200–800 manual · Model cost breakdown visible per document in ledger
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────────────── */}
        <section className="border-2 border-neutral-700 p-8 flex flex-col gap-4">
          <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">Coming soon</div>
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            The legal demo is in development.
          </h2>
          <p className="font-mono text-neutral-400 leading-relaxed max-w-xl">
            The infrastructure is built. The routing logic, ledger, and Tempo settlement
            are identical to the live healthcare demo. The legal-specific components — document
            classifier, clause extractor, conflict detector — are next.
          </p>
          <div className="flex gap-4 flex-wrap mt-2">
            <Link href="/meter/healthcare" className="btn btn-primary text-sm px-8 py-3">
              See Healthcare Demo → (Live Now)
            </Link>
            <Link href="/meter/about" className="btn btn-secondary text-sm px-8 py-3">
              All Industries
            </Link>
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-neutral-700 pt-6 flex items-center justify-between text-[10px] font-mono text-neutral-600 uppercase tracking-wider flex-wrap gap-3">
          <span>P402 Meter · Legal · Tempo Mainnet · MPP</span>
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
        <span className="text-primary mt-0.5 shrink-0">→</span>
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-50">{label}</span>
      </div>
      <p className="text-[11px] font-mono text-neutral-400 leading-relaxed pl-4">{detail}</p>
    </div>
  );
}
