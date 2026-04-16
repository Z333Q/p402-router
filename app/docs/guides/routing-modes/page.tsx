import type { Metadata } from 'next';
import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Choose Routing Modes | P402 How-To Guides',
  description:
    'Pick the right P402 routing mode for your workload: cost, quality, speed, or balanced. Includes custom weight examples.',
  alternates: { canonical: 'https://p402.io/docs/guides/routing-modes' },
  openGraph: {
    title: 'Choose Routing Modes | P402',
    description: 'Cost, quality, speed, balanced — pick the right routing mode for every workload.',
    url: 'https://p402.io/docs/guides/routing-modes',
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

const MODES = [
  {
    name: 'cost',
    badge: 'DEFAULT',
    tagline: 'Cheapest model that answers the question.',
    description:
      'Selects the provider with the lowest per-token price for the request complexity. '
    + 'Combined with semantic caching, repeated queries cost $0.',
    typicalSavings: '70–95% vs direct GPT-4o',
    bestFor: ['High-volume batch processing', 'Classification and extraction', 'Summarisation pipelines', 'Budget agents with hard caps'],
    avoidFor: ['Legal or medical analysis requiring highest accuracy', 'Nuanced creative writing'],
    exampleProvider: 'DeepSeek V3 (≈ $0.27/M tokens)',
  },
  {
    name: 'quality',
    badge: null,
    tagline: 'Best model for accuracy and reasoning.',
    description:
      'Routes to the provider with the highest ELO benchmark score for the task type. '
    + 'Prefers frontier models: GPT-4o, Claude Opus, Gemini 1.5 Pro.',
    typicalSavings: '10–30% vs paying OpenAI directly',
    bestFor: ['Complex reasoning and math', 'Code generation and review', 'Legal/medical/financial analysis', 'Customer-facing chat that must be right'],
    avoidFor: ['High-volume low-stakes tasks (use cost mode)'],
    exampleProvider: 'GPT-4o or Claude Opus (auto-selected)',
  },
  {
    name: 'speed',
    badge: null,
    tagline: 'Lowest latency response.',
    description:
      'Selects the provider with the lowest current p95 latency. '
    + 'Prefers inference-optimised providers: Groq, Together, Fireworks.',
    typicalSavings: 'Up to 10× faster than standard providers',
    bestFor: ['Real-time chat interfaces', 'Streaming user-facing responses', 'Time-sensitive agentic loops', 'Interactive coding assistants'],
    avoidFor: ['Batch jobs where latency doesn\'t matter'],
    exampleProvider: 'Groq (Llama 3 70B, ≈ 300 tok/s)',
  },
  {
    name: 'balanced',
    badge: null,
    tagline: 'Equal weight across cost, quality, and speed.',
    description:
      'Equal (1/3) weight on cost, quality, and latency scores. '
    + 'A good default for mixed workloads where no single factor dominates.',
    typicalSavings: '40–60% vs direct GPT-4o',
    bestFor: ['General-purpose agents', 'Mixed workloads', 'Prototyping before tuning'],
    avoidFor: ['Workloads with a clear primary constraint — use the specific mode instead'],
    exampleProvider: 'Varies by request',
  },
];

export default function RoutingModesPage() {
  return (
    <div className="min-h-screen bg-white text-black selection:bg-primary selection:text-black">
      <TopNav />

      <div className="border-b-2 border-black bg-neutral-50">
        <div className="max-w-[860px] mx-auto px-6 py-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-neutral-500">
          <Link href="/docs" className="hover:text-black no-underline transition-colors">Docs</Link>
          <span>/</span>
          <span>How-To Guides</span>
          <span>/</span>
          <span className="text-black">Choose Routing Modes</span>
        </div>
      </div>

      <main className="max-w-[860px] mx-auto px-6 py-20">

        <div className="border-b-2 border-black pb-16 mb-16">
          <SectionLabel>DOCS / HOW-TO GUIDES</SectionLabel>
          <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tight leading-tight mb-6">
            CHOOSE<br />
            <span className="heading-accent">ROUTING MODE.</span>
          </h1>
          <div className="border-l-[4px] border-black pl-5 max-w-xl">
            <p className="text-lg text-neutral-600 leading-relaxed">
              Every P402 request routes to a different provider depending on your priority:
              cost, quality, speed, or a balanced blend of all three.
            </p>
          </div>
        </div>

        {/* ── HOW TO SET A MODE ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-4">How to Set a Mode</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Pass <span className="font-mono">mode</span> in the <span className="font-mono">p402</span> extension block.
            It applies to that request only. Omitting it defaults to <span className="font-mono">cost</span>.
          </p>
          <CodeBlock
            language="bash"
            code={`curl -s -X POST https://p402.io/api/v2/chat/completions \\
  -H "Authorization: Bearer $P402_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [{"role": "user", "content": "Review this contract clause..."}],
    "p402": {
      "mode": "quality",
      "cache": true,
      "session_id": "sess_01jx..."
    }
  }' | jq .`}
          />
        </div>

        {/* ── MODE CARDS ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-6">The Four Modes</h2>
          <div className="space-y-6">
            {MODES.map((mode) => (
              <div key={mode.name} className="border-2 border-black">
                <div className="flex items-center gap-4 px-6 py-4 border-b-2 border-black bg-neutral-50">
                  <span className="font-mono font-black text-lg">{mode.name}</span>
                  {mode.badge && (
                    <span className="text-[9px] font-black uppercase tracking-widest bg-primary text-black px-2 py-0.5 border border-black">
                      {mode.badge}
                    </span>
                  )}
                  <span className="text-sm text-neutral-600 italic ml-auto hidden sm:block">{mode.tagline}</span>
                </div>
                <div className="p-6">
                  <p className="text-sm text-neutral-600 leading-relaxed mb-5">{mode.description}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Best for</div>
                      <ul className="space-y-1">
                        {mode.bestFor.map((item) => (
                          <li key={item} className="text-neutral-700 flex items-start gap-1.5">
                            <span className="text-primary shrink-0 font-bold">✓</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Avoid for</div>
                      <ul className="space-y-1">
                        {mode.avoidFor.map((item) => (
                          <li key={item} className="text-neutral-400 flex items-start gap-1.5">
                            <span className="shrink-0">✗</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Typical savings</div>
                      <div className="font-black text-[15px]">{mode.typicalSavings}</div>
                      <div className="mt-2 text-[10px] font-black uppercase tracking-widest text-neutral-400">Example provider</div>
                      <div className="font-mono text-[13px] mt-0.5">{mode.exampleProvider}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── DECISION GUIDE ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-4">Quick Decision Guide</h2>
          <div className="border-2 border-black overflow-hidden">
            <div className="grid grid-cols-[2fr_1fr] bg-black text-white text-[10px] font-black uppercase tracking-widest">
              <div className="px-4 py-3">If your workload is…</div>
              <div className="px-4 py-3 border-l border-neutral-700">Use mode</div>
            </div>
            {[
              { scenario: 'Processing 10,000 documents overnight', mode: 'cost' },
              { scenario: 'Answering complex legal or medical questions', mode: 'quality' },
              { scenario: 'Streaming real-time chat to a user', mode: 'speed' },
              { scenario: 'General-purpose assistant with no specific constraint', mode: 'balanced' },
              { scenario: 'Classifying sentiment at scale', mode: 'cost' },
              { scenario: 'Generating production code that will be deployed', mode: 'quality' },
              { scenario: 'Autocomplete with < 300ms target latency', mode: 'speed' },
            ].map((row, i) => (
              <div
                key={row.scenario}
                className={`grid grid-cols-[2fr_1fr] text-sm ${i < 6 ? 'border-b border-neutral-200' : ''}`}
              >
                <div className="px-4 py-3 text-neutral-700">{row.scenario}</div>
                <div className="px-4 py-3 font-mono font-bold border-l border-neutral-200">{row.mode}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── WHAT'S NEXT ── */}
        <div className="border-t-2 border-black pt-16">
          <Callout variant="lime" title="What's next">
            <ul className="space-y-3">
              {[
                { label: 'Configure caching to make repeated requests free', href: '/docs/guides/caching' },
                { label: 'Understanding the Routing Engine', href: '/docs/router' },
                { label: 'Compare live provider prices', href: '/models' },
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
