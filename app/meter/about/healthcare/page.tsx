import type { Metadata } from 'next';
import Link from 'next/link';
import { SCENARIO_META } from '@/lib/demo/scenarios';

export const metadata: Metadata = {
  title: 'Medicaid Prior Authorization Governance · P402 Meter',
  description:
    'Metered AI governance for Medicaid managed care utilization review. Per-operation receipts, 5-level budget hierarchy, human review gate, CMS-0057-F and HIPAA-aligned demo mode, with real USDC.e settlement on Tempo mainnet.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-50">

      {/* Top bar */}
      <div className="border-b-2 border-neutral-700 px-6 py-3 flex items-center justify-between">
        <Link href="/meter/about" className="text-xs font-mono text-neutral-400 uppercase tracking-widest hover:text-primary transition-colors">
          P402 Meter
        </Link>
        <div className="flex items-center gap-3">
          <span className="border border-primary px-2 py-0.5 text-[10px] font-mono text-primary uppercase tracking-wider">
            Tempo Mainnet · MPP
          </span>
          <span className="border border-warning px-2 py-0.5 text-[10px] font-mono text-warning uppercase">
            Synthetic Records Only
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16 flex flex-col gap-20">

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
            {'>'} _ P402 METER · MEDICAID MCO · PRIOR AUTHORIZATION GOVERNANCE
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold uppercase tracking-tight leading-none">
            Governance<br />
            for the work<br />
            <span className="text-primary">AI does next.</span>
          </h1>
          <p className="text-base font-bold text-neutral-50 max-w-2xl leading-relaxed mb-1">
            Metered AI governance for prior authorization review, built for a multi-state
            government-program health plan operating across Medicaid, D-SNP, and Marketplace.
          </p>
          <p className="text-base font-mono text-neutral-400 max-w-2xl leading-relaxed">
            Prior authorization is the proof point. It is document-heavy, regulator-bound, and
            high-stakes. Decision clocks are set by CMS. PHI handling is set by HIPAA. State
            program rules vary. The reviewer makes the coverage decision, not the model. P402
            Meter shows what governed AI assistance looks like in that environment: per-operation
            receipts tied to client-level budget controls, a human review gate before any export,
            and an oversight packet ready for audit.
          </p>
          <div className="flex flex-wrap gap-2">
            {SCENARIO_META.healthcare_prior_auth.safety_labels.map((label) => (
              <span key={label} className="border-2 border-neutral-600 text-neutral-300 text-[10px] font-mono uppercase tracking-wide px-3 py-1.5">
                {label}
              </span>
            ))}
          </div>
          <p className="text-[11px] font-mono text-neutral-500 leading-relaxed">
            {SCENARIO_META.healthcare_prior_auth.framing_disclaimer}
          </p>
          <div className="flex gap-4 flex-wrap">
            <Link href="/dashboard?demo=1&scenario=healthcare_prior_auth" className="btn btn-primary text-sm px-6 py-2">
              View dashboard proof
            </Link>
            <Link href="/dashboard/prove?demo=1&scenario=healthcare_prior_auth" className="btn btn-secondary text-sm px-6 py-2">
              See evidence
            </Link>
            <Link href="/meter/healthcare" className="btn btn-secondary text-sm px-6 py-2">
              Run prior auth demo
            </Link>
            <a
              href="https://explore.tempo.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary text-sm px-6 py-2"
            >
              Tempo Explorer
            </a>
          </div>
        </section>

        {/* ── The Problem ───────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="01" label="The Problem" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            AI is entering utilization review without a governance substrate.
          </h2>
          <p className="font-mono text-neutral-400 leading-relaxed">
            Medicaid managed care plans, D-SNPs, and Marketplace issuers are being asked to do more
            prior authorization, faster, with more reason-specificity, under stricter clocks. At
            the same time AI vendors are pitching workflow tools with no per-action cost attribution
            and no link to reviewer governance. The gap is structural.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ProblemCard
              stat="72h"
              label="Expedited decision clock (CMS-0057-F)"
              detail="Specific denial or RFI reason required, regardless of channel (API, portal, fax, phone, mail, email). API requirements largely begin January 2027. Operational requirements begin January 2026."
            />
            <ProblemCard
              stat="HIPAA"
              label="PHI handling, BAA, audit trail"
              detail="Production AI in PA must respect HIPAA Privacy, Security, and Breach Notification rules. Business associate contracting and access controls are not optional."
            />
            <ProblemCard
              stat="N states"
              label="Variable Medicaid program rules"
              detail="Each state Medicaid program has its own utilization management policy, required documentation, reviewer roles, and appeal-packet format. One AI workflow cannot hardcode them."
            />
            <ProblemCard
              stat="$0"
              label="Per-operation AI cost attribution"
              detail="AI vendor invoices arrive monthly with no breakdown by line of business, workflow, case, or agent. Compliance and finance cannot tie spend to a decision or a reviewer."
            />
          </div>
        </section>

        {/* ── The Solution ──────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="02" label="The Solution" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            Every AI operation produces a receipt. Budgets live in policy.
          </h2>
          <p className="font-mono text-neutral-400 leading-relaxed">
            P402 sits between the AI agents and the AI providers. Each metered operation
            (documentation extraction, completeness check, criteria mapping, reviewer-summary draft,
            RFI reason, escalation recommendation, evidence export) is evaluated against a 5-level
            budget hierarchy before it runs, and produces an operation receipt after it runs. Real
            USDC.e settlement on Tempo mainnet at session close binds the receipts to an on-chain
            proof. The reviewer makes the coverage decision.
          </p>
          <div className="border-2 border-primary p-6 flex flex-col gap-4">
            <div className="text-[10px] font-mono text-primary uppercase tracking-wider">
              The workflow in one sentence
            </div>
            <p className="text-lg font-bold leading-snug">
              Synthetic PA packet feeds 7 governed AI operations, each gated by client, line-of-business,
              workflow, case, and agent budgets. Per-operation receipts carry policy and mandate status.
              A human review gate (approve for sign-off, request more information, escalate) precedes
              oversight packet JSON export with a compliance trace, and USDC.e settles on Tempo.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <MetricCard value="5" label="Budget hierarchy levels" sublabel="Client · LOB · Workflow · Case · Agent" highlight />
            <MetricCard value="7" label="Governed AI operations" sublabel="One receipt per operation" />
            <MetricCard value="0" label="Autonomous denials" sublabel="Reviewer action required before export" />
          </div>
        </section>

        {/* ── Compliance Anchors ────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="03" label="Compliance Anchors" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            What this demo models, and what it deliberately does not.
          </h2>
          <p className="font-mono text-neutral-500 text-sm">
            Each anchor below maps to something visible in the live demo, not claimed in theory.
            The boundaries are as load-bearing as the features.
          </p>
          <div className="flex flex-col gap-3">
            <AlignmentRow
              prize="CMS-0057-F · Prior Authorization Decision Timing"
              checks={[
                'Expedited 72-hour clock and standard seven-calendar-day clock surfaced in the State Program Policy Profile per line of business',
                'Specific denial or RFI reason generated as structured text, never as a final adverse determination, always as a draft for human review',
                'Per-operation timestamps build a status trace that can support API, portal, fax, phone, mail, or email channels',
                'FHIR Prior Authorization API readiness shown as a mock surface; production deployment is a separate integration scope',
                'Annual PA metrics export shown as a future-ready handoff for public reporting requirements',
              ]}
            />
            <AlignmentRow
              prize="HIPAA Privacy, Security, and Breach Notification"
              checks={[
                'Synthetic records only; every case ID, member ID, and provider name begins with SYN-',
                'No upload control accepts user files; no free-text field requests real patient data; no PHI persists in browser state',
                'Production deployment requires BAA, access controls, encryption, retention policy, and incident response controls; stated in the demo, not assumed',
                'HIPAA Safety Boundary panel is always visible above the export; the boundary is part of the product',
              ]}
            />
            <AlignmentRow
              prize="Medicaid Managed Care · State Program Policy Profiles"
              checks={[
                'State program rules are modeled as a configurable State Program Policy Profile, not hardcoded universal claims',
                'Each profile exposes program name, line of business, request category, decision clocks, required documents, reviewer role, escalation role, and appeal-packet relevance',
                'Default display labels the source as "Demo placeholder" with sourceVerified = false; production deployment requires verified policy source documents and state-specific legal review',
                'Transparency posture: panels speak in the language of Medicaid enrollees, providers, and audit reviewers, not vendor-jargon',
              ]}
            />
            <AlignmentRow
              prize="Medicare Advantage · D-SNP UM Equity Support"
              checks={[
                'Health Equity panel surfaces dual-eligible, disability, language-access, and geographic-access flags as synthetic markers',
                'Panel supports prior authorization policy impact review and an annual UM equity analysis export placeholder',
                'Panel is primary in D-SNP mode and collapsed-by-default in Medicaid MCO mode; it supports review, not decision automation',
                'Plan committee review is the boundary; the panel never produces a clinical decision',
              ]}
            />
            <AlignmentRow
              prize="P402 Governance Trust Stack"
              checks={[
                'AP2 mandates carry client-level spending authority; per-operation receipts evaluate policy and mandate status before they fire',
                '5-level budget hierarchy enforced at the tenant, line of business, workflow, case, and agent level. Receipts are evidence, budgets are policy',
                'ERC-8004 trustless agent identity on Base (cross-chain) registers the AI agent and supports reputation-aware routing',
                'Replay protection on EIP-3009 nonces; oversight packet binds receipts, hierarchy state, criteria mapping, draft reason, human decision, and compliance trace',
              ]}
            />
          </div>
        </section>

        {/* ── Technology Stack ──────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="04" label="Technology" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            Three layers. One settlement substrate. One governance overlay.
          </h2>

          <TechBlock
            badge="Tempo"
            color="border-primary text-primary"
            headline="Settlement substrate that makes per-operation receipts economically real"
            points={[
              'USDC.e (TIP-20) as native stablecoin. Settlement at under $0.000001 per tx via FeeAMM, versus roughly $2.85 on ETH mainnet and the $0.30 Stripe minimum',
              'Session-close reconciliation: one real Tempo tx per session aggregates the per-operation receipts into a single onchain proof; no per-operation gas burn',
              'TIP-20 transfer uses the standard ERC-20 interface. No msg.value, no native gas token separate from stablecoins; gas paid via FeeAMM in USDC.e',
              'Every settlement is independently verifiable in the Tempo block explorer (explore.tempo.xyz). The receipt and on-chain tx hash are part of the oversight packet',
            ]}
          />

          <TechBlock
            badge="MPP"
            color="border-info text-info"
            headline="Machine-payment layer that makes the receipts programmable"
            points={[
              'Machine Payment Protocol (mppx) orchestrates the per-operation payment authorization and the session-close TIP-20 transfer on Tempo',
              'Authorization: Payment header pattern (dual-402 challenge/response) supports machine-to-machine payment authorization',
              'Pre-funded TEMPO_TREASURY_PRIVATE_KEY wallet submits the session-close transfer on behalf of the metered session; AP2 mandates carry the client-level authority',
              'Proof Replay mode activates automatically when the treasury key is unset. Full demo runs without any real funds, with pre-recorded proof references',
            ]}
          />

          <TechBlock
            badge="Gemini"
            color="border-warning text-warning"
            headline="Intelligence layer scoped to assistance, never to coverage decisions"
            points={[
              'Gemini 3.1 Flash drives documentation extraction, completeness check, criteria mapping (synthetic categories), and the reviewer-summary draft. Each operation produces a typed receipt',
              'Gemini 3.1 Pro runs the post-session compliance trace narrative, explaining what was extracted, what is missing, and which categories require reviewer validation',
              'Output is always labeled as extracted fields, draft summary, completeness check, criteria mapping, suggested next action, or reviewer rationale draft; never as a final decision',
              'There is no autonomous denial path. There is no primary "Deny" action. Any adverse-determination reason is treated as a draft for human review',
              'Multimodal intake supports synthetic image/PDF packets; production deployment must use the payer\'s licensed medical policy in place of the synthetic criteria categories',
            ]}
          />
        </section>

        {/* ── Why Medicaid is the proof point ───────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="05" label="Why Medicaid PA" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            Medicaid prior authorization is where governed AI assistance has to land first.
          </h2>
          <p className="font-mono text-neutral-400 leading-relaxed">
            Medicaid managed care plans run high-volume PA workflows under variable state rules,
            tight decision clocks, and significant audit exposure. The reviewer-time cost is real,
            the documentation-completeness problem is real, and the compliance reporting burden is
            real. The governance gap is also real; that is what P402 closes.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ContextCard
              label="Governance is the product, not the wrapper"
              detail="Budget controls, reviewer gates, audit packets, and compliance traces are not features added to a chat workflow. They are the workflow. The model surfaces work; the governance routes who gets to act on it."
            />
            <ContextCard
              label="Decision clocks make traceability load-bearing"
              detail="The CMS-0057-F clocks (72h expedited, seven calendar days standard) are the operational unit. Every operation receipt carries a timestamp, every status change is visible, and the oversight packet captures the trace."
            />
            <ContextCard
              label="State rules are configuration, not assumption"
              detail="State A's Medicaid program is not State B's Medicaid program. The State Program Policy Profile is configurable per row; production deployment requires verified policy source documents and state-specific legal review."
            />
            <ContextCard
              label="Reviewer authority is not negotiable"
              detail="No autonomous denial. No autonomous medical-necessity determination. No coverage decision without a qualified reviewer. The export packet is gated on a human action and the action is recorded in the compliance trace."
            />
          </div>
        </section>

        {/* ── Architecture ──────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="06" label="Architecture" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            Eight API routes. One settlement model. One governance overlay.
          </h2>
          <p className="font-mono text-neutral-500 text-sm">
            Each route handles one step of the workflow. Settlement-producing routes write directly
            to Tempo. The governance overlay (receipts, hierarchy, oversight packet) is derived
            from the same ledger events the settlement layer emits, one source of truth.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 font-mono text-xs">
            {[
              ['/api/meter/packet', 'Ingest synthetic PA packet, SHA-256 hash, persist asset'],
              ['/api/meter/work-order', 'Gemini extraction produces a typed WorkOrder plus line-of-business context'],
              ['/api/meter/sessions', 'Open metered session with case + agent budget caps'],
              ['/api/meter/wallet', 'Check Tempo settler wallet balance and signer address'],
              ['/api/meter/chat', 'SSE stream · per-operation receipts · session-close Tempo settle'],
              ['/api/meter/escrow', 'ERC-8183 escrow for specialist handoff (Phase 3; returns 503 on Tempo Phase 1)'],
              ['/api/meter/trust', 'ERC-8004 agent identity + reputation read'],
              ['/api/meter/audit', 'Compliance trace narrative + cost-per-operation breakdown'],
            ].map(([route, desc]) => (
              <div key={route} className="border border-neutral-700 px-3 py-2 flex flex-col gap-0.5">
                <span className="text-primary font-bold">{route}</span>
                <span className="text-neutral-400">{desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Business Value ────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="07" label="Buyer Context" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            The buyer is a multi-state government-program health plan.
          </h2>
          <p className="font-mono text-neutral-400 text-sm leading-relaxed">
            Not a developer. Not a generic enterprise. A health plan that runs PA workflows across
            Medicaid managed care, Medicare D-SNP, Marketplace, and CHIP-adjacent operations, under
            specific state program rules and federal oversight, with a real audit and appeal
            burden. Primary stakeholders: VP Utilization Management, Director Prior Authorization,
            CMO staff, Compliance and Audit leadership, Medicaid plan operations, and the
            enterprise AI governance team.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="border-2 border-neutral-700 p-4 flex flex-col gap-2">
              <div className="text-lg font-bold text-error tabular-nums">Legacy</div>
              <div className="text-xs font-bold uppercase tracking-wider text-neutral-50">Operating cost per case in the legacy workflow</div>
              <div className="text-[11px] font-mono text-neutral-400 leading-relaxed">
                UM nurse or physician advisor time for a standard PA decision is materially higher per case than the AI-metered path; complex behavioral-health, post-acute, or specialty cases run significantly higher.
              </div>
            </div>
            <div className="border-2 border-primary p-4 flex flex-col gap-2">
              <div className="text-lg font-bold text-primary tabular-nums">Sub-penny</div>
              <div className="text-xs font-bold uppercase tracking-wider text-neutral-50">Governed AI assistance per case</div>
              <div className="text-[11px] font-mono text-neutral-400 leading-relaxed">
                Seven metered operations against per-agent caps. Every cent attributable to a line of business, workflow, case, and agent. Settlement on Tempo.
              </div>
            </div>
            <div className="border-2 border-neutral-700 p-4 flex flex-col gap-2">
              <div className="text-lg font-bold text-success tabular-nums">Full oversight packet</div>
              <div className="text-xs font-bold uppercase tracking-wider text-neutral-50">Audit-ready export per case</div>
              <div className="text-[11px] font-mono text-neutral-400 leading-relaxed">
                Receipts, hierarchy state, documentation completeness, criteria mapping, draft reason, human decision, and compliance trace as JSON, copyable, gated on reviewer action.
              </div>
            </div>
          </div>
          <div className="border border-neutral-700 p-4 flex flex-col gap-3">
            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">What changes for the plan</div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-[11px] font-mono text-neutral-400 leading-relaxed">
              <div className="flex items-start gap-2"><span className="text-primary shrink-0">·</span><span>AI spend attributable to client, line of business, workflow, case, and agent, not a monthly black-box invoice</span></div>
              <div className="flex items-start gap-2"><span className="text-primary shrink-0">·</span><span>CMS-0057-F decision clocks tracked per case with timestamped operations and structured reason text</span></div>
              <div className="flex items-start gap-2"><span className="text-primary shrink-0">·</span><span>State Program Policy Profiles as configuration: no hardcoded universal claims, no surprise compliance debt</span></div>
              <div className="flex items-start gap-2"><span className="text-primary shrink-0">·</span><span>HIPAA boundary visible in the workflow: synthetic in demo, BAA-bounded and access-controlled in production</span></div>
              <div className="flex items-start gap-2"><span className="text-primary shrink-0">·</span><span>Reviewer authority preserved end-to-end. The export packet does not finalize without a human action</span></div>
              <div className="flex items-start gap-2"><span className="text-primary shrink-0">·</span><span>D-SNP UM equity review support: dual-eligible, disability, language and geographic access flags surfaced for committee review</span></div>
            </div>
          </div>
        </section>

        {/* ── Reviewer Walkthrough ──────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="08" label="Reviewer Walkthrough" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            Five steps. Under three minutes.
          </h2>
          <p className="font-mono text-neutral-400 text-sm leading-relaxed">
            Everything on this page is verifiable in the live demo. Here is the sequence.
          </p>
          <div className="flex flex-col gap-3">
            {[
              {
                step: '01',
                action: 'Pick a line of business',
                detail: 'The Line of Business selector switches between Medicaid MCO (default: behavioral health inpatient extension), Medicare D-SNP (post-acute SNF extension), and Marketplace (outpatient imaging PA). The State Program Policy Profile, the synthetic packet, the compliance panels, and the receipt case IDs all update.',
              },
              {
                step: '02',
                action: 'Review the synthetic packet and the state program profile',
                detail: 'The Synthetic Prior Authorization Packet shows case ID, member ID (SYN-…), urgency, requested service, provider, and packet summary. The State Program Policy Profile shows decision clocks, required documents, reviewer role, and escalation role. The HIPAA Safety Boundary panel is visible throughout.',
              },
              {
                step: '03',
                action: 'Run the demo and watch the AI Operation Stream',
                detail: 'Seven metered operations stream in order: documentation extraction, completeness check, criteria mapping, reviewer summary, RFI reason, escalation recommendation, evidence export. Each one writes a receipt with policy + mandate status and an evidence hash. The Client Budget Controls panel updates per-agent and per-case spend in real time.',
              },
              {
                step: '04',
                action: 'Inspect the receipts and the Tempo settlement proof',
                detail: 'The Operation Receipt Ledger lists each receipt with agent, cost, policy status, and evidence hash. Click any row to expand the JSON. The Tempo Settlement Proof panel shows the session-close USDC.e transfer tx hash; every receipt carries it as settlementTxHash for traceability.',
              },
              {
                step: '05',
                action: 'Select a reviewer action and export the oversight packet',
                detail: 'The Human Review Gate offers three actions: approve for reviewer sign-off, request more information, escalate to physician advisor. There is no primary Deny. The Oversight Packet export remains disabled until a reviewer action is recorded. Copy the JSON: it carries the full receipt set, budget hierarchy state, documentation completeness, criteria mapping, draft reason, human decision, and a compliance trace with realPhiProcessed: false.',
              },
            ].map(({ step, action, detail }) => (
              <div key={step} className="border border-neutral-700 flex">
                <div className="flex-shrink-0 w-12 flex items-center justify-center border-r border-neutral-700 bg-neutral-800">
                  <span className="text-primary font-bold font-mono text-sm">{step}</span>
                </div>
                <div className="p-4 flex flex-col gap-1">
                  <div className="text-sm font-bold text-neutral-50">{action}</div>
                  <div className="text-[11px] font-mono text-neutral-400 leading-relaxed">{detail}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Mode Transparency ─────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <SectionLabel number="09" label="How the Demo Runs" />
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            Three modes. Same governance overlay.
          </h2>
          <p className="font-mono text-neutral-400 text-sm leading-relaxed">
            P402 Meter adapts automatically to the environment. The governance overlay (receipts,
            hierarchy, human review gate, oversight packet, HIPAA boundary, CMS readiness panel)
            runs identically in every mode. Only the source of the model output and the on-chain
            settlement change.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
            <ModeCard
              mode="Live Mode"
              badge="GOOGLE_API_KEY + TEMPO_TREASURY_PRIVATE_KEY set"
              badgeColor="text-success border-success"
              detail="Real Gemini 3.1 Flash and Pro calls. Pre-funded Tempo wallet submits one real USDC.e TIP-20 transfer at session close. Tempo Explorer link goes live immediately. Every receipt carries the session-close settlementTxHash."
              indicator="success"
            />
            <ModeCard
              mode="Proof Replay"
              badge="Default (no keys required)"
              badgeColor="text-info border-info"
              detail="Pre-recorded stream replays a prior live PA session. Receipts, hierarchy, criteria mapping, compliance trace, and oversight packet behave identically. Reviewer must still select an action to enable export."
              indicator="info"
            />
            <ModeCard
              mode="Quota Fallback"
              badge="Auto (free-tier Gemini limit hit)"
              badgeColor="text-warning border-warning"
              detail="If Gemini returns a 429 or quota error mid-session, the system silently switches to Proof Replay. A thin amber notice appears. Governance and compliance panels remain unchanged."
              indicator="warning"
            />
          </div>

          {/* Tempo MPP settlement flow */}
          <div className="border-2 border-neutral-700 flex flex-col">
            <div className="border-b-2 border-neutral-700 px-4 py-3">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
                Receipt and Tempo settlement flow (per session)
              </span>
            </div>
            <div className="p-4 font-mono text-[11px] text-neutral-400 flex flex-col gap-1 leading-relaxed">
              <span><span className="text-primary">1.</span> AI operation runs; cost calculated against the 5-level budget hierarchy</span>
              <span className="text-neutral-700 ml-4">·</span>
              <span><span className="text-primary">2.</span> Receipt written: agent, model, caseId, costUsd, policyStatus, mandateStatus, evidenceHash</span>
              <span className="text-neutral-700 ml-4">·</span>
              <span><span className="text-primary">3.</span> Repeat for the 7 governed operations; session-close triggered</span>
              <span className="text-neutral-700 ml-4">·</span>
              <span><span className="text-primary">4.</span> Tempo settler submits a single USDC.e ERC-20 transfer() on Tempo mainnet (Chain ID 4217)</span>
              <span className="text-neutral-700 ml-4">·</span>
              <span><span className="text-primary">5.</span> waitForTransactionReceipt confirms after 1 block; FeeAMM gas paid in USDC.e</span>
              <span className="text-neutral-700 ml-4">·</span>
              <span><span className="text-primary">6.</span> Reconciliation event written: settlementTxHash + settlementBlock; every receipt is stamped with it</span>
              <span className="text-neutral-700 ml-4">·</span>
              <span><span className="text-primary">7.</span> Reviewer selects an action; oversight packet JSON exported with the on-chain settlement reference and a compliance trace</span>
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────────────── */}
        <section className="border-2 border-primary p-8 flex flex-col gap-4">
          <div className="text-[10px] font-mono text-primary uppercase tracking-wider">
            See it live
          </div>
          <h2 className="text-2xl font-bold uppercase tracking-tight">
            The demo is the proof.
          </h2>
          <p className="font-mono text-neutral-400 leading-relaxed max-w-xl">
            Seven governed AI operations. Per-operation receipts. A 5-level budget hierarchy. A
            reviewer gate before export. CMS-0057-F clocks, HIPAA boundary, and a State Program
            Policy Profile in the workflow. Real USDC.e settlement on Tempo. Synthetic records
            only; no PHI processed.
          </p>
          <div className="flex gap-4 flex-wrap mt-2">
            <Link href="/meter/healthcare" className="btn btn-primary text-sm px-8 py-3">
              Run prior auth demo
            </Link>
            <a
              href="https://explore.tempo.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary text-sm px-8 py-3"
            >
              Verify on Tempo
            </a>
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-neutral-700 pt-6 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-600 uppercase tracking-wider">
            <span>P402 Meter · Medicaid MCO PA Governance · Tempo Mainnet · Synthetic Demo</span>
            <span>Tempo × MPP × Gemini 3.1</span>
          </div>
          <div className="text-[9px] font-mono text-neutral-700 tracking-wide">
            P402 Router · p402.io · Production deployment requires payer security review, BAA, and state-specific legal review.
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

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
      <div className={`text-3xl font-bold tabular-nums ${highlight ? 'text-primary' : 'text-neutral-50'}`}>
        {value}
      </div>
      <div className="text-xs font-bold uppercase tracking-wider text-neutral-50">{label}</div>
      <div className="text-[10px] font-mono text-neutral-500">{sublabel}</div>
    </div>
  );
}

