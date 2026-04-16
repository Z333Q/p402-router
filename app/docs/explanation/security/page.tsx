import type { Metadata } from 'next';
import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Security Model | Understanding P402',
  description:
    'How P402 protects your funds and data: EIP-3009 replay protection, gas safety, API key hashing, JWT signing, and the 6-layer Billing Guard.',
  alternates: { canonical: 'https://p402.io/docs/explanation/security' },
  openGraph: {
    title: 'Security Model | P402',
    description: 'EIP-3009 replay protection, gas safety, API key hashing, Billing Guard — full security model.',
    url: 'https://p402.io/docs/explanation/security',
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

function SecurityRow({ threat, mitigation }: { threat: string; mitigation: string }) {
  return (
    <div className="grid grid-cols-[1fr_1fr] text-sm border-b border-neutral-200 last:border-b-0">
      <div className="px-4 py-3 text-neutral-700">{threat}</div>
      <div className="px-4 py-3 text-neutral-600 border-l border-neutral-200">{mitigation}</div>
    </div>
  );
}

export default function SecurityModelPage() {
  return (
    <div className="min-h-screen bg-white text-black selection:bg-primary selection:text-black">
      <TopNav />

      <div className="border-b-2 border-black bg-neutral-50">
        <div className="max-w-[860px] mx-auto px-6 py-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-neutral-500">
          <Link href="/docs" className="hover:text-black no-underline transition-colors">Docs</Link>
          <span>/</span>
          <span>Understanding P402</span>
          <span>/</span>
          <span className="text-black">Security Model</span>
        </div>
      </div>

      <main className="max-w-[860px] mx-auto px-6 py-20">

        <div className="border-b-2 border-black pb-16 mb-16">
          <SectionLabel>DOCS / UNDERSTANDING P402</SectionLabel>
          <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tight leading-tight mb-6">
            SECURITY<br />
            <span className="heading-accent">MODEL.</span>
          </h1>
          <div className="border-l-[4px] border-black pl-5 max-w-xl">
            <p className="text-lg text-neutral-600 leading-relaxed">
              How P402 protects your funds, API keys, and agent spending
              at every layer — from cryptographic signatures to real-time anomaly detection.
            </p>
          </div>
        </div>

        {/* ── PAYMENT SECURITY ── */}
        <Section title="Payment Security (EIP-3009)">
          <p className="text-sm text-neutral-600 leading-relaxed mb-6">
            P402 uses EIP-3009 <span className="font-mono">TransferWithAuthorization</span> for
            on-chain settlement. This removes the standard ERC-20 two-step (approve → transferFrom)
            and replaces it with a single off-chain signature that the P402 Facilitator submits on-chain.
          </p>
          <div className="space-y-4">
            {[
              {
                control: 'Replay protection',
                detail: 'Every authorization contains a 32-byte nonce. P402 records used nonces in both PostgreSQL and Redis. Any attempt to resubmit the same nonce returns REPLAY_DETECTED immediately — before any on-chain call is made.',
              },
              {
                control: 'Time-bounded authorization',
                detail: 'validBefore and validAfter timestamps bound the authorization to a 1-hour window by default. After validBefore passes, the authorization is rejected even if it was never used.',
              },
              {
                control: 'Amount enforcement',
                detail: 'The value field in the authorization must match paymentRequirements.maxAmountRequired exactly. Any discrepancy returns AMOUNT_MISMATCH before on-chain execution.',
              },
              {
                control: 'EIP-712 typed data signing',
                detail: 'Signatures are bound to the USDC contract address on Base (domain separator). A signature valid on Base cannot be replayed on any other chain or contract.',
              },
              {
                control: 'Gas price safety',
                detail: 'The Facilitator checks Base gas price before every settlement. If gas exceeds 50 gwei (configurable), the settlement is rejected with GAS_PRICE_TOO_HIGH. This prevents economic attacks during gas spikes.',
              },
            ].map((item) => (
              <div key={item.control} className="border-2 border-black p-5">
                <div className="font-black text-[13px] uppercase tracking-tight mb-2 flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  {item.control}
                </div>
                <p className="text-sm text-neutral-600">{item.detail}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── API KEY SECURITY ── */}
        <Section title="API Key Security">
          <div className="space-y-4">
            {[
              {
                control: 'SHA-256 hashing',
                detail: 'Raw API keys (p402_live_...) are shown once at creation and immediately discarded. Only the SHA-256 hash is stored in the database. Even if the database were compromised, raw keys cannot be recovered.',
              },
              {
                control: 'Constant-time comparison',
                detail: 'Key verification uses a constant-time comparison (timingSafeEqual) to prevent timing attacks. A slow comparison loop would leak information about how many characters match.',
              },
              {
                control: 'Prefix for quick identification',
                detail: 'Keys are prefixed p402_live_ (production) or p402_test_ (test mode). This lets you grep logs for accidental key exposure without the key being usable.',
              },
              {
                control: 'Immediate revocation',
                detail: 'Revoked keys are rejected in < 2ms. The revocation propagates to all API gateway nodes via Redis pub/sub — no propagation delay.',
              },
            ].map((item) => (
              <div key={item.control} className="border-2 border-black p-5">
                <div className="font-black text-[13px] uppercase tracking-tight mb-2 flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  {item.control}
                </div>
                <p className="text-sm text-neutral-600">{item.detail}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── BILLING GUARD ── */}
        <Section title="Billing Guard">
          <p className="text-sm text-neutral-600 leading-relaxed mb-6">
            Six independent layers protect against runaway spend. All layers fail closed —
            when a layer trips, the request is rejected rather than allowed through.
          </p>
          <div className="border-2 border-black overflow-hidden">
            <div className="grid grid-cols-[2.5rem_1fr] bg-black text-white text-[10px] font-black uppercase tracking-widest">
              <div className="px-3 py-3">Layer</div>
              <div className="px-4 py-3 border-l border-neutral-700">Protection</div>
            </div>
            {[
              { n: '1', name: 'Rate limit', desc: 'Prevents request floods. Sliding window per API key.' },
              { n: '2', name: 'Daily circuit breaker', desc: 'Hard daily spend cap. Resets 00:00 UTC.' },
              { n: '3', name: 'Concurrency cap', desc: 'Limits simultaneous in-flight requests per tenant.' },
              { n: '4', name: 'Anomaly detection', desc: 'Gemini Sentinel pauses traffic on 10× spend spike.' },
              { n: '5', name: 'Per-request cap', desc: 'Rejects single requests above a cost ceiling.' },
              { n: '6', name: 'Atomic budget reservation', desc: 'Budget reserved before LLM call. Never overspend a session.' },
            ].map((row, i) => (
              <div key={row.n} className={`grid grid-cols-[2.5rem_1fr] text-sm ${i < 5 ? 'border-b border-neutral-200' : ''}`}>
                <div className="flex items-center justify-center bg-neutral-50 border-r border-neutral-200 font-black text-[13px]">
                  {row.n}
                </div>
                <div className="px-4 py-3">
                  <span className="font-bold">{row.name}</span>
                  <span className="text-neutral-500 ml-2">— {row.desc}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Link href="/docs/reference/billing-guard" className="text-[13px] font-bold text-black border-b-2 border-black hover:border-primary transition-colors no-underline">
              Full Billing Guard reference →
            </Link>
          </div>
        </Section>

        {/* ── THREAT MODEL ── */}
        <Section title="Threat Model">
          <div className="border-2 border-black overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr] bg-black text-white text-[10px] font-black uppercase tracking-widest">
              <div className="px-4 py-3">Threat</div>
              <div className="px-4 py-3 border-l border-neutral-700">Mitigation</div>
            </div>
            <SecurityRow
              threat="Stolen API key used by attacker"
              mitigation="Immediate revocation via dashboard. Daily spend cap limits blast radius. Anomaly detection alerts on unusual patterns."
            />
            <SecurityRow
              threat="Prompt-injection attack causes agent to make excessive LLM calls"
              mitigation="Session budget cap, daily circuit breaker, and Sentinel anomaly detection provide layered defence."
            />
            <SecurityRow
              threat="Replay attack: resubmit a signed EIP-3009 authorization"
              mitigation="Nonces are stored and checked before on-chain execution. REPLAY_DETECTED returned immediately."
            />
            <SecurityRow
              threat="Compromised facilitator wallet private key"
              mitigation="Facilitator wallet holds no funds — it only signs USDC transfers from user wallets. No funds at risk from key compromise alone."
            />
            <SecurityRow
              threat="Gas price spike drains facilitator budget"
              mitigation="50 gwei hard ceiling on settlement. Requests rejected above threshold with GAS_PRICE_TOO_HIGH."
            />
            <SecurityRow
              threat="Database breach exposes API keys"
              mitigation="Only SHA-256 hashes stored. Raw keys cannot be recovered from hashes."
            />
            <SecurityRow
              threat="Man-in-the-middle attack on API traffic"
              mitigation="TLS 1.3 enforced on all endpoints. HSTS preloaded. EIP-712 signatures are bound to specific contract addresses, making replay impossible even if intercepted."
            />
            <SecurityRow
              threat="Concurrent requests race to exhaust session budget"
              mitigation="Atomic budget reservation using database transactions. Budget never goes negative under concurrent load."
            />
          </div>
        </Section>

        {/* ── RESPONSIBLE DISCLOSURE ── */}
        <div className="mb-16">
          <Callout variant="neutral" title="Security disclosures">
            <p className="text-sm text-neutral-700 leading-relaxed">
              If you discover a security vulnerability in P402, please report it to{' '}
              <a href="mailto:security@p402.io" className="font-bold text-black border-b-2 border-black hover:border-primary transition-colors no-underline">
                security@p402.io
              </a>. We acknowledge all reports within 24 hours and aim to patch critical
              vulnerabilities within 72 hours. We do not pursue legal action against
              good-faith researchers.
            </p>
          </Callout>
        </div>

        {/* ── WHAT'S NEXT ── */}
        <div className="border-t-2 border-black pt-16">
          <Callout variant="lime" title="Related">
            <ul className="space-y-3">
              {[
                { label: 'Billing Guard — 6-layer protection details', href: '/docs/reference/billing-guard' },
                { label: 'x402 Protocol — payment mechanics', href: '/docs/facilitator' },
                { label: 'Architecture overview', href: '/docs/explanation/architecture' },
                { label: 'Error Codes', href: '/docs/reference/error-codes' },
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
