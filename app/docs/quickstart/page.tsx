import type { Metadata } from 'next';
import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Quickstart: Your First Routed Request | P402',
  description:
    'Send a chat completion through P402 in under 5 minutes. No SDK, no dependencies. Just curl.',
  alternates: { canonical: 'https://p402.io/docs/quickstart' },
  openGraph: {
    title: 'Quickstart | P402',
    description: 'Send a chat completion through P402 in under 5 minutes. No SDK, no dependencies.',
    url: 'https://p402.io/docs/quickstart',
  },
};

// ─── SHARED PRIMITIVES ───────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-neutral-500 font-mono mb-3">
      {'>_'} {children}
    </p>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <div className="w-9 h-9 bg-primary border-2 border-black flex items-center justify-center font-black text-sm shrink-0">
      {n}
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="border-2 border-black bg-[#141414] overflow-x-auto">
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
  variant?: 'lime' | 'neutral';
  title?: string;
}) {
  return (
    <div
      className={`border-2 border-black p-5 ${
        variant === 'lime' ? 'bg-[#E9FFD0]' : 'bg-neutral-50'
      }`}
    >
      {title && (
        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

// ─── PAGE ────────────────────────────────────────────────────────────────────

export default function QuickstartPage() {
  return (
    <div className="min-h-screen bg-white text-black selection:bg-primary selection:text-black">
      <TopNav />

      {/* Breadcrumb */}
      <div className="border-b-2 border-black bg-neutral-50">
        <div className="max-w-[860px] mx-auto px-6 py-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-neutral-500">
          <Link href="/docs" className="hover:text-black no-underline transition-colors">
            Docs
          </Link>
          <span>/</span>
          <span>Tutorials</span>
          <span>/</span>
          <span className="text-black">Quickstart</span>
        </div>
      </div>

      <main className="max-w-[860px] mx-auto px-6 py-20">

        {/* ── PAGE HEADING ── */}
        <div className="border-b-2 border-black pb-16 mb-16">
          <SectionLabel>DOCS / TUTORIAL</SectionLabel>
          <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tight leading-tight mb-6">
            YOUR FIRST<br />
            <span className="heading-accent">ROUTED REQUEST.</span>
          </h1>
          <div className="border-l-[4px] border-black pl-5 max-w-xl">
            <p className="text-lg text-neutral-600 leading-relaxed">
              Send a chat completion through P402 in under 5 minutes.
              No SDK, no dependencies. Just curl.
            </p>
          </div>
        </div>

        {/* ── PREREQUISITES ── */}
        <div className="mb-16">
          <Callout variant="neutral" title="Prerequisites">
            <ul className="space-y-2 text-sm text-neutral-700">
              <li className="flex items-start gap-2">
                <span className="font-mono font-bold shrink-0">1.</span>
                <span>
                  A P402 API key —{' '}
                  <Link href="https://p402.io/login" className="font-bold text-black border-b-2 border-black hover:border-primary transition-colors no-underline">
                    create one free at p402.io
                  </Link>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono font-bold shrink-0">2.</span>
                <span>
                  <span className="font-mono">curl</span> installed (comes with macOS and most Linux
                  distros)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono font-bold shrink-0">3.</span>
                <span>
                  Optional:{' '}
                  <span className="font-mono">jq</span> for pretty-printing JSON responses
                </span>
              </li>
            </ul>
          </Callout>
        </div>

        {/* ── STEP 1 ── */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-6">
            <StepNumber n={1} />
            <h2 className="text-2xl font-black uppercase italic tracking-tight">
              Verify Your API Key
            </h2>
          </div>
          <CodeBlock
            code={`curl -s https://p402.io/api/v2/health \\
  -H "Authorization: Bearer $P402_API_KEY" | jq .`}
          />
          <div className="mt-4">
            <Callout variant="neutral" title="Expected response">
              <CodeBlock
                code={`{
  "status": "healthy",
  "version": "2.0.0",
  "providers": 13,
  "cache": "connected",
  "timestamp": "2026-04-15T12:00:00.000Z"
}`}
              />
            </Callout>
          </div>
        </div>

        {/* ── STEP 2 ── */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-6">
            <StepNumber n={2} />
            <h2 className="text-2xl font-black uppercase italic tracking-tight">
              Create a Session
            </h2>
          </div>
          <CodeBlock
            code={`curl -s -X POST https://p402.io/api/v2/sessions \\
  -H "Authorization: Bearer $P402_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"budget_usd": 5}' | jq .`}
          />
          <p className="mt-4 text-sm text-neutral-600 leading-relaxed">
            This creates a budget-capped session. All requests using this{' '}
            <span className="font-mono">session_id</span> are tracked against the $5 budget.
            Save the returned <span className="font-mono">session_id</span> for the next step.
          </p>
        </div>

        {/* ── STEP 3 ── */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-6">
            <StepNumber n={3} />
            <h2 className="text-2xl font-black uppercase italic tracking-tight">
              Send a Chat Completion
            </h2>
          </div>
          <CodeBlock
            code={`curl -s -X POST https://p402.io/api/v2/chat/completions \\
  -H "Authorization: Bearer $P402_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [{"role": "user", "content": "What is the x402 protocol?"}],
    "p402": {
      "mode": "cost",
      "cache": true,
      "session_id": "YOUR_SESSION_ID"
    }
  }' | jq .`}
          />
        </div>

        {/* ── STEP 4 ── */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-6">
            <StepNumber n={4} />
            <h2 className="text-2xl font-black uppercase italic tracking-tight">
              Read the Response Metadata
            </h2>
          </div>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Every P402 response includes a{' '}
            <span className="font-mono">p402_metadata</span> object. This tells you which model was
            selected, how much it cost, what the direct cost would have been without routing, how
            much you saved, and whether the response was cached.
          </p>
          <CodeBlock
            code={`{
  "choices": [{ "message": { "content": "..." } }],
  "p402_metadata": {
    "provider": "deepseek",       // P402 selected DeepSeek (cheapest for this query)
    "model": "deepseek-v3",
    "cost_usd": 0.0003,           // What you paid
    "direct_cost": 0.0031,        // What GPT-4o would have cost
    "savings": 0.0028,            // You saved 90%
    "input_tokens": 24,
    "output_tokens": 187,
    "cached": false,              // First request; next identical query returns from cache
    "latency_ms": 1240
  }
}`}
          />
        </div>

        {/* ── STEP 5 ── */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-6">
            <StepNumber n={5} />
            <h2 className="text-2xl font-black uppercase italic tracking-tight">
              Try a Cached Request
            </h2>
          </div>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Send the exact same request again. P402&apos;s semantic cache recognizes it and returns
            the cached response at zero cost in under 50ms.
          </p>
          <CodeBlock
            code={`curl -s -X POST https://p402.io/api/v2/chat/completions \\
  -H "Authorization: Bearer $P402_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [{"role": "user", "content": "What is the x402 protocol?"}],
    "p402": {
      "mode": "cost",
      "cache": true,
      "session_id": "YOUR_SESSION_ID"
    }
  }' | jq .p402_metadata`}
          />
          <div className="mt-4">
            <Callout variant="neutral" title="Cached response">
              <CodeBlock
                code={`{
  "provider": "cache",
  "model": null,
  "cost_usd": 0.0000,
  "cached": true,
  "latency_ms": 12
}`}
              />
            </Callout>
          </div>
        </div>

        {/* ── WHAT'S NEXT ── */}
        <div className="border-t-2 border-black pt-16">
          <Callout variant="lime" title="What's next">
            <p className="text-sm font-medium text-neutral-700 mb-5">
              You just routed your first request and saw the cache in action.
              Here is where to go next:
            </p>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/docs/guides/agents"
                  className="flex items-start gap-2 text-[15px] font-bold text-black no-underline group"
                >
                  <span className="text-neutral-600 group-hover:text-black transition-colors shrink-0">
                    →
                  </span>
                  <span className="border-b-2 border-black group-hover:border-primary transition-colors">
                    Connect your agent
                  </span>
                </Link>
              </li>
              <li>
                <span className="flex items-start gap-2 text-[15px] font-medium text-neutral-400 cursor-not-allowed">
                  <span className="shrink-0">→</span>
                  <span>
                    Set up the MCP server
                    <span className="text-[11px] ml-2">(coming soon)</span>
                  </span>
                </span>
              </li>
              <li>
                <Link
                  href="/docs/api"
                  className="flex items-start gap-2 text-[15px] font-bold text-black no-underline group"
                >
                  <span className="text-neutral-600 group-hover:text-black transition-colors shrink-0">
                    →
                  </span>
                  <span className="border-b-2 border-black group-hover:border-primary transition-colors">
                    Browse the API reference
                  </span>
                </Link>
              </li>
            </ul>
          </Callout>
        </div>

      </main>

      <Footer />
    </div>
  );
}