function TechBlock({ badge, color, headline, points }: {
  badge: string; color: string; headline: string; points: string[];
}) {
  return (
    <div className="border-2 border-neutral-700 flex flex-col">
      <div className="border-b-2 border-neutral-700 px-4 py-3 flex items-center gap-3">
        <span className={`border-2 ${color} text-xs font-bold px-3 py-1 uppercase tracking-wider`}>
          {badge}
        </span>
        <span className="text-sm font-bold text-neutral-50">{headline}</span>
      </div>
      <div className="p-4 flex flex-col gap-2">
        {points.map((point, i) => (
          <div key={i} className="flex items-start gap-2 text-[11px] font-mono text-neutral-400">
            <span className="text-primary mt-0.5 shrink-0">·</span>
            <span>{point}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContextCard({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="border border-neutral-700 p-4 flex flex-col gap-2">
      <div className="text-xs font-bold uppercase tracking-wider text-neutral-50 flex items-center gap-2">
        <span className="text-primary">✓</span>
        {label}
      </div>
      <div className="text-[11px] font-mono text-neutral-400 leading-relaxed">{detail}</div>
    </div>
  );
}

function ModeCard({ mode, badge, badgeColor, detail, indicator }: {
  mode: string; badge: string; badgeColor: string; detail: string; indicator: 'success' | 'info' | 'warning';
}) {
  const dotColor = indicator === 'success' ? 'bg-success' : indicator === 'warning' ? 'bg-warning' : 'bg-info';
  return (
    <div className="border-2 border-neutral-700 flex flex-col">
      <div className="border-b border-neutral-700 px-4 py-3 flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
        <span className="text-xs font-bold text-neutral-50 uppercase tracking-wider">{mode}</span>
      </div>
      <div className="p-4 flex flex-col gap-2">
        <span className={`border text-[9px] font-mono px-2 py-0.5 uppercase tracking-wider self-start ${badgeColor}`}>
          {badge}
        </span>
        <p className="text-[11px] font-mono text-neutral-400 leading-relaxed">{detail}</p>
      </div>
    </div>
  );
}

function AlignmentRow({ prize, checks }: { prize: string; checks: string[] }) {
  return (
    <div className="border-2 border-neutral-700 flex flex-col">
      <div className="border-b border-neutral-700 px-4 py-3 bg-neutral-800">
        <span className="text-xs font-bold uppercase tracking-wider text-primary">{prize}</span>
      </div>
      <div className="p-4 flex flex-col gap-2">
        {checks.map((check, i) => (
          <div key={i} className="flex items-start gap-2 text-[11px] font-mono text-neutral-300">
            <span className="text-success mt-0.5 shrink-0">✓</span>
            <span>{check}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
