import type { Metadata } from 'next';
import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'AP2 Spending Mandates | P402 Docs',
  description:
    'Complete reference for AP2 spending mandates. Issue signed spending authorizations that allow AI agents to spend USDC on your behalf — with budget caps, category restrictions, expiry, and revocation.',
  alternates: { canonical: 'https://p402.io/docs/mandates' },
  openGraph: {
    title: 'AP2 Spending Mandates — P402 Agent Governance',
    description:
      'Give AI agents bounded spending authority. Signed mandates with budget caps, category filters, on-chain enforcement, and lifecycle management.',
    url: 'https://p402.io/docs/mandates',
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

export default function MandatesDocs() {
  return (
    <div className="min-h-screen bg-white text-black selection:bg-primary selection:text-black">
      <TopNav />

      <div className="border-b-2 border-black bg-neutral-50">
        <div className="max-w-[860px] mx-auto px-6 py-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-neutral-500">
          <Link href="/docs" className="hover:text-black no-underline transition-colors">Docs</Link>
          <span>/</span>
          <span className="text-black">AP2 Mandates</span>
        </div>
      </div>

      <main className="max-w-[860px] mx-auto px-6 py-20">

        {/* ── HEADING ── */}
        <div className="border-b-2 border-black pb-16 mb-16">
          <SectionLabel>DOCS / REFERENCE</SectionLabel>
          <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tight leading-tight mb-6">
            AP2<br />
            <span className="heading-accent">MANDATES.</span>
          </h1>
          <div className="border-l-[4px] border-black pl-5 max-w-xl">
            <p className="text-lg text-neutral-600 leading-relaxed">
              An AP2 mandate is a signed authorization that lets a specific AI agent spend
              USDC on your behalf — but only up to your defined budget, only in approved
              categories, and only until the expiry date you set.
            </p>
          </div>
        </div>

        {/* ── WHAT IS A MANDATE ── */}
        <div className="mb-16">
          <h2 className="text-2xl font-black uppercase italic tracking-tight mb-4">What is a Mandate?</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Instead of giving an agent your private key — which would let it spend any amount,
            any time — you sign a <strong>mandate</strong>. A mandate is a policy document stored
            in P402 that the router enforces on every request the agent makes.
          </p>
          <p className="text-sm text-neutral-600 leading-relaxed mb-6">
            The mandate defines:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-black border-2 border-black mb-6">
            {[
              { label: 'Who is authorized', value: 'A specific agent DID — no other agent can use this mandate.' },
              { label: 'Budget cap', value: 'A maximum USD amount. The router blocks any request that would exceed it.' },
              { label: 'Allowed categories', value: 'Optional list of service categories (e.g. "inference", "search"). Unlisted categories are blocked.' },
              { label: 'Expiry', value: 'An ISO 8601 timestamp. Expired mandates are automatically rejected.' },
            ].map((item) => (
              <div key={item.label} className="p-5 bg-white">
                <div className="font-black text-[12px] uppercase tracking-tight mb-2">{item.label}</div>
                <p className="text-sm text-neutral-600">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-black border-2 border-black">
            <div className="p-6 bg-white">
              <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3">Intent Mandate</div>
              <p className="font-bold text-[14px] mb-2">"Allow agent X to spend up to $50 on inference and search."</p>
              <p className="text-sm text-neutral-600">Use when an agent has broad autonomy within a task category. Good for research agents, coding agents, and data pipeline automation.</p>
            </div>
            <div className="p-6 bg-white">
              <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3">Payment Mandate</div>
              <p className="font-bold text-[14px] mb-2">"Settle this specific service call for $0.05."</p>
              <p className="text-sm text-neutral-600">Use when an agent is executing a known, bounded task with a pre-agreed price. Auto-provisioned when you create a CDP session with a budget.</p>
            </div>
          </div>
        </div>

        {/* ── DID FORMAT ── */}
        <div className="mb-16">
          <h2 className="text-2xl font-black uppercase italic tracking-tight mb-4">DID Format</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Mandates use <strong>Decentralized Identifiers (DIDs)</strong> to identify both the
            user (grantor) and the agent (grantee). A DID is a string that uniquely identifies
            an entity without a central authority.
          </p>
          <div className="border-2 border-black overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-black bg-neutral-50">
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">Format</th>
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">Example</th>
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">When to use</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['did:p402:tenant:{id}', 'did:p402:tenant:t_abc123', 'Your P402 tenant account (user_did)'],
                  ['did:p402:agent:{name}', 'did:p402:agent:my-research-agent', 'An agent registered in P402 (agent_did)'],
                  ['did:key:z...', 'did:key:zQ3shm...', 'Cryptographic key-based identity for external agents'],
                  ['did:ethr:0x...', 'did:ethr:0xAbc...', 'Ethereum wallet address as identity'],
                ].map(([format, example, use]) => (
                  <tr key={format} className="border-b border-neutral-200 last:border-0">
                    <td className="px-4 py-3 font-mono text-[12px] font-bold">{format}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-neutral-500">{example}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Callout variant="neutral" title="Find your tenant DID">
            <p className="text-sm text-neutral-700">
              Your tenant DID is <span className="font-mono">did:p402:tenant:{'{your_tenant_id}'}</span>.
              Find your tenant ID at Dashboard → Settings → Account, or in the{' '}
              <span className="font-mono">tenant_id</span> field of any API response.
            </p>
          </Callout>
        </div>

        {/* ── AUTO-PROVISIONED ── */}
        <div className="mb-16">
          <h2 className="text-2xl font-black uppercase italic tracking-tight mb-4">
            Auto-Provisioned Mandates (CDP Sessions)
          </h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-6">
            The easiest way to use mandates. When you create a session with{' '}
            <span className="font-mono">wallet_source: &quot;cdp&quot;</span> and an{' '}
            <span className="font-mono">agent_id</span>, P402 automatically creates a payment
            mandate and links it to the session. Every auto-pay call through this session is
            enforced against the mandate — no separate API call needed.
          </p>
          <CodeBlock
            language="bash — create a CDP session with automatic mandate"
            code={`curl -X POST https://p402.io/api/v2/sessions \\
  -H "Authorization: Bearer $P402_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "wallet_source": "cdp",
    "agent_id": "my-research-agent",
    "budget_usd": 10.00,
    "expires_in_hours": 24
  }'`}
          />
          <div className="mt-4">
            <CodeBlock
              language="json — response includes the auto-created mandate ID"
              code={`{
  "session_id": "ses_...",
  "budget_usd": 10.00,
  "expires_at": "2026-04-17T12:00:00.000Z",
  "policies": {
    "ap2_mandate_id": "mnd_abc123"   // Mandate auto-created and linked
  },
  "wallet": {
    "address": "0x...",
    "source": "cdp"
  }
}`}
            />
          </div>
        </div>

        {/* ── MANUAL CREATION ── */}
        <div className="mb-16">
          <h2 className="text-2xl font-black uppercase italic tracking-tight mb-4">
            Manual Mandate Creation
          </h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            For non-CDP sessions or when you need custom constraints — like restricting to specific
            service categories or using a cryptographic key identity — create a mandate directly.
          </p>
          <CodeBlock
            language="bash — POST /api/a2a/mandates"
            code={`curl -X POST https://p402.io/api/a2a/mandates \\
  -H "Authorization: Bearer $P402_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "mandate": {
      "type": "intent",
      "user_did": "did:p402:tenant:t_abc123",
      "agent_did": "did:p402:agent:my-research-agent",
      "constraints": {
        "max_amount_usd": 50.00,
        "allowed_categories": ["inference", "search", "data"],
        "valid_until": "2026-12-31T23:59:59Z"
      },
      "signature": "0x..."
    }
  }'`}
          />
          <div className="mt-4">
            <CodeBlock
              language="json — response"
              code={`{
  "mandate_id": "mnd_xyz789",
  "status": "active",
  "type": "intent",
  "user_did": "did:p402:tenant:t_abc123",
  "agent_did": "did:p402:agent:my-research-agent",
  "constraints": {
    "max_amount_usd": 50.00,
    "allowed_categories": ["inference", "search", "data"],
    "valid_until": "2026-12-31T23:59:59Z"
  },
  "amount_spent_usd": 0.00,
  "created_at": "2026-04-16T12:00:00.000Z"
}`}
            />
          </div>
        </div>

        {/* ── ALLOWED CATEGORIES ── */}
        <div className="mb-16">
          <h2 className="text-2xl font-black uppercase italic tracking-tight mb-4">
            Allowed Categories
          </h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-6">
            The <span className="font-mono">allowed_categories</span> constraint is an allowlist.
            If you omit it, the agent can spend in any category. If you include it, only the listed
            categories are permitted — any request categorized differently returns{' '}
            <span className="font-mono">MANDATE_CATEGORY_DENIED</span>.
          </p>
          <div className="border-2 border-black overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-black bg-neutral-50">
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">Category</th>
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">Covers</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['inference', 'LLM chat completions, text generation, summarization'],
                  ['search', 'Web search, semantic search, vector retrieval'],
                  ['data', 'Database queries, data API calls, structured data retrieval'],
                  ['compute', 'Code execution, sandboxed computation, function calls'],
                  ['media', 'Image generation, audio synthesis, video processing'],
                  ['storage', 'File upload, object storage, IPFS pinning'],
                  ['agents', 'Calls to other A2A agents in the Bazaar marketplace'],
                ].map(([cat, covers]) => (
                  <tr key={cat} className="border-b border-neutral-200 last:border-0">
                    <td className="px-4 py-3 font-mono text-[12px] font-bold">{cat}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{covers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── LIFECYCLE ── */}
        <div className="mb-16">
          <h2 className="text-2xl font-black uppercase italic tracking-tight mb-4">
            Mandate Lifecycle
          </h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-6">
            A mandate moves through these states. Status transitions are triggered automatically
            by the router — you don&apos;t need to update them manually.
          </p>
          <div className="border-2 border-black overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-black bg-neutral-50">
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">Status</th>
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">Meaning</th>
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">Agent can spend?</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['active', 'Mandate is valid and within budget.', 'Yes, up to remaining budget'],
                  ['exhausted', 'amount_spent_usd has reached max_amount_usd.', 'No — create a new mandate'],
                  ['expired', 'Current time is past valid_until.', 'No — create a new mandate'],
                  ['revoked', 'Manually revoked via DELETE /api/a2a/mandates/:id.', 'No — permanent'],
                ].map(([status, meaning, can]) => (
                  <tr key={status} className="border-b border-neutral-200 last:border-0">
                    <td className="px-4 py-3 font-mono text-[12px] font-bold">{status}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{meaning}</td>
                    <td className="px-4 py-3 text-sm font-bold">{can}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="font-black uppercase tracking-tight text-base mb-3">Check mandate status</h3>
          <CodeBlock
            language="bash — GET /api/a2a/mandates/:id"
            code={`curl https://p402.io/api/a2a/mandates/mnd_xyz789 \\
  -H "Authorization: Bearer $P402_API_KEY"`}
          />
          <div className="mt-4">
            <CodeBlock
              language="json — response"
              code={`{
  "mandate_id": "mnd_xyz789",
  "status": "active",
  "type": "intent",
  "constraints": {
    "max_amount_usd": 50.00,
    "allowed_categories": ["inference", "search", "data"],
    "valid_until": "2026-12-31T23:59:59Z"
  },
  "amount_spent_usd": 12.34,    // How much the agent has spent so far
  "remaining_usd": 37.66,       // Budget remaining
  "created_at": "2026-04-16T12:00:00.000Z"
}`}
            />
          </div>
        </div>

        {/* ── HOW AGENTS REQUEST SPENDING ── */}
        <div className="mb-16">
          <h2 className="text-2xl font-black uppercase italic tracking-tight mb-4">
            How Agents Request Spending
          </h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            An agent doesn&apos;t call the mandates API directly. Instead, it includes its
            <span className="font-mono"> agent_did</span> and the{' '}
            <span className="font-mono">mandate_id</span> in the session or request. P402 verifies
            the mandate before processing the request and deducts from the budget after settlement.
          </p>
          <p className="text-sm text-neutral-600 leading-relaxed mb-6">
            The verification order is:
          </p>
          <div className="space-y-0 border-2 border-black mb-6">
            {[
              { n: '1', check: 'Mandate exists', fail: 'MANDATE_NOT_FOUND' },
              { n: '2', check: 'Status is active', fail: 'MANDATE_INACTIVE' },
              { n: '3', check: 'valid_until is in the future', fail: 'MANDATE_EXPIRED' },
              { n: '4', check: 'amount_spent_usd + request_amount ≤ max_amount_usd', fail: 'MANDATE_BUDGET_EXCEEDED' },
              { n: '5', check: 'Request category is in allowed_categories (if set)', fail: 'MANDATE_CATEGORY_DENIED' },
              { n: '6', check: 'Signature valid against public_key (if set)', fail: 'MANDATE_SIGNATURE_INVALID' },
            ].map((row, i) => (
              <div key={row.n} className={`flex gap-6 p-4 ${i < 5 ? 'border-b-2 border-black' : ''}`}>
                <div className="font-mono text-[11px] font-black text-neutral-400 w-5 shrink-0 pt-0.5">{row.n}</div>
                <div className="flex-1 text-sm text-neutral-700">{row.check}</div>
                <div className="font-mono text-[11px] font-bold text-red-600 text-right shrink-0">{row.fail}</div>
              </div>
            ))}
          </div>
          <Callout variant="neutral" title="Backwards compatible">
            <p className="text-sm text-neutral-700">
              Sessions without a mandate linked in their <span className="font-mono">policies</span>{' '}
              skip mandate verification entirely. Existing integrations that don&apos;t use mandates
              continue to work without any changes.
            </p>
          </Callout>
        </div>

        {/* ── REVOKE ── */}
        <div className="mb-16">
          <h2 className="text-2xl font-black uppercase italic tracking-tight mb-4">Revoke a Mandate</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Revocation is immediate and permanent. Any in-flight request using this mandate will
            be rejected. Use this if you lose trust in an agent or need to stop spending immediately.
          </p>
          <CodeBlock
            language="bash — DELETE /api/a2a/mandates/:id"
            code={`curl -X DELETE https://p402.io/api/a2a/mandates/mnd_xyz789 \\
  -H "Authorization: Bearer $P402_API_KEY"

# Response: 200 OK
{ "mandate_id": "mnd_xyz789", "status": "revoked" }`}
          />
        </div>

        {/* ── ERROR CODES ── */}
        <div className="mb-16">
          <h2 className="text-2xl font-black uppercase italic tracking-tight mb-4">Error Codes</h2>
          <div className="border-2 border-black overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-black bg-neutral-50">
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">Code</th>
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">HTTP</th>
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['MANDATE_NOT_FOUND', '404', 'The mandate_id does not exist. Check the ID.'],
                  ['MANDATE_INACTIVE', '403', 'Mandate is exhausted, expired, or revoked. Create a new one.'],
                  ['MANDATE_EXPIRED', '403', 'valid_until has passed. Create a new mandate with a future expiry.'],
                  ['MANDATE_BUDGET_EXCEEDED', '403', 'Request would exceed max_amount_usd. Increase budget or create a new mandate.'],
                  ['MANDATE_CATEGORY_DENIED', '403', 'Request category is not in allowed_categories. Expand the allowlist or change the request.'],
                  ['MANDATE_SIGNATURE_INVALID', '401', 'EIP-712 signature does not verify against public_key. Re-sign.'],
                ].map(([code, http, action]) => (
                  <tr key={code} className="border-b border-neutral-200 last:border-0">
                    <td className="px-4 py-3 font-mono text-[12px] font-bold">{code}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-neutral-700">{http}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── WHAT'S NEXT ── */}
        <div className="border-t-2 border-black pt-16">
          <Callout variant="lime" title="Related docs">
            <ul className="space-y-3">
              {[
                { label: 'Sessions — create CDP sessions with automatic mandates', href: '/docs/guides/sessions' },
                { label: 'A2A Protocol — how agents communicate and use mandates', href: '/docs/a2a' },
                { label: 'AgentKit — Coinbase CDP wallet integration', href: '/docs/agentkit' },
                { label: 'Error codes — complete error code reference', href: '/docs/reference/error-codes' },
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
