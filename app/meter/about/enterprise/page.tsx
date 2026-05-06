import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Enterprise AI Cost Management · P402 Meter',
  description:
    'P402 Meter enterprise case study: per-employee, per-token, per-session AI cost attribution across departments and projects. Routing optimization, budget projections, and onchain audit trails for CFOs and CTOs.',
};

export default function EnterpriseAboutPage() {
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-50">

      {/* Top bar */}
      <div className="border-b-2 border-neutral-700 px-6 py-3 flex items-center justify-between">
        <Link href="/meter/about" className="text-xs font-mono text-neutral-400 uppercase tracking-widest hover:text-primary transition-colors">
          ← P402 Meter
        </Link>
        <div className="flex items-center gap-3">
          <span className="border border-info px-2 py-0.5 text-[10px] font-mono text-info uppercase tracking-wider">
            Enterprise · AI Cost Platform
          </span>
          <span className="border border-primary px-2 py-0.5 text-[10px] font-mono text-primary uppercase tracking-wider">
            Synthetic Demo Live
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16 flex flex-col gap-20">

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
            {'>'} _ P402 METER · ENTERPRISE · AI COST MANAGEMENT PLATFORM
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold uppercase tracking-tight leading-none">
            AI spend without<br />
            attribution<br />
            <span className="text-primary">is just noise.</span>
          </h1>
          <p className="text-base font-bold text-neutral-50 max-w-2xl leading-relaxed">
            By 2026, every engineering team, marketing team, legal team, and finance team is
            using AI. The monthly invoice from OpenAI, Anthropic, and Google is growing. Nobody
            can tell you which department drove it, which project it belongs to, or whether the
            model tier used was even necessary.
          </p>
          <p className="text-base font-mono text-neutral-400 max-w-2xl leading-relaxed">
            P402 Enterprise is the metering layer that makes AI spend auditable — down to the
            employee, the session, the token, and the model tier choice. And it generates
            optimization recommendations that cut 30–70% of model costs by routing tasks to
            the cheapest tier that meets the quality bar.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="border-2 border-info text-info text-xs font-bold font-mono px-3 py-1.5">
              30–70% model cost reduction via routing optimization
            </span>
            <span className="border-2 border-neutral-700 text-neutral-400 text-xs font-mono px-3 py-1.5">
              Per-employee · per-project · per-client attribution
            </span>
            <span className="border-2 border-neutral-700 text-neutral-400 text-xs font-mono px-3 py-1.5">
              SOC2-ready onchain audit trail
            </span>
          </div>
          <div className="flex gap-4 flex-wrap">
            <Link href="/meter/enterprise" className="btn btn-primary text-sm px-6 py-2">
              See Demo Dashboard →
            </Link>
            <Link href="/meter/about" className="btn btn-secondary text-sm px-6 py-2">
              ← All Use Cases
            </Link>
          </div>
        </section>

        {/* ── The Problem ───────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="01" label="The Problem" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            Enterprise AI spend is growing and completely unattributed.
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ProblemCard
              stat="$0"
              label="Per-employee AI cost visibility at most enterprises"
              detail="OpenAI, Anthropic, and Google bill the org. The bill is opaque. No department breakdown, no per-project attribution, no per-employee cost center. Finance cannot charge back AI costs. Engineering cannot optimize model tier choices without guessing."
            />
            <ProblemCard
              stat="30–70%"
              label="Model cost waste from misrouted requests"
              detail="Engineers use Claude Opus for simple code completion. Marketing uses GPT-4o for tweet drafts. Neither task needs the premium tier. The routing decision is invisible so it defaults to the best model available. The waste compounds at scale."
            />
            <ProblemCard
              stat="$0"
              label="Audit trail for enterprise AI usage"
              detail="When a compliance audit asks 'what AI did this employee use to produce this output?' the answer is nothing. No session log, no model log, no cost log, no receipt. SOC2, ISO 27001, and internal legal reviews increasingly require this."
            />
            <ProblemCard
              stat="Unknown"
              label="End-of-month AI spend projection for any department"
              detail="Day 10 of the month. Engineering is at $45 of a $200 budget. Is that on track? Ahead of pace? Behind? Without per-day velocity tracking and a projection model, nobody knows until the invoice arrives."
            />
          </div>
        </section>

        {/* ── The Attribution Hierarchy ─────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="02" label="Attribution Hierarchy" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            Every token attributed to seven levels.
          </h2>
          <p className="font-mono text-neutral-400 leading-relaxed">
            P402 Enterprise maintains a full attribution chain from the organization down to the
            individual token. Every LLM call is tagged at ingestion and attributed at billing.
          </p>

          <div className="border-2 border-neutral-700 p-5 font-mono text-[11px]">
            <div className="flex flex-col gap-0 leading-none">
              {[
                { level: 'Organization', example: 'Acme Corp', note: 'Top-level budget owner. Gets the consolidated invoice.' },
                { level: 'Department', example: 'Engineering · Marketing · Legal · Finance', note: 'Cost center. Each has its own budget cap and model routing policy.' },
                { level: 'Project', example: 'Project Phoenix · Series B Diligence', note: 'Budget sub-cap per active project. Chargeable to a client.' },
                { level: 'Client', example: 'Client A · Internal', note: 'Optional passthrough. Law firms and agencies charge clients for AI compute.' },
                { level: 'Employee', example: 'Alice Chen', note: 'Individual attribution. Who drove this cost? Leaderboard + anomaly detection.' },
                { level: 'Session', example: 'sess_abc123', note: 'A bounded unit of work. Maps to a task, document review, or conversation.' },
                { level: 'Request → Token', example: '12,847 tok · claude-opus-4-5 · $0.097', note: 'The atomic unit. Model chosen, tokens used, cost settled on Tempo.' },
              ].map(({ level, example, note }, i) => (
                <div key={level} className="flex gap-4 py-2 border-b border-neutral-800 last:border-0">
                  <div className="flex items-start gap-2 shrink-0">
                    <span className="text-neutral-700 mt-0.5 shrink-0">{'  '.repeat(i)}→</span>
                    <span className="text-primary font-bold uppercase tracking-wider text-[9px] mt-0.5 w-24 shrink-0">{level}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-neutral-300">{example}</span>
                    <span className="text-neutral-600 text-[10px]">{note}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── What the platform does ────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="03" label="Platform Capabilities" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            Meter. Trace. Track. Receipt. Audit. Route. Optimize.
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[
              {
                capability: 'Meter',
                detail: 'Every LLM call priced at token granularity. Cost calculated at request time, not billing time. Model tier, token count, and USD cost recorded per request.',
              },
              {
                capability: 'Trace',
                detail: 'Full request trace: which employee, which session, which model, which prompt pattern, what output, what cost. Traceable from the monthly invoice back to the individual keystroke.',
              },
              {
                capability: 'Track',
                detail: 'Real-time spend tracking across the hierarchy. Department dashboards, project burn rates, employee leaderboards. Budget consumption visible live, not at month-end.',
              },
              {
                capability: 'Receipt',
                detail: 'Immutable session receipts: model used, tokens consumed, routing decision rationale, cost, timestamp, Tempo settlement hash. Exportable as JSON or PDF.',
              },
              {
                capability: 'Audit',
                detail: 'Every session produces an audit artifact: who did what with which AI, when, at what cost, with what output. SOC2, ISO 27001, and internal legal review ready.',
              },
              {
                capability: 'Route',
                detail: 'Per-department routing policies. Engineering: quality-first for complex tasks. Marketing: cost-first for content generation. Legal: compliance-aware, minimum Claude Sonnet. Each policy enforced per request.',
              },
              {
                capability: 'Optimize',
                detail: 'Gemini Pro analyzes 30 days of routing history and task-type similarity scores. Identifies where premium models are used on tasks that economy models handle equally well. Quantifies the savings before you act.',
              },
              {
                capability: 'Project',
                detail: 'Budget projection engine: current velocity × remaining days = end-of-period forecast. Alert thresholds at 80% and 95% budget consumption. Projected overage surfaced 2 weeks early.',
              },
            ].map(({ capability, detail }) => (
              <div key={capability} className="border border-neutral-700 p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="border border-info text-info text-[9px] font-bold font-mono px-2 py-0.5 uppercase tracking-wider">{capability}</span>
                </div>
                <p className="text-[11px] font-mono text-neutral-400 leading-relaxed">{detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Routing optimization ──────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="04" label="Routing Optimization" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            The 30–70% cost reduction is real and measurable.
          </h2>
          <p className="font-mono text-neutral-400 leading-relaxed">
            The optimization engine compares output quality scores across model tiers for each
            task type in your org. Where quality is equivalent, it routes to the cheaper model.
            The savings are projected before you commit to any routing change.
          </p>

          <div className="border-2 border-neutral-700 flex flex-col">
            <div className="border-b border-neutral-700 px-5 py-2 grid grid-cols-4 gap-4 text-[9px] font-mono text-neutral-600 uppercase tracking-wider">
              <span>Task Type</span>
              <span>Current Model</span>
              <span>Recommended</span>
              <span className="text-right">Monthly Saving</span>
            </div>
            {[
              { task: 'Code completion (simple)', current: 'claude-opus-4-5', recommended: 'claude-haiku-4-5', saving: '$2.12', confidence: 94 },
              { task: 'Content generation', current: 'gpt-4o', recommended: 'claude-sonnet-4-5', saving: '$1.43', confidence: 89 },
              { task: 'Financial Q&A', current: 'gemini-2.0-pro', recommended: 'gemini-2.0-flash', saving: '$0.87', confidence: 91 },
              { task: 'Contract analysis', current: 'claude-sonnet-4-5', recommended: 'maintain', saving: '—', confidence: 97 },
              { task: 'Code review (complex)', current: 'claude-opus-4-5', recommended: 'maintain', saving: '—', confidence: 88 },
            ].map(({ task, current, recommended, saving, confidence }) => (
              <div key={task} className="border-b border-neutral-800 last:border-0 px-5 py-3 grid grid-cols-4 gap-4 items-center text-[10px] font-mono">
                <span className="text-neutral-300">{task}</span>
                <span className="text-warning">{current}</span>
                <span className={recommended === 'maintain' ? 'text-neutral-600' : 'text-success'}>{recommended}</span>
                <div className="flex items-center justify-end gap-2">
                  <span className={`font-bold tabular-nums ${saving === '—' ? 'text-neutral-600' : 'text-success'}`}>{saving}</span>
                  <span className="text-neutral-700 text-[9px]">{confidence}%</span>
                </div>
              </div>
            ))}
            <div className="px-5 py-2 border-t border-neutral-700 flex items-center justify-between text-[10px] font-mono">
              <span className="text-neutral-600">Actionable savings (3 task types)</span>
              <span className="text-success font-bold">$4.42/month total</span>
            </div>
          </div>
        </section>

        {/* ── Budget controls ───────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="05" label="Budget Controls" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            Hard caps at every level in the hierarchy.
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ControlCard
              label="Department budget cap"
              detail="Each department gets a monthly budget in USD. When projected spend (current velocity × remaining days) exceeds 90% of the cap, the department head is notified. When the cap is reached, requests are blocked or downgraded to economy tier — configurable per policy."
            />
            <ControlCard
              label="Project budget cap"
              detail="Individual projects get their own sub-cap within the department budget. A client engagement can be capped at $50 regardless of the department's remaining budget. The cap is enforced at the session level before any LLM call is made."
            />
            <ControlCard
              label="Model tier policy"
              detail="Each department can set a minimum and maximum model tier. Legal: minimum claude-sonnet-4-5 (no economy models for contract work). Marketing: maximum claude-sonnet-4-5 (no premium models for copy). Enforced at routing time, not billed after the fact."
            />
            <ControlCard
              label="Anomaly detection"
              detail="Session costs 3× above the employee's 30-day average are flagged automatically. An employee who suddenly runs $10 of LLM calls in one session triggers a Sentinel review. The session is not blocked — it is surfaced for review within 60 seconds."
            />
          </div>
        </section>

        {/* ── Audit trail ──────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="06" label="Audit Trail" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            Every session is an immutable receipt.
          </h2>
          <p className="font-mono text-neutral-400 leading-relaxed">
            The audit requirement is different in every industry. But the underlying need is the same:
            prove what the AI did, when, for whom, at what cost, with what output.
          </p>

          <div className="border-2 border-neutral-700 font-mono text-[11px]">
            <div className="border-b border-neutral-700 px-5 py-3 text-[9px] text-neutral-500 uppercase tracking-wider">
              Session receipt — example
            </div>
            <div className="p-5 flex flex-col gap-2 text-neutral-400">
              <div className="grid grid-cols-2 gap-4">
                {[
                  ['Receipt ID',         'rcpt_2c4f8a1b...'],
                  ['Session ID',         'sess_a7c3e9d2...'],
                  ['Employee',           'Alice Chen'],
                  ['Department',         'Engineering'],
                  ['Project',            'Project Phoenix'],
                  ['Client',             'Internal'],
                  ['Timestamp',          '2026-05-05T14:32:11Z'],
                  ['Model',              'claude-opus-4-5'],
                  ['Tokens (in)',        '2,847'],
                  ['Tokens (out)',       '10,000'],
                  ['Total tokens',       '12,847'],
                  ['Cost USD',           '$0.09635'],
                  ['Routing rationale',  'complexity=7, dept_policy=quality-first'],
                  ['Tempo tx hash',      '0x7a3f...c91e'],
                  ['Block',              '14,829,441'],
                  ['Human review',       'approved by Alice Chen'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-start gap-2">
                    <span className="text-neutral-700 uppercase tracking-wider text-[9px] w-32 shrink-0 mt-0.5">{k}</span>
                    <span className="text-neutral-300 break-all">{v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-neutral-800 text-[9px] text-neutral-600">
                Receipt is immutable. Settlement hash links to Tempo block explorer. Exportable as JSON, PDF, or CSV batch.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-[11px] font-mono">
            <div className="border border-neutral-700 p-4 flex flex-col gap-1">
              <span className="text-[9px] text-neutral-600 uppercase tracking-wider">SOC2 Type II</span>
              <span className="text-neutral-300 leading-relaxed">Access logs, cost records, and output artifacts satisfy CC6.1 (logical access) and CC7.2 (system monitoring) control requirements.</span>
            </div>
            <div className="border border-neutral-700 p-4 flex flex-col gap-1">
              <span className="text-[9px] text-neutral-600 uppercase tracking-wider">Financial controls</span>
              <span className="text-neutral-300 leading-relaxed">Per-department budget caps with blocking enforcement satisfy internal IT general control requirements for AI expenditure authorization.</span>
            </div>
            <div className="border border-neutral-700 p-4 flex flex-col gap-1">
              <span className="text-[9px] text-neutral-600 uppercase tracking-wider">Legal hold</span>
              <span className="text-neutral-300 leading-relaxed">Onchain settlement hashes provide tamper-evident records. Session receipts can be produced in discovery or regulatory response without relying on vendor-controlled logs.</span>
            </div>
          </div>
        </section>

        {/* ── Unit economics ────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="07" label="Unit Economics" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            The savings are structural, not marginal.
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="border-2 border-neutral-700 p-4 flex flex-col gap-2">
              <div className="text-lg font-bold text-error tabular-nums">Opaque</div>
              <div className="text-xs font-bold uppercase tracking-wider text-neutral-50">Status quo AI billing</div>
              <div className="text-[11px] font-mono text-neutral-400 leading-relaxed">
                Monthly invoice. No department breakdown. No per-project attribution. No routing visibility. No optimization lever. Costs compound invisibly.
              </div>
            </div>
            <div className="border-2 border-info p-4 flex flex-col gap-2">
              <div className="text-lg font-bold text-info tabular-nums">30–70%</div>
              <div className="text-xs font-bold uppercase tracking-wider text-neutral-50">Model cost reduction via routing</div>
              <div className="text-[11px] font-mono text-neutral-400 leading-relaxed">
                Routing code completion to Haiku instead of Opus saves 87% on that task type. Across an engineering team of 10, that&apos;s $25–100/month per employee recovered.
              </div>
            </div>
            <div className="border-2 border-neutral-700 p-4 flex flex-col gap-2">
              <div className="text-lg font-bold text-success tabular-nums">Full trail</div>
              <div className="text-xs font-bold uppercase tracking-wider text-neutral-50">Per-token attribution + receipt</div>
              <div className="text-[11px] font-mono text-neutral-400 leading-relaxed">
                Every dollar attributed. Every session receipted. Every optimization quantified before action. Finance can close the AI cost center monthly with confidence.
              </div>
            </div>
          </div>

          <div className="border border-neutral-700 p-5 font-mono text-[11px]">
            <div className="text-[9px] text-neutral-600 uppercase tracking-wider mb-3">Acme Corp · synthetic 30-day projection (100-person org)</div>
            <div className="grid grid-cols-3 gap-4">
              {[
                ['Without P402', 'Monthly OpenAI invoice: ~$2,400', 'Zero attribution. Zero optimization lever.'],
                ['With P402 (tracking only)', 'Same $2,400 spend, now attributed', 'Department breakdown. Per-project chargeback.'],
                ['With P402 (+ routing optimization)', 'Projected spend: ~$1,080', '55% cost reduction via model-tier routing.'],
              ].map(([scenario, cost, note]) => (
                <div key={scenario} className="flex flex-col gap-1.5">
                  <span className="text-[9px] text-neutral-600 uppercase tracking-wider">{scenario}</span>
                  <span className="text-neutral-300 font-bold">{cost}</span>
                  <span className="text-neutral-600 text-[10px]">{note}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────────────── */}
        <section className="border-2 border-info p-8 flex flex-col gap-4">
          <div className="text-[10px] font-mono text-info uppercase tracking-wider">
            Try the demo dashboard now
          </div>
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            The dashboard is live with synthetic data.
          </h2>
          <p className="font-mono text-neutral-400 leading-relaxed max-w-xl">
            Org KPIs, department breakdown, employee leaderboard, model mix, budget projections,
            routing optimization panel, and session log — all wired and running with Acme Corp
            synthetic data. Connect your P402 API key to see real org spend.
          </p>
          <div className="flex gap-4 flex-wrap mt-2">
            <Link href="/meter/enterprise" className="btn btn-primary text-sm px-8 py-3">
              Open Dashboard →
            </Link>
            <Link href="/meter/healthcare" className="btn btn-secondary text-sm px-8 py-3">
              See Healthcare Demo (Live)
            </Link>
            <Link href="/meter/about" className="btn btn-secondary text-sm px-8 py-3">
              All Use Cases
            </Link>
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-neutral-700 pt-6 flex items-center justify-between text-[10px] font-mono text-neutral-600 uppercase tracking-wider flex-wrap gap-3">
          <span>P402 Meter · Enterprise · Tempo Mainnet · MPP</span>
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

function ControlCard({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="border border-neutral-700 p-4 flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <span className="text-info mt-0.5 shrink-0">→</span>
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-50">{label}</span>
      </div>
      <p className="text-[11px] font-mono text-neutral-400 leading-relaxed pl-4">{detail}</p>
    </div>
  );
}
