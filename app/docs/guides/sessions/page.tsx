import type { Metadata } from 'next';
import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Manage Sessions | P402 How-To Guides',
  description:
    'Create, fund, inspect, and close P402 sessions. Sessions enforce hard budget caps across all LLM requests.',
  alternates: { canonical: 'https://p402.io/docs/guides/sessions' },
  openGraph: {
    title: 'Manage Sessions | P402',
    description: 'Full session lifecycle: create, fund, inspect, close.',
    url: 'https://p402.io/docs/guides/sessions',
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

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div id={id} className="mb-16">
      <h2 className="text-2xl font-black uppercase italic tracking-tight mb-6 border-b-2 border-black pb-3">
        {title}
      </h2>
      {children}
    </div>
  );
}

export default function SessionsPage() {
  return (
    <div className="min-h-screen bg-white text-black selection:bg-primary selection:text-black">
      <TopNav />

      <div className="border-b-2 border-black bg-neutral-50">
        <div className="max-w-[860px] mx-auto px-6 py-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-neutral-500">
          <Link href="/docs" className="hover:text-black no-underline transition-colors">Docs</Link>
          <span>/</span>
          <span>How-To Guides</span>
          <span>/</span>
          <span className="text-black">Manage Sessions</span>
        </div>
      </div>

      <main className="max-w-[860px] mx-auto px-6 py-20">

        <div className="border-b-2 border-black pb-16 mb-16">
          <SectionLabel>DOCS / HOW-TO GUIDES</SectionLabel>
          <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tight leading-tight mb-6">
            MANAGE<br />
            <span className="heading-accent">SESSIONS.</span>
          </h1>
          <div className="border-l-[4px] border-black pl-5 max-w-xl">
            <p className="text-lg text-neutral-600 leading-relaxed">
              Sessions are budget-capped containers for LLM spend.
              Every request made with a session ID is tracked against its budget.
              No overruns. No surprises.
            </p>
          </div>
        </div>

        {/* ── WHAT IS A SESSION ── */}
        <div className="mb-16">
          <Callout variant="neutral" title="What is a session?">
            <ul className="space-y-2 text-sm text-neutral-700">
              {[
                'A UUID-identified spending container with a hard USD budget cap.',
                'All LLM requests tagged with a session_id draw from its budget.',
                'When the budget is exhausted, further requests return 402 SESSION_BUDGET_EXCEEDED.',
                'Sessions can be funded incrementally — top up without creating a new one.',
                'Session stats (spend, cache hits, request count) are available in real time.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="font-mono font-bold text-primary shrink-0">→</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Callout>
        </div>

        {/* ── CREATE ── */}
        <Section id="create" title="Create a Session">
          <CodeBlock
            language="bash"
            code={`curl -s -X POST https://p402.io/api/v2/sessions \\
  -H "Authorization: Bearer $P402_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "budget_usd": 10,
    "expires_in_hours": 24
  }' | jq .`}
          />
          <div className="mt-4">
            <Callout variant="neutral" title="Response">
              <CodeBlock
                code={`{
  "id": "sess_01jx...",
  "budget_usd": 10.00,
  "budget_spent_usd": 0.00,
  "budget_remaining_usd": 10.00,
  "status": "active",
  "expires_at": "2026-04-16T12:00:00.000Z",
  "created_at": "2026-04-15T12:00:00.000Z"
}`}
              />
            </Callout>
          </div>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { field: 'budget_usd', req: 'Yes', desc: 'Hard cap in USD (minimum $0.10).' },
              { field: 'expires_in_hours', req: 'No', desc: 'TTL in hours. Default: 168 (7 days).' },
              { field: 'agent_id', req: 'No', desc: 'Bind session to a registered agent DID.' },
              { field: 'metadata', req: 'No', desc: 'Arbitrary key-value pairs, returned in stats.' },
            ].map((row) => (
              <div key={row.field} className="border-2 border-black p-4 bg-neutral-50">
                <div className="font-mono font-bold text-sm mb-1">{row.field}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">{row.req === 'Yes' ? 'Required' : 'Optional'}</div>
                <div className="text-sm text-neutral-600">{row.desc}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── USE ── */}
        <Section id="use" title="Use a Session">
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Pass <span className="font-mono">session_id</span> in the <span className="font-mono">p402</span> extension block of any chat completion.
            Budget is debited atomically before the LLM call — you never overspend.
          </p>
          <CodeBlock
            language="bash"
            code={`curl -s -X POST https://p402.io/api/v2/chat/completions \\
  -H "Authorization: Bearer $P402_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [{"role": "user", "content": "Summarise EIP-3009."}],
    "p402": {
      "session_id": "sess_01jx...",
      "mode": "cost",
      "cache": true
    }
  }' | jq .p402_metadata`}
          />
          <div className="mt-4">
            <CodeBlock
              code={`{
  "provider": "deepseek",
  "model": "deepseek-v3",
  "cost_usd": 0.0003,
  "cached": false,
  "session_remaining_usd": 9.9997    // ← remaining budget after this request
}`}
            />
          </div>
        </Section>

        {/* ── INSPECT ── */}
        <Section id="inspect" title="Inspect a Session">
          <CodeBlock
            language="bash"
            code={`# Get session details
curl -s https://p402.io/api/v2/sessions/sess_01jx... \\
  -H "Authorization: Bearer $P402_API_KEY" | jq .

# Get real-time stats
curl -s https://p402.io/api/v2/sessions/sess_01jx.../stats \\
  -H "Authorization: Bearer $P402_API_KEY" | jq .`}
          />
          <div className="mt-4">
            <Callout variant="neutral" title="Stats response">
              <CodeBlock
                code={`{
  "id": "sess_01jx...",
  "budget_usd": 10.00,
  "budget_spent_usd": 0.0012,
  "budget_remaining_usd": 9.9988,
  "request_count": 5,
  "cache_hits": 1,
  "cache_savings_usd": 0.0003,
  "status": "active",
  "expires_at": "2026-04-16T12:00:00.000Z"
}`}
              />
            </Callout>
          </div>
        </Section>

        {/* ── LIST ── */}
        <Section id="list" title="List Sessions">
          <CodeBlock
            language="bash"
            code={`# Active sessions
curl -s "https://p402.io/api/v2/sessions?status=active&limit=20" \\
  -H "Authorization: Bearer $P402_API_KEY" | jq .

# All sessions (paginated)
curl -s "https://p402.io/api/v2/sessions?limit=50&offset=0" \\
  -H "Authorization: Bearer $P402_API_KEY" | jq '.sessions[] | {id, budget_usd, budget_spent_usd, status}'`}
          />
        </Section>

        {/* ── FUND ── */}
        <Section id="fund" title="Top Up a Session">
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Add budget to an existing active session without interrupting in-flight requests.
          </p>
          <CodeBlock
            language="bash"
            code={`curl -s -X POST https://p402.io/api/v2/sessions/sess_01jx.../fund \\
  -H "Authorization: Bearer $P402_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"amount_usd": 5}' | jq .`}
          />
          <div className="mt-4">
            <Callout variant="neutral" title="Response">
              <CodeBlock
                code={`{
  "id": "sess_01jx...",
  "budget_usd": 15.00,          // was 10.00, now 15.00
  "budget_remaining_usd": 14.9988,
  "status": "active"
}`}
              />
            </Callout>
          </div>
        </Section>

        {/* ── CLOSE ── */}
        <Section id="close" title="Close a Session">
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Closing a session immediately rejects all new requests. In-flight requests are
            allowed to complete. Unspent budget is released.
          </p>
          <CodeBlock
            language="bash"
            code={`curl -s -X DELETE https://p402.io/api/v2/sessions/sess_01jx... \\
  -H "Authorization: Bearer $P402_API_KEY" | jq .`}
          />
          <div className="mt-4">
            <CodeBlock
              code={`{ "status": "closed", "budget_spent_usd": 0.0012 }`}
            />
          </div>
        </Section>

        {/* ── ERROR HANDLING ── */}
        <Section id="errors" title="Error Handling">
          <div className="border-2 border-black overflow-hidden">
            <div className="grid grid-cols-[1fr_2fr] bg-black text-white text-[10px] font-black uppercase tracking-widest">
              <div className="px-4 py-3">Error Code</div>
              <div className="px-4 py-3 border-l border-neutral-700">Meaning</div>
            </div>
            {[
              { code: 'SESSION_NOT_FOUND', desc: 'The session ID does not exist or belongs to another tenant.' },
              { code: 'SESSION_BUDGET_EXCEEDED', desc: 'The session has no remaining budget. Top up or create a new session.' },
              { code: 'SESSION_EXPIRED', desc: 'The session TTL has elapsed. Expired sessions cannot be reactivated.' },
              { code: 'SESSION_CLOSED', desc: 'Session was explicitly closed via DELETE. Create a new one.' },
              { code: 'BUDGET_RESERVATION_FAILED', desc: 'Concurrent request exceeded budget atomically. Retry immediately.' },
            ].map((row, i) => (
              <div key={row.code} className={`grid grid-cols-[1fr_2fr] text-sm ${i < 4 ? 'border-b border-neutral-200' : ''}`}>
                <div className="px-4 py-3 font-mono font-bold text-[13px] bg-neutral-50">{row.code}</div>
                <div className="px-4 py-3 text-neutral-600 border-l border-neutral-200">{row.desc}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── WHAT'S NEXT ── */}
        <div className="border-t-2 border-black pt-16">
          <Callout variant="lime" title="What's next">
            <ul className="space-y-3">
              {[
                { label: 'Fund with USDC on-chain', href: '/docs/guides/fund-usdc' },
                { label: 'Choose routing modes', href: '/docs/guides/routing-modes' },
                { label: 'API Reference — full sessions spec', href: '/docs/api' },
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
