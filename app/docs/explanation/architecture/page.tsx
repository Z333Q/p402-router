import type { Metadata } from 'next';
import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Architecture | Understanding P402',
  description:
    'How P402 works: the routing engine, payment layer, semantic cache, intelligence layer, and on-chain settlement — explained from first principles.',
  alternates: { canonical: 'https://p402.io/docs/explanation/architecture' },
  openGraph: {
    title: 'Architecture | P402',
    description: 'P402 system architecture: routing, caching, payment settlement, and AI governance.',
    url: 'https://p402.io/docs/explanation/architecture',
  },
};

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-neutral-500 font-mono mb-3">
      {'>_'} {children}
    </p>
  );
}

function Callout({
  children,
  variant = 'neutral',
  title,
}: {
  children: React.ReactNode;
  variant?: 'lime' | 'neutral' | 'warn';
  title?: string;
}) {
  const bg =
    variant === 'lime' ? 'bg-[#E9FFD0]' : variant === 'warn' ? 'bg-amber-50' : 'bg-neutral-50';
  return (
    <div className={`border-2 border-black p-5 ${bg}`}>
      {title && (
        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-16">
      <h2 className="text-2xl font-black uppercase italic tracking-tight mb-6 border-b-2 border-black pb-3">
        {title}
      </h2>
      {children}
    </div>
  );
}

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen bg-white text-black selection:bg-primary selection:text-black">
      <TopNav />

      <div className="border-b-2 border-black bg-neutral-50">
        <div className="max-w-[860px] mx-auto px-6 py-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-neutral-500">
          <Link href="/docs" className="hover:text-black no-underline transition-colors">Docs</Link>
          <span>/</span>
          <span>Understanding P402</span>
          <span>/</span>
          <span className="text-black">Architecture</span>
        </div>
      </div>

      <main className="max-w-[860px] mx-auto px-6 py-20">

        <div className="border-b-2 border-black pb-16 mb-16">
          <SectionLabel>DOCS / UNDERSTANDING P402</SectionLabel>
          <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tight leading-tight mb-6">
            HOW P402<br />
            <span className="heading-accent">WORKS.</span>
          </h1>
          <div className="border-l-[4px] border-black pl-5 max-w-xl">
            <p className="text-lg text-neutral-600 leading-relaxed">
              Five independent layers that work together: a routing engine, a semantic cache,
              a payment protocol, an intelligence layer, and on-chain settlement.
            </p>
          </div>
        </div>

        {/* ── REQUEST LIFECYCLE ── */}
        <Section title="Request Lifecycle">
          <p className="text-sm text-neutral-600 leading-relaxed mb-6">
            Every API call passes through five stages in under 50ms (cache hit) or ~1–3s (cache miss).
          </p>
          <div className="border-2 border-black overflow-hidden">
            {[
              {
                stage: '1',
                name: 'Auth & Billing Guard',
                time: '< 2ms',
                desc: 'API key verified against SHA-256 hash. Six billing guard layers evaluated in order (rate limit → daily cap → concurrency → anomaly → per-request cap → session budget reservation).',
              },
              {
                stage: '2',
                name: 'Semantic Cache Lookup',
                time: '< 10ms',
                desc: 'Prompt embedded with text-embedding-004. Cosine similarity search against stored embeddings. Hit → return cached response immediately. Miss → continue to routing.',
              },
              {
                stage: '3',
                name: 'Routing Engine',
                time: '< 5ms',
                desc: 'Scoring function selects the optimal provider based on mode (cost / quality / speed / balanced), live health status, historical latency, and ELO benchmark score.',
              },
              {
                stage: '4',
                name: 'LLM Call',
                time: '1–3s (provider)',
                desc: 'Request forwarded to selected provider\'s API. Response streamed back. P402 normalises the response into OpenAI-compatible format.',
              },
              {
                stage: '5',
                name: 'Post-processing',
                time: '< 5ms',
                desc: 'Cost recorded. Cache entry stored. Session budget debited. Intelligence layer logs for async analysis. p402_metadata appended to response.',
              },
            ].map((step, i) => (
              <div key={step.stage} className={`grid grid-cols-[3rem_1fr_5rem] gap-0 ${i < 4 ? 'border-b-2 border-black' : ''}`}>
                <div className="w-12 flex items-center justify-center bg-primary border-r-2 border-black font-black text-sm">
                  {step.stage}
                </div>
                <div className="p-5">
                  <div className="font-black text-[14px] uppercase tracking-tight mb-1">{step.name}</div>
                  <p className="text-sm text-neutral-600">{step.desc}</p>
                </div>
                <div className="p-5 flex items-center justify-end">
                  <span className="font-mono text-[11px] text-neutral-400 text-right">{step.time}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── ROUTING ENGINE ── */}
        <Section title="Routing Engine">
          <p className="text-sm text-neutral-600 leading-relaxed mb-6">
            The routing engine scores every available provider on each request and selects
            the winner. Provider health is continuously monitored via background probes.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {[
              { mode: 'cost', weight: '100% cost score ($/token)', desc: 'Selects the cheapest provider capable of handling the request. Often DeepSeek or Groq Llama for simple tasks.' },
              { mode: 'quality', weight: '100% quality score (ELO)', desc: 'Selects the provider with the highest benchmark score. Typically GPT-4o or Claude Opus for complex tasks.' },
              { mode: 'speed', weight: '100% speed score (p95 latency)', desc: 'Selects the provider with the lowest measured p95 latency. Typically Groq (300+ tok/s) for real-time UX.' },
              { mode: 'balanced', weight: '33% cost + 33% quality + 33% speed', desc: 'Equal weight. Good starting point for general-purpose agents before you know your constraint.' },
            ].map((m) => (
              <div key={m.mode} className="border-2 border-black p-5">
                <div className="font-mono font-black text-[15px] mb-1">{m.mode}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">{m.weight}</div>
                <p className="text-sm text-neutral-600">{m.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-neutral-600 leading-relaxed">
            13 providers are registered at launch: OpenAI, Anthropic, Google, Groq, DeepSeek,
            Mistral, Cohere, Together, Fireworks, Perplexity, AI21, and OpenRouter (as a meta-provider
            covering 200+ additional models).
          </p>
        </Section>

        {/* ── SEMANTIC CACHE ── */}
        <Section title="Semantic Cache">
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Most production AI systems answer the same questions repeatedly. The semantic cache
            stores responses indexed by embedding, not by exact string match.
          </p>
          <div className="space-y-3 mb-6">
            {[
              { label: 'Embedding model', value: 'Google text-embedding-004 (768 dimensions)' },
              { label: 'Similarity metric', value: 'Cosine similarity' },
              { label: 'Default threshold', value: '0.92 (configurable per request)' },
              { label: 'Storage', value: 'Redis — embeddings + response bodies' },
              { label: 'Scope', value: 'Tenant-scoped (not per-session or per-user)' },
              { label: 'Cache hit latency', value: '< 50ms (typically 10–20ms)' },
              { label: 'Cache hit cost', value: '$0.00' },
            ].map((row) => (
              <div key={row.label} className="flex items-start gap-4 text-sm border-b border-neutral-100 pb-3">
                <span className="font-black text-[11px] uppercase tracking-widest text-neutral-400 w-40 shrink-0 pt-0.5">{row.label}</span>
                <span className="font-mono text-neutral-700">{row.value}</span>
              </div>
            ))}
          </div>
          <Callout variant="neutral" title="Why 0.92?">
            <p className="text-sm text-neutral-700">
              At 0.92 similarity, questions like &quot;What is x402?&quot; and &quot;Can you explain the x402 protocol?&quot;
              are matched. At 0.85, unrelated questions start to collide. At 0.98, only near-identical
              phrasings match. 0.92 is the empirically optimal threshold for developer documentation and
              FAQ-style queries.
            </p>
          </Callout>
        </Section>

        {/* ── PAYMENT LAYER ── */}
        <Section title="Payment Layer (x402)">
          <p className="text-sm text-neutral-600 leading-relaxed mb-6">
            P402 implements the x402 payment protocol — a machine-native payment standard
            where HTTP 402 &quot;Payment Required&quot; becomes a first-class response with a signed
            authorization that settles on-chain.
          </p>
          <div className="border-2 border-black p-6 bg-neutral-50 mb-6">
            <div className="space-y-2 text-sm font-mono">
              <div className="flex items-start gap-3">
                <span className="text-neutral-400 w-5">1.</span>
                <span>Client signs an EIP-3009 <strong>TransferWithAuthorization</strong> (off-chain, gasless)</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-neutral-400 w-5">2.</span>
                <span>Signed payload submitted to P402 Facilitator</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-neutral-400 w-5">3.</span>
                <span>Facilitator verifies signature, amount, expiry, and nonce</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-neutral-400 w-5">4.</span>
                <span>Facilitator executes <strong>transferWithAuthorization</strong> on USDC contract (pays gas)</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-neutral-400 w-5">5.</span>
                <span>Settlement confirmed on Base in ~2 seconds</span>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Network', value: 'Base Mainnet (Chain ID: 8453, CAIP-2: eip155:8453)' },
              { label: 'Token', value: 'USDC — 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
              { label: 'Treasury', value: '0xFa772434DCe6ED78831EbC9eeAcbDF42E2A031a6' },
              { label: 'Settlement contract', value: '0xd03c7ab9a84d86dbc171367168317d6ebe408601 (P402Settlement.sol)' },
              { label: 'Gas', value: 'Paid by P402 Facilitator (never the user or agent)' },
              { label: 'Replay protection', value: 'EIP-3009 nonce tracked in PostgreSQL + Redis' },
            ].map((row) => (
              <div key={row.label} className="flex items-start gap-4 text-sm border-b border-neutral-100 pb-3">
                <span className="font-black text-[11px] uppercase tracking-widest text-neutral-400 w-40 shrink-0 pt-0.5">{row.label}</span>
                <span className="font-mono text-neutral-700 break-all">{row.value}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ── INTELLIGENCE LAYER ── */}
        <Section title="Intelligence Layer">
          <p className="text-sm text-neutral-600 leading-relaxed mb-6">
            Two Gemini models run continuously in the background to protect against cost
            anomalies and to optimise routing decisions over time.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                name: 'Sentinel (Gemini Flash)',
                role: 'Real-time Anomaly Detection',
                desc: 'Monitors spend velocity every 60 seconds. If spend spikes 10× above the 7-day baseline, Sentinel pauses the tenant\'s traffic and sends an alert. Designed to catch prompt-injection billing attacks before they cause damage.',
                trigger: 'Automatic — no configuration required',
              },
              {
                name: 'Economist (Gemini Pro)',
                role: 'Protocol Optimisation',
                desc: 'Analyses routing decisions asynchronously. Identifies patterns — e.g. 90% of quality-mode requests could be served by a cheaper model with equivalent accuracy for that tenant\'s workload — and surfaces recommendations in Dashboard → Intelligence.',
                trigger: 'Async — results in Dashboard',
              },
            ].map((model) => (
              <div key={model.name} className="border-2 border-black p-6">
                <div className="font-black text-[14px] uppercase tracking-tight mb-1">{model.name}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3">{model.role}</div>
                <p className="text-sm text-neutral-600 mb-3">{model.desc}</p>
                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Trigger</div>
                <div className="text-[13px] font-mono text-neutral-700 mt-0.5">{model.trigger}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── AGENT IDENTITY ── */}
        <Section title="Agent Identity (ERC-8004)">
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            P402 supports ERC-8004 Trustless Agent Identity — an on-chain registry where
            agents have cryptographic DIDs, on-chain reputation scores, and verifiable
            spending histories.
          </p>
          <div className="space-y-3">
            {[
              { label: 'Identity Registry', value: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 (Base)' },
              { label: 'Reputation Registry', value: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63 (Base)' },
              { label: 'DID format', value: 'did:p402:agent:{agentId}' },
              { label: 'Reputation', value: 'Score from 0–100, updated after each task' },
            ].map((row) => (
              <div key={row.label} className="flex items-start gap-4 text-sm border-b border-neutral-100 pb-3">
                <span className="font-black text-[11px] uppercase tracking-widest text-neutral-400 w-40 shrink-0 pt-0.5">{row.label}</span>
                <span className="font-mono text-neutral-700 break-all">{row.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Link href="/docs/erc8004" className="text-[13px] font-bold text-black border-b-2 border-black hover:border-primary transition-colors no-underline">
              Read the ERC-8004 documentation →
            </Link>
          </div>
        </Section>

        {/* ── WHAT'S NEXT ── */}
        <div className="border-t-2 border-black pt-16">
          <Callout variant="lime" title="Go deeper">
            <ul className="space-y-3">
              {[
                { label: 'x402 Protocol — payment mechanics', href: '/docs/facilitator' },
                { label: 'Routing Engine — scoring algorithm detail', href: '/docs/router' },
                { label: 'Security Model', href: '/docs/explanation/security' },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="flex items-start gap-2 text-[15px] font-bold text-black no-underline group">
                    <span className="text-neutral-600 group-hover:text-black transition-colors shrink-0">→</span>
                    <span className="border-b-2 border-black group-hover:border-primary transition-colors">{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Callout>
        </div>

      </main>
      <Footer />
    </div>
  );
}
