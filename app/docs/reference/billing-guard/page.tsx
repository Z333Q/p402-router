import type { Metadata } from 'next';
import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Billing Guard | P402 Reference',
  description:
    'Six layers of billing protection built into every P402 request: rate limiting, daily circuit breakers, concurrency caps, anomaly detection, per-request caps, and atomic budget reservation.',
  alternates: { canonical: 'https://p402.io/docs/reference/billing-guard' },
  openGraph: {
    title: 'Billing Guard | P402',
    description: '6-layer billing protection: rate limits, circuit breakers, anomaly detection, and atomic budget reservation.',
    url: 'https://p402.io/docs/reference/billing-guard',
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

const LAYERS = [
  {
    number: 1,
    name: 'Rate limit',
    trigger: 'Too many requests per minute',
    errorCode: 'RATE_LIMIT_EXCEEDED',
    httpStatus: 429,
    defaultLimit: '60 req/min (Free), 600 req/min (Pro), custom (Enterprise)',
    description:
      'A sliding-window counter prevents request floods. Limits apply per API key. The ' +
      'Retry-After header indicates when the window resets.',
    retry: 'Respect Retry-After header. Implement exponential backoff.',
  },
  {
    number: 2,
    name: 'Daily circuit breaker',
    trigger: 'Spend exceeds daily cap',
    errorCode: 'DAILY_SPEND_LIMIT_EXCEEDED',
    httpStatus: 402,
    defaultLimit: '$10/day (Free), $1,000/day (Pro), custom (Enterprise)',
    description:
      'A hard daily spend cap prevents runaway costs from buggy agents or prompt-injection attacks. ' +
      'Resets at 00:00 UTC. You can raise or lower your cap in Dashboard → Settings → Billing.',
    retry: 'Wait for daily reset or contact support to raise the cap.',
  },
  {
    number: 3,
    name: 'Concurrency cap',
    trigger: 'Too many simultaneous in-flight requests',
    errorCode: 'CONCURRENCY_LIMIT_EXCEEDED',
    httpStatus: 429,
    defaultLimit: '5 concurrent (Free), 50 concurrent (Pro), custom (Enterprise)',
    description:
      'Limits the number of requests being processed simultaneously per tenant. ' +
      'Prevents a single burst from monopolising provider quota and degrading other tenants.',
    retry: 'Queue requests client-side. Use a semaphore or p-limit.',
  },
  {
    number: 4,
    name: 'Anomaly detection',
    trigger: 'Spend pattern deviates from baseline (Sentinel AI)',
    errorCode: 'ANOMALY_DETECTED',
    httpStatus: 402,
    description:
      'Gemini 3 Flash (Sentinel) analyses spend velocity in real time. If spend spikes 10× ' +
      'above your 7-day baseline — e.g. from a prompt-injection attack flooding your agent — ' +
      'the Sentinel pauses traffic and alerts you via email. You can resume from the Dashboard.',
    retry: 'Review the anomaly report in Dashboard → Intelligence. Resume manually.',
  },
  {
    number: 5,
    name: 'Per-request cap',
    trigger: 'Single request cost exceeds cap',
    errorCode: 'REQUEST_COST_EXCEEDED',
    httpStatus: 402,
    defaultLimit: '$0.50/request (configurable)',
    description:
      'A ceiling on the cost of any single LLM call. Prevents accidentally expensive requests ' +
      '(e.g. passing a 100k-token context window to GPT-4o) from draining your budget.',
    retry: 'Reduce prompt length or switch to a cost-mode routing call.',
  },
  {
    number: 6,
    name: 'Atomic budget reservation',
    trigger: 'Session budget exhausted mid-flight',
    errorCode: 'SESSION_BUDGET_EXCEEDED',
    httpStatus: 402,
    description:
      'Before routing any request to an LLM provider, P402 atomically reserves the estimated ' +
      'cost from the session budget. If the reservation fails (concurrent requests racing to the ' +
      'same budget), the request is rejected before any tokens are generated. You never overspend ' +
      'a session — even under concurrent load.',
    retry: 'Fund the session (POST /sessions/:id/fund) or create a new one.',
  },
];

export default function BillingGuardPage() {
  return (
    <div className="min-h-screen bg-white text-black selection:bg-primary selection:text-black">
      <TopNav />

      <div className="border-b-2 border-black bg-neutral-50">
        <div className="max-w-[860px] mx-auto px-6 py-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-neutral-500">
          <Link href="/docs" className="hover:text-black no-underline transition-colors">Docs</Link>
          <span>/</span>
          <span>Reference</span>
          <span>/</span>
          <span className="text-black">Billing Guard</span>
        </div>
      </div>

      <main className="max-w-[860px] mx-auto px-6 py-20">

        <div className="border-b-2 border-black pb-16 mb-16">
          <SectionLabel>DOCS / REFERENCE</SectionLabel>
          <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tight leading-tight mb-6">
            BILLING<br />
            <span className="heading-accent">GUARD.</span>
          </h1>
          <div className="border-l-[4px] border-black pl-5 max-w-xl">
            <p className="text-lg text-neutral-600 leading-relaxed">
              Six independent layers of protection on every request.
              No overruns. No surprise bills. No runaway agents.
            </p>
          </div>
        </div>

        {/* ── OVERVIEW ── */}
        <div className="mb-16">
          <Callout variant="neutral" title="Design principle">
            <p className="text-sm text-neutral-700 leading-relaxed">
              Every layer is designed to <strong>fail closed</strong> — when it trips, it rejects the request
              rather than allowing it through. Layers are evaluated in order (1 → 6). The first layer
              that trips short-circuits the rest. Each failure returns a machine-readable error code
              so your agent can handle it programmatically.
            </p>
          </Callout>
        </div>

        {/* ── LAYERS ── */}
        <div className="mb-16">
          <div className="space-y-6">
            {LAYERS.map((layer) => (
              <div key={layer.number} className="border-2 border-black">
                <div className="flex items-center gap-4 px-6 py-4 border-b-2 border-black bg-neutral-50">
                  <div className="w-9 h-9 bg-primary border-2 border-black flex items-center justify-center font-black text-sm shrink-0">
                    {layer.number}
                  </div>
                  <div>
                    <div className="font-black text-[15px] uppercase tracking-tight">{layer.name}</div>
                    <div className="text-[11px] text-neutral-500 font-mono mt-0.5">{layer.trigger}</div>
                  </div>
                  <div className="ml-auto text-right hidden sm:block">
                    <div className="font-mono font-bold text-[13px]">{layer.errorCode}</div>
                    <div className="text-[11px] text-neutral-500">HTTP {layer.httpStatus}</div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-sm text-neutral-600 leading-relaxed">{layer.description}</p>
                  {layer.defaultLimit && (
                    <div className="flex items-start gap-2 text-sm">
                      <span className="font-black text-[10px] uppercase tracking-widest text-neutral-400 shrink-0 pt-0.5">Default</span>
                      <span className="font-mono text-neutral-700">{layer.defaultLimit}</span>
                    </div>
                  )}
                  {layer.retry && (
                    <div className="flex items-start gap-2 text-sm">
                      <span className="font-black text-[10px] uppercase tracking-widest text-neutral-400 shrink-0 pt-0.5">Retry</span>
                      <span className="text-neutral-700">{layer.retry}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── ERROR RESPONSE FORMAT ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-4">Error Response Format</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            All Billing Guard errors return a consistent JSON body with a machine-readable{' '}
            <span className="font-mono">code</span> field.
          </p>
          <CodeBlock
            code={`// HTTP 402
{
  "error": {
    "code": "SESSION_BUDGET_EXCEEDED",
    "message": "Session sess_01jx... has no remaining budget ($0.00 of $5.00).",
    "request_id": "req_01jx...",
    "session_remaining_usd": 0.00
  }
}`}
          />
        </div>

        {/* ── HANDLING IN CODE ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-4">Handling Billing Guard Errors</h2>
          <CodeBlock
            language="python"
            code={`import openai, requests, os

P402_API_KEY = os.environ["P402_API_KEY"]
client = openai.OpenAI(api_key=P402_API_KEY, base_url="https://p402.io/api/v2")

BILLING_GUARD_CODES = {
    "RATE_LIMIT_EXCEEDED",
    "DAILY_SPEND_LIMIT_EXCEEDED",
    "CONCURRENCY_LIMIT_EXCEEDED",
    "ANOMALY_DETECTED",
    "REQUEST_COST_EXCEEDED",
    "SESSION_BUDGET_EXCEEDED",
}

def ask(prompt: str, session_id: str) -> str | None:
    try:
        resp = client.chat.completions.create(
            model="auto",
            messages=[{"role": "user", "content": prompt}],
            extra_body={"p402": {"session_id": session_id, "mode": "cost", "cache": True}},
        )
        return resp.choices[0].message.content

    except openai.RateLimitError as e:
        body = e.response.json().get("error", {})
        code = body.get("code", "")

        if code == "SESSION_BUDGET_EXCEEDED":
            print("Budget exhausted — create a new session.")
            return None
        if code == "RATE_LIMIT_EXCEEDED":
            import time
            retry_after = int(e.response.headers.get("Retry-After", 5))
            print(f"Rate limited — retrying in {retry_after}s")
            time.sleep(retry_after)
            return ask(prompt, session_id)   # retry once
        if code == "ANOMALY_DETECTED":
            print("Anomaly detected — check Dashboard > Intelligence to resume.")
            return None

        raise  # Unknown billing guard error — re-raise`}
          />
        </div>

        {/* ── CONFIGURE LIMITS ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-4">Configure Your Limits</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            All configurable limits can be adjusted in <strong>Dashboard → Settings → Billing</strong>.
            The <span className="font-mono">per-request cap</span> can also be set per-request:
          </p>
          <CodeBlock
            language="bash"
            code={`curl -s -X POST https://p402.io/api/v2/chat/completions \\
  -H "Authorization: Bearer $P402_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [{"role": "user", "content": "..."}],
    "p402": {
      "mode": "quality",
      "session_id": "sess_01jx...",
      "max_cost_usd": 0.05    // Reject if this request would cost more than $0.05
    }
  }'`}
          />
        </div>

        {/* ── WHAT'S NEXT ── */}
        <div className="border-t-2 border-black pt-16">
          <Callout variant="lime" title="Related">
            <ul className="space-y-3">
              {[
                { label: 'Error Codes — full reference', href: '/docs/reference/error-codes' },
                { label: 'Manage Sessions — budget tracking', href: '/docs/guides/sessions' },
                { label: 'Understanding the Security Model', href: '/docs/explanation/security' },
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
