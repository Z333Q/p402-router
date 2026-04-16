import type { Metadata } from 'next';
import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Configure Caching | P402 How-To Guides',
  description:
    'P402\'s semantic cache returns identical responses in < 50ms at zero cost. Learn how to enable it, tune similarity thresholds, and monitor cache performance.',
  alternates: { canonical: 'https://p402.io/docs/guides/caching' },
  openGraph: {
    title: 'Configure Caching | P402',
    description: 'Semantic cache: repeated queries served in < 50ms at $0.',
    url: 'https://p402.io/docs/guides/caching',
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

export default function CachingPage() {
  return (
    <div className="min-h-screen bg-white text-black selection:bg-primary selection:text-black">
      <TopNav />

      <div className="border-b-2 border-black bg-neutral-50">
        <div className="max-w-[860px] mx-auto px-6 py-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-neutral-500">
          <Link href="/docs" className="hover:text-black no-underline transition-colors">Docs</Link>
          <span>/</span>
          <span>How-To Guides</span>
          <span>/</span>
          <span className="text-black">Configure Caching</span>
        </div>
      </div>

      <main className="max-w-[860px] mx-auto px-6 py-20">

        <div className="border-b-2 border-black pb-16 mb-16">
          <SectionLabel>DOCS / HOW-TO GUIDES</SectionLabel>
          <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tight leading-tight mb-6">
            CONFIGURE<br />
            <span className="heading-accent">CACHING.</span>
          </h1>
          <div className="border-l-[4px] border-black pl-5 max-w-xl">
            <p className="text-lg text-neutral-600 leading-relaxed">
              P402&apos;s semantic cache recognises questions that mean the same thing —
              even when worded differently — and returns the stored answer in under 50ms at zero cost.
            </p>
          </div>
        </div>

        {/* ── HOW IT WORKS ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-4">How Semantic Caching Works</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-6">
            Unlike a key-value cache that requires byte-for-byte identical input, P402 embeds
            every prompt using <span className="font-mono">text-embedding-004</span> and compares
            it against stored embeddings using cosine similarity. If the similarity score exceeds
            the threshold (default 0.92), the cached response is returned immediately.
          </p>
          <div className="border-2 border-black bg-neutral-50 p-6">
            <div className="space-y-4 font-mono text-sm">
              <div className="flex items-start gap-3">
                <span className="font-black text-black w-5 shrink-0">1.</span>
                <span>Request arrives → P402 embeds the prompt</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-black text-black w-5 shrink-0">2.</span>
                <span>Cosine similarity search across stored embeddings</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-black text-black w-5 shrink-0">3a.</span>
                <div>
                  <span className="text-green-600 font-bold">HIT (similarity ≥ 0.92)</span>
                  <span> → return cached response, $0 cost, &lt; 50ms</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-black text-black w-5 shrink-0">3b.</span>
                <div>
                  <span className="text-neutral-400 font-bold">MISS</span>
                  <span> → route to LLM → store response + embedding</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Callout variant="neutral" title="Example: semantic match">
              <div className="space-y-2 text-sm font-mono">
                <div><span className="text-neutral-400">Stored:</span>  <span className="text-[#F5F5F5] bg-neutral-800 px-2 py-0.5">&quot;What is the x402 payment protocol?&quot;</span></div>
                <div><span className="text-neutral-400">Query:  </span>  <span className="text-[#F5F5F5] bg-neutral-800 px-2 py-0.5">&quot;Can you explain what x402 is?&quot;</span></div>
                <div><span className="text-green-600 font-bold">→ CACHE HIT</span> <span className="text-neutral-500">(similarity: 0.947)</span></div>
              </div>
            </Callout>
          </div>
        </div>

        {/* ── ENABLE CACHE ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-4">Enable Caching</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Set <span className="font-mono">cache: true</span> in the <span className="font-mono">p402</span> block.
            That&apos;s it — no configuration required.
          </p>
          <CodeBlock
            language="bash"
            code={`curl -s -X POST https://p402.io/api/v2/chat/completions \\
  -H "Authorization: Bearer $P402_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [{"role": "user", "content": "What is the x402 protocol?"}],
    "p402": {
      "mode": "cost",
      "cache": true
    }
  }' | jq .p402_metadata`}
          />
          <div className="mt-4">
            <CodeBlock
              code={`// First request — cache miss
{
  "provider": "deepseek",
  "cost_usd": 0.0003,
  "cached": false,
  "latency_ms": 1240
}

// Second request (identical or semantically similar)
{
  "provider": "cache",
  "cost_usd": 0.0000,
  "cached": true,
  "latency_ms": 12
}`}
            />
          </div>
        </div>

        {/* ── DISABLE CACHE ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-4">Disable Caching</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Set <span className="font-mono">cache: false</span> to always hit the live LLM.
            Use this for time-sensitive data, personalised responses, or when freshness is required.
          </p>
          <CodeBlock
            language="bash"
            code={`-d '{
  "messages": [{"role": "user", "content": "What is the current ETH price?"}],
  "p402": {
    "mode": "speed",
    "cache": false    // ← always fresh
  }
}'`}
          />
        </div>

        {/* ── CACHE STATS ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-4">Monitor Cache Performance</h2>
          <CodeBlock
            language="bash"
            code={`# Cache stats for your account
curl -s https://p402.io/api/v2/cache/stats \\
  -H "Authorization: Bearer $P402_API_KEY" | jq .`}
          />
          <div className="mt-4">
            <Callout variant="neutral" title="Cache stats response">
              <CodeBlock
                code={`{
  "total_requests": 10420,
  "cache_hits": 3891,
  "hit_rate": 0.374,           // 37.4% of requests served from cache
  "cost_saved_usd": 1.24,      // Money saved vs. always hitting the LLM
  "avg_cache_latency_ms": 14,
  "avg_llm_latency_ms": 1380,
  "entries": 2204,             // Unique prompts stored
  "size_mb": 8.2
}`}
              />
            </Callout>
          </div>

          <div className="mt-6">
            <CodeBlock
              language="bash"
              code={`# Clear your cache (all entries)
curl -s -X POST https://p402.io/api/v2/cache/clear \\
  -H "Authorization: Bearer $P402_API_KEY" | jq .`}
            />
          </div>
        </div>

        {/* ── CACHE BEST PRACTICES ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-4">Best Practices</h2>
          <div className="space-y-4">
            {[
              {
                title: 'Always enable caching on read-heavy workloads',
                body: 'FAQ bots, documentation assistants, and knowledge-base agents often see 40–80% hit rates. Every hit costs nothing.',
              },
              {
                title: 'Disable caching for real-time or personalised data',
                body: 'Stock prices, live inventory, per-user personalised content — set cache: false to guarantee fresh LLM output.',
              },
              {
                title: 'Cache persists across sessions',
                body: 'The cache is tenant-scoped, not session-scoped. If user A asks a question, user B\'s identical question is also a cache hit — free for both.',
              },
              {
                title: 'System prompts affect cache keys',
                body: 'Changing the system prompt produces a different embedding and a cache miss. Keep system prompts stable for maximum hit rate.',
              },
            ].map((item) => (
              <div key={item.title} className="border-2 border-black p-5">
                <div className="font-black text-[13px] uppercase tracking-tight mb-2">{item.title}</div>
                <p className="text-sm text-neutral-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── WHAT'S NEXT ── */}
        <div className="border-t-2 border-black pt-16">
          <Callout variant="lime" title="What's next">
            <ul className="space-y-3">
              {[
                { label: 'Manage Sessions — budget tracking with cache stats', href: '/docs/guides/sessions' },
                { label: 'Choose routing modes', href: '/docs/guides/routing-modes' },
                { label: 'API Reference — cache endpoints', href: '/docs/api' },
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
