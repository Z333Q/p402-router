import type { Metadata } from 'next';
import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Routing Engine | P402 Docs',
  description:
    'How P402 routes AI requests: semantic cache, provider scoring, automatic failover, and the four routing modes. Complete reference with scoring algorithm and configuration.',
  alternates: { canonical: 'https://p402.io/docs/router' },
  openGraph: {
    title: 'P402 Routing Engine — How Routing Works',
    description:
      'Semantic cache, provider scoring algorithm, automatic failover, and four routing modes. Route 300+ models intelligently.',
    url: 'https://p402.io/docs/router',
  },
};

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-neutral-500 font-mono mb-3">
      {'>_'} {children}
    </p>
  );
}

function CodeBlock({ code, language = '' }: { code: string; language?: string }) {
  return (
    <div className="border-2 border-black bg-[#141414] overflow-x-auto">
      {language && (
        <div className="px-4 py-1.5 border-b border-neutral-700 text-[10px] font-black uppercase tracking-widest text-neutral-500 font-mono">
          {language}
        </div>
      )}
      <pre className="p-6 text-[#F5F5F5] font-mono text-sm leading-relaxed whitespace-pre">
        <code>{code}</code>
      </pre>
    </div>
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

export default function RouterDocs() {
  return (
    <div className="min-h-screen bg-white text-black selection:bg-primary selection:text-black">
      <TopNav />

      <div className="border-b-2 border-black bg-neutral-50">
        <div className="max-w-[860px] mx-auto px-6 py-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-neutral-500">
          <Link href="/docs" className="hover:text-black no-underline transition-colors">Docs</Link>
          <span>/</span>
          <span>Explanation</span>
          <span>/</span>
          <span className="text-black">Routing Engine</span>
        </div>
      </div>

      <main className="max-w-[860px] mx-auto px-6 py-20">

        {/* ── HEADING ── */}
        <div className="border-b-2 border-black pb-16 mb-16">
          <SectionLabel>DOCS / EXPLANATION</SectionLabel>
          <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tight leading-tight mb-6">
            THE ROUTING<br />
            <span className="heading-accent">ENGINE.</span>
          </h1>
          <div className="border-l-[4px] border-black pl-5 max-w-xl">
            <p className="text-lg text-neutral-600 leading-relaxed">
              Every request passes through three stages in order: semantic cache lookup,
              provider scoring, and execution with automatic failover. This page explains
              exactly how each stage works.
            </p>
          </div>
        </div>

        {/* ── THREE STAGES ── */}
        <div className="mb-16">
          <h2 className="text-2xl font-black uppercase italic tracking-tight mb-6">
            The Three Stages
          </h2>
          <div className="space-y-0 border-2 border-black">
            {[
              {
                n: '01',
                label: 'Semantic Cache',
                detail:
                  'The request is embedded using Google text-embedding-004 and compared against recent responses stored in Redis. If cosine similarity exceeds 0.92, the cached response is returned immediately — no LLM call, no cost.',
              },
              {
                n: '02',
                label: 'Provider Scoring',
                detail:
                  'All healthy providers are scored against your chosen routing mode (cost, speed, quality, or balanced). The top scorer is selected as the primary candidate. Two backup candidates are retained for failover.',
              },
              {
                n: '03',
                label: 'Execution + Failover',
                detail:
                  'The primary provider is called. On any failure — rate limit, timeout, 5xx — the router automatically retries with the next-ranked provider. This happens transparently; your client sees one clean response.',
              },
            ].map((stage, i) => (
              <div key={stage.n} className={`flex gap-6 p-6 ${i < 2 ? 'border-b-2 border-black' : ''}`}>
                <div className="font-mono text-[11px] font-black text-neutral-400 uppercase tracking-widest w-8 shrink-0 pt-1">
                  {stage.n}
                </div>
                <div>
                  <div className="font-black uppercase tracking-tight text-base mb-2">{stage.label}</div>
                  <p className="text-sm text-neutral-600 leading-relaxed">{stage.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SCORING ALGORITHM ── */}
        <div className="mb-16">
          <h2 className="text-2xl font-black uppercase italic tracking-tight mb-4">
            Scoring Algorithm
          </h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-6">
            Each provider candidate receives a composite score between 0 and 1. The weights shift
            depending on the routing mode you specify. A provider that is{' '}
            <span className="font-mono">down</span> or <span className="font-mono">degraded</span>{' '}
            is penalized before any mode-specific scoring.
          </p>

          <div className="border-2 border-black overflow-hidden mb-6">
            <div className="bg-black px-4 py-2 text-[10px] font-black uppercase tracking-widest text-primary font-mono">
              Scoring Factors
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-black bg-neutral-50">
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">Factor</th>
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">Source</th>
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['success_rate', 'DB: facilitator_health', '7-day rolling success ratio. A provider at 99% beats one at 95%.'],
                  ['p95_settle_ms', 'DB: facilitator_health', '95th-percentile latency in ms. Weighted heavily in speed mode.'],
                  ['cost_per_1k_tokens', 'lib/ai-providers/registry.ts', 'Input + output token price. Primary factor in cost mode.'],
                  ['reputation_score', 'ERC-8004 on-chain', 'On-chain reputation from ERC-8004 registry. Normalized 0–1.'],
                  ['health_status', 'Live health probe', 'healthy=1.0, degraded=0.5, down=0. Applied as a multiplier.'],
                ].map(([factor, source, desc]) => (
                  <tr key={factor} className="border-b border-neutral-200 last:border-0">
                    <td className="px-4 py-3 font-mono text-[12px] text-black font-bold">{factor}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-neutral-500">{source}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-2 border-black overflow-hidden">
            <div className="bg-black px-4 py-2 text-[10px] font-black uppercase tracking-widest text-primary font-mono">
              Weight Distribution by Mode
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-black bg-neutral-50">
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">Mode</th>
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">Cost</th>
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">Speed</th>
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">Quality</th>
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">Reliability</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['cost',     '70%', '10%', '10%', '10%'],
                  ['speed',    '10%', '70%', '10%', '10%'],
                  ['quality',  '10%', '10%', '70%', '10%'],
                  ['balanced', '25%', '25%', '25%', '25%'],
                ].map(([mode, cost, speed, quality, rel]) => (
                  <tr key={mode} className="border-b border-neutral-200 last:border-0">
                    <td className="px-4 py-3 font-mono text-[12px] font-bold">{mode}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{cost}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{speed}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{quality}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{rel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── SEMANTIC CACHE ── */}
        <div className="mb-16">
          <h2 className="text-2xl font-black uppercase italic tracking-tight mb-4">
            Semantic Cache Detail
          </h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-6">
            The cache is tenant-scoped — one tenant&apos;s responses never leak to another.
            The similarity threshold of <span className="font-mono font-bold">0.92</span> is the
            empirically calibrated default: high enough to block hallucination-risk false positives,
            low enough to catch paraphrased duplicates.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-black border-2 border-black mb-6">
            {[
              { label: 'Embedding model', value: 'text-embedding-004 (Google)' },
              { label: 'Similarity metric', value: 'Cosine similarity' },
              { label: 'Default threshold', value: '0.92 (configurable per request)' },
              { label: 'Storage backend', value: 'Redis with vector index' },
              { label: 'Scope', value: 'Per-tenant (never shared across accounts)' },
              { label: 'Cache hit latency', value: '< 50ms (vs 1–10s for LLM call)' },
              { label: 'Cache hit cost', value: '$0.00' },
              { label: 'TTL', value: '24 hours (default)' },
            ].map((row) => (
              <div key={row.label} className="p-4 bg-white flex gap-3">
                <div className="font-black text-[11px] uppercase tracking-widest text-neutral-500 w-40 shrink-0 pt-0.5">
                  {row.label}
                </div>
                <div className="font-mono text-sm text-neutral-700">{row.value}</div>
              </div>
            ))}
          </div>
          <Callout variant="warn" title="Opt out of caching">
            <p className="text-sm text-neutral-700">
              To bypass the cache for a specific request (e.g., real-time data queries), set{' '}
              <span className="font-mono">{'"cache": false'}</span> in the{' '}
              <span className="font-mono">p402</span> object. The request will still be routed
              normally but the response will not be stored.
            </p>
          </Callout>
        </div>

        {/* ── FAILOVER ── */}
        <div className="mb-16">
          <h2 className="text-2xl font-black uppercase italic tracking-tight mb-4">
            Automatic Failover
          </h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-6">
            The router holds a ranked list of three provider candidates for every request.
            If the top-ranked provider fails for any reason, the router immediately retries
            with the next candidate — no delay, no error surfaced to your client.
          </p>
          <div className="space-y-0 border-2 border-black mb-6">
            {[
              { trigger: 'HTTP 429 (rate limit)', action: 'Immediate retry with candidate #2' },
              { trigger: 'HTTP 5xx (server error)', action: 'Immediate retry with candidate #2' },
              { trigger: 'Connection timeout (> 30s)', action: 'Abort + retry with candidate #2' },
              { trigger: 'All 3 candidates fail', action: 'Return HTTP 503 with PROVIDER_UNAVAILABLE' },
              { trigger: 'Budget exceeded mid-stream', action: 'Return HTTP 403 with BUDGET_EXCEEDED; no retry' },
            ].map((row, i) => (
              <div key={row.trigger} className={`grid grid-cols-2 gap-0 ${i < 4 ? 'border-b-2 border-black' : ''}`}>
                <div className="px-4 py-3 font-mono text-[12px] font-bold bg-neutral-50 border-r-2 border-black">
                  {row.trigger}
                </div>
                <div className="px-4 py-3 text-sm text-neutral-600">{row.action}</div>
              </div>
            ))}
          </div>
          <Callout variant="neutral" title="Failover is transparent">
            <p className="text-sm text-neutral-700">
              The <span className="font-mono">p402_metadata.provider</span> field in the response
              tells you which provider actually served the request. If failover occurred, this will
              differ from what you might expect based on your mode. You can use this to diagnose
              provider degradation.
            </p>
          </Callout>
        </div>

        {/* ── OPENROUTER ── */}
        <div className="mb-16">
          <h2 className="text-2xl font-black uppercase italic tracking-tight mb-4">
            OpenRouter Meta-Provider
          </h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-6">
            P402 treats OpenRouter as a single provider that proxies 300+ models. When your routing
            mode selects OpenRouter, the model within OpenRouter is further optimized based on your
            mode. This means you get access to every new frontier model the moment OpenRouter adds
            it — no adapter changes required on your end.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-black border-2 border-black">
            {[
              { title: 'Model freshness', desc: 'GPT-4.1, Claude 4.5, Gemini 2.0 Pro available the day they land on OpenRouter.' },
              { title: 'Unified billing', desc: 'One OPENROUTER_API_KEY covers all 300+ models. P402 adds a transparent 1% routing fee on top.' },
              { title: 'Fallback depth', desc: 'If your primary direct provider (e.g. Anthropic) fails, OpenRouter serves as a deep fallback pool.' },
              { title: 'Model pinning', desc: 'Force a specific model with "model": "anthropic/claude-opus-4" in configuration.' },
            ].map((item) => (
              <div key={item.title} className="p-6 bg-white">
                <div className="font-black text-[13px] uppercase tracking-tight mb-2">{item.title}</div>
                <p className="text-sm text-neutral-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── CONFIGURATION ── */}
        <div className="mb-16">
          <h2 className="text-2xl font-black uppercase italic tracking-tight mb-4">
            Per-Request Configuration
          </h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-6">
            The <span className="font-mono">p402</span> object in your request body controls routing
            behavior for that request. All fields are optional; omitting them uses account defaults.
          </p>
          <CodeBlock
            language="json — p402 configuration object"
            code={`{
  "messages": [...],
  "p402": {
    "mode": "cost",          // "cost" | "speed" | "quality" | "balanced"
    "cache": true,           // true = use semantic cache (default: true)
    "session_id": "ses_...", // budget-capped session (optional)
    "max_cost_usd": 0.01,    // hard ceiling per request (optional)
    "provider": "anthropic", // force a specific provider (optional)
    "model": "claude-opus-4" // force a specific model (optional)
  }
}`}
          />
          <div className="mt-4 space-y-4">
            {[
              { field: 'mode', detail: 'Selects the weight profile for provider scoring. Defaults to "balanced" if not set.' },
              { field: 'cache', detail: 'Set false to skip semantic cache lookup and storage for this request. Useful for real-time or personalized responses.' },
              { field: 'session_id', detail: 'Attaches this request to a budget-capped session. Requests that would exceed the session budget return HTTP 403 before the LLM is called.' },
              { field: 'max_cost_usd', detail: 'A per-request cost ceiling. If the cheapest available provider exceeds this, you get COST_LIMIT_EXCEEDED rather than a surprise charge.' },
              { field: 'provider', detail: 'Bypasses scoring entirely and routes to this specific provider. Use for compliance requirements or testing. Falls back to normal routing if the provider is down.' },
              { field: 'model', detail: 'Forces a specific model. The provider that serves this model is selected automatically unless you also specify provider.' },
            ].map((item) => (
              <div key={item.field} className="flex gap-4 text-sm">
                <div className="font-mono font-bold text-black w-32 shrink-0 pt-0.5">{item.field}</div>
                <div className="text-neutral-600 leading-relaxed">{item.detail}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RESPONSE METADATA ── */}
        <div className="mb-16">
          <h2 className="text-2xl font-black uppercase italic tracking-tight mb-4">
            Routing Decision in the Response
          </h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Every response includes a <span className="font-mono">p402_metadata</span> field that
            tells you exactly what happened: which provider was selected, what it cost, and whether
            the response came from cache.
          </p>
          <CodeBlock
            language="json — p402_metadata"
            code={`{
  "p402_metadata": {
    "provider": "deepseek",        // Provider that served the request
    "model": "deepseek-v3",        // Model used
    "cost_usd": 0.0003,            // What you were charged
    "direct_cost": 0.0031,         // What GPT-4o would have cost
    "savings": 0.0028,             // Savings from intelligent routing
    "input_tokens": 24,
    "output_tokens": 187,
    "cached": false,               // true = served from semantic cache
    "latency_ms": 1240,            // Time from request to first token
    "mode": "cost",                // Mode used for this request
    "failover": false              // true = primary provider failed, used fallback
  }
}`}
          />
        </div>

        {/* ── WHAT'S NEXT ── */}
        <div className="border-t-2 border-black pt-16">
          <Callout variant="lime" title="Related docs">
            <ul className="space-y-3">
              {[
                { label: 'Routing modes — choose the right mode for your use case', href: '/docs/guides/routing-modes' },
                { label: 'Semantic caching — configure thresholds and TTL', href: '/docs/guides/caching' },
                { label: 'Architecture — the full request lifecycle with timing', href: '/docs/explanation/architecture' },
                { label: 'API reference — /api/v1/router/plan and /settle', href: '/docs/api' },
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
