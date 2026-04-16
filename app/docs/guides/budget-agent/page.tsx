import type { Metadata } from 'next';
import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Build a Budget Agent | P402 Tutorials',
  description:
    'Build an AI agent that tracks its own spending, respects hard budget limits, and switches to cached responses when approaching its cap.',
  alternates: { canonical: 'https://p402.io/docs/guides/budget-agent' },
  openGraph: {
    title: 'Build a Budget Agent | P402',
    description:
      'Step-by-step tutorial: build a self-managing AI agent with hard spend caps using P402 sessions.',
    url: 'https://p402.io/docs/guides/budget-agent',
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

// ─── PAGE ────────────────────────────────────────────────────────────────────

export default function BudgetAgentPage() {
  return (
    <div className="min-h-screen bg-white text-black selection:bg-primary selection:text-black">
      <TopNav />

      {/* Breadcrumb */}
      <div className="border-b-2 border-black bg-neutral-50">
        <div className="max-w-[860px] mx-auto px-6 py-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-neutral-500">
          <Link href="/docs" className="hover:text-black no-underline transition-colors">Docs</Link>
          <span>/</span>
          <span>Tutorials</span>
          <span>/</span>
          <span className="text-black">Build a Budget Agent</span>
        </div>
      </div>

      <main className="max-w-[860px] mx-auto px-6 py-20">

        {/* ── PAGE HEADING ── */}
        <div className="border-b-2 border-black pb-16 mb-16">
          <SectionLabel>DOCS / TUTORIAL</SectionLabel>
          <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tight leading-tight mb-6">
            BUILD A<br />
            <span className="heading-accent">BUDGET AGENT.</span>
          </h1>
          <div className="border-l-[4px] border-black pl-5 max-w-xl">
            <p className="text-lg text-neutral-600 leading-relaxed">
              An AI agent that tracks its own spending, enforces hard budget caps,
              and automatically uses cached responses to stretch every dollar.
            </p>
          </div>
        </div>

        {/* ── WHAT YOU'LL BUILD ── */}
        <div className="mb-16">
          <Callout variant="neutral" title="What you'll build">
            <ul className="space-y-2 text-sm text-neutral-700">
              {[
                'A Python agent with a $5 hard spending cap',
                'Automatic cost-optimised routing on every request',
                'Semantic cache that makes repeated queries free',
                'Budget exhaustion handling with graceful shutdown',
                'Real-time spend tracking via session stats',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="font-mono font-bold text-primary shrink-0">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Callout>
        </div>

        {/* ── PREREQUISITES ── */}
        <div className="mb-16">
          <Callout variant="neutral" title="Prerequisites">
            <ul className="space-y-2 text-sm text-neutral-700">
              <li className="flex items-start gap-2">
                <span className="font-mono font-bold shrink-0">1.</span>
                <span>A P402 API key — <Link href="/login" className="font-bold text-black border-b-2 border-black hover:border-primary transition-colors no-underline">create one free</Link></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono font-bold shrink-0">2.</span>
                <span>Python 3.9+ with <span className="font-mono">pip install openai requests</span></span>
              </li>
            </ul>
          </Callout>
        </div>

        {/* ── STEP 1 ── */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-6">
            <StepNumber n={1} />
            <h2 className="text-2xl font-black uppercase italic tracking-tight">Create a Session</h2>
          </div>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            A session is a budget-capped container. Every LLM call made with a session&apos;s ID
            is charged against its budget. When the budget is exhausted, the session rejects
            further requests — no surprise bills.
          </p>
          <CodeBlock
            language="python"
            code={`import os, requests

P402_API_KEY = os.environ["P402_API_KEY"]

def create_session(budget_usd: float) -> str:
    resp = requests.post(
        "https://p402.io/api/v2/sessions",
        headers={"Authorization": f"Bearer {P402_API_KEY}"},
        json={"budget_usd": budget_usd},
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()
    print(f"Session {data['id']} — budget ${'$'}{data['budget_usd']:.2f}")
    return data["id"]

SESSION_ID = create_session(5.00)   # Hard cap: $5`}
          />
        </div>

        {/* ── STEP 2 ── */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-6">
            <StepNumber n={2} />
            <h2 className="text-2xl font-black uppercase italic tracking-tight">Wire Up the Agent</h2>
          </div>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            P402 is OpenAI-compatible. Replace the base URL and pass your session ID in the{' '}
            <span className="font-mono">extra_body</span>. No other SDK changes needed.
          </p>
          <CodeBlock
            language="python"
            code={`from openai import OpenAI

client = OpenAI(
    api_key=P402_API_KEY,
    base_url="https://p402.io/api/v2",
)

def ask(question: str, session_id: str) -> str:
    """Send a question and return the answer text."""
    response = client.chat.completions.create(
        model="auto",          # P402 picks the cheapest model that answers well
        messages=[{"role": "user", "content": question}],
        extra_body={
            "p402": {
                "session_id": session_id,
                "mode": "cost",    # Optimise for lowest cost
                "cache": True,     # Return cached answer if identical query seen before
            }
        },
    )

    # P402 metadata is attached to every response
    meta = getattr(response, "p402_metadata", {})
    provider = meta.get("provider", "unknown")
    cost     = meta.get("cost_usd", 0)
    cached   = meta.get("cached", False)

    label = "CACHED (free)" if cached else f"${'$'}{cost:.4f} via {provider}"
    print(f"  [{label}]")

    return response.choices[0].message.content or ""`}
          />
        </div>

        {/* ── STEP 3 ── */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-6">
            <StepNumber n={3} />
            <h2 className="text-2xl font-black uppercase italic tracking-tight">Track Spend in Real Time</h2>
          </div>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Poll the session stats endpoint before each request. If you&apos;re within 10% of the
            cap, warn the user. At 100%, exit cleanly.
          </p>
          <CodeBlock
            language="python"
            code={`def get_session_stats(session_id: str) -> dict:
    resp = requests.get(
        f"https://p402.io/api/v2/sessions/{session_id}/stats",
        headers={"Authorization": f"Bearer {P402_API_KEY}"},
        timeout=5,
    )
    resp.raise_for_status()
    return resp.json()

def budget_remaining(session_id: str) -> float:
    stats = get_session_stats(session_id)
    spent  = stats.get("budget_spent_usd", 0)
    budget = stats.get("budget_usd", 0)
    return budget - spent`}
          />
        </div>

        {/* ── STEP 4 ── */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-6">
            <StepNumber n={4} />
            <h2 className="text-2xl font-black uppercase italic tracking-tight">Handle Budget Exhaustion</h2>
          </div>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            When the session is exhausted, P402 returns HTTP 402 with error code{' '}
            <span className="font-mono">SESSION_BUDGET_EXCEEDED</span>. Catch it and
            gracefully shut the agent down or provision a new session.
          </p>
          <CodeBlock
            language="python"
            code={`import openai

def safe_ask(question: str, session_id: str) -> str | None:
    remaining = budget_remaining(session_id)

    if remaining <= 0:
        print("Budget exhausted. Shutting down.")
        return None

    if remaining < 0.50:
        print(f"Warning: only ${'$'}{remaining:.2f} remaining.")

    try:
        return ask(question, session_id)
    except openai.BadRequestError as e:
        if "SESSION_BUDGET_EXCEEDED" in str(e):
            print("Session budget exhausted mid-run.")
            return None
        raise`}
          />
        </div>

        {/* ── STEP 5 ── */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-6">
            <StepNumber n={5} />
            <h2 className="text-2xl font-black uppercase italic tracking-tight">Run the Agent</h2>
          </div>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Put it together. The agent processes a queue of questions, tracks spend,
            and stops when the budget is gone.
          </p>
          <CodeBlock
            language="python"
            code={`QUESTIONS = [
    "What is the x402 payment protocol?",
    "Explain EIP-3009 transferWithAuthorization.",
    "What is the difference between cost and quality routing?",
    "What is the x402 payment protocol?",   # ← identical — will be served from cache
    "How does semantic caching work?",
]

def main():
    session_id = create_session(5.00)
    print(f"\\nStarting agent with $5.00 budget\\n{'─'*45}")

    for i, question in enumerate(QUESTIONS, 1):
        print(f"\\nQ{i}: {question[:60]}...")
        answer = safe_ask(question, session_id)
        if answer is None:
            break
        print(f"A: {answer[:120]}...")

    stats = get_session_stats(session_id)
    print(f"\\n{'─'*45}")
    print(f"Total spent:  ${'$'}{stats['budget_spent_usd']:.4f}")
    print(f"Requests:     {stats['request_count']}")
    print(f"Cache hits:   {stats.get('cache_hits', 0)}")

if __name__ == "__main__":
    main()`}
          />
          <div className="mt-4">
            <Callout variant="neutral" title="Expected output">
              <CodeBlock
                code={`Starting agent with $5.00 budget
─────────────────────────────────────────────

Q1: What is the x402 payment protocol?...
  [$0.0003 via deepseek]
A: x402 is a machine-native payment standard...

Q2: Explain EIP-3009 transferWithAuthorization....
  [$0.0004 via deepseek]
A: EIP-3009 defines a way for token holders to...

Q3: What is the difference between cost and quality...
  [$0.0002 via deepseek]

Q4: What is the x402 payment protocol?...
  [CACHED (free)]                       ← identical query, zero cost

Q5: How does semantic caching work?...
  [$0.0003 via deepseek]

─────────────────────────────────────────────
Total spent:  $0.0012
Requests:     5
Cache hits:   1`}
              />
            </Callout>
          </div>
        </div>

        {/* ── TYPESCRIPT VARIANT ── */}
        <div className="mb-16">
          <div className="border-t-2 border-black pt-10 mb-8">
            <h2 className="text-xl font-black uppercase italic tracking-tight mb-2">TypeScript Variant</h2>
            <p className="text-sm text-neutral-600">Same pattern, zero extra dependencies beyond the official OpenAI SDK.</p>
          </div>
          <CodeBlock
            language="typescript"
            code={`import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.P402_API_KEY,
  baseURL: 'https://p402.io/api/v2',
});

// Create session
const session = await fetch('https://p402.io/api/v2/sessions', {
  method: 'POST',
  headers: {
    Authorization: \`Bearer \${process.env.P402_API_KEY}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ budget_usd: 5 }),
}).then((r) => r.json());

// Ask with budget cap
const response = await client.chat.completions.create({
  model: 'auto',
  messages: [{ role: 'user', content: 'Explain EIP-3009.' }],
  // @ts-expect-error — P402 extension field
  p402: { session_id: session.id, mode: 'cost', cache: true },
});

const meta = (response as Record<string, unknown>).p402_metadata as {
  cost_usd: number;
  cached: boolean;
  provider: string;
} | undefined;

console.log(\`Cost: $\${meta?.cost_usd ?? 0} via \${meta?.provider}\`);
console.log(response.choices[0]?.message.content);`}
          />
        </div>

        {/* ── WHAT'S NEXT ── */}
        <div className="border-t-2 border-black pt-16">
          <Callout variant="lime" title="What's next">
            <p className="text-sm font-medium text-neutral-700 mb-5">
              You have a working budget agent. Here&apos;s how to go deeper:
            </p>
            <ul className="space-y-3">
              {[
                { label: 'Connect via MCP (zero-code agent integration)', href: '/docs/guides/mcp-server' },
                { label: 'Choose routing modes (cost / quality / speed)', href: '/docs/guides/routing-modes' },
                { label: 'Configure semantic caching', href: '/docs/guides/caching' },
                { label: 'Manage sessions via the API', href: '/docs/guides/sessions' },
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
