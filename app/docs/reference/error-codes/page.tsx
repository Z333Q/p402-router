import type { Metadata } from 'next';
import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Error Codes | P402 Reference',
  description:
    'Complete reference for all P402 error codes, HTTP status mappings, and resolution steps.',
  alternates: { canonical: 'https://p402.io/docs/reference/error-codes' },
  openGraph: {
    title: 'Error Codes | P402',
    description: 'Full reference: P402 error codes, HTTP statuses, and how to resolve them.',
    url: 'https://p402.io/docs/reference/error-codes',
  },
};

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-neutral-500 font-mono mb-3">
      {'>_'} {children}
    </p>
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

interface ErrorEntry {
  code: string;
  http: number;
  category: string;
  description: string;
  resolution: string;
}

const ERRORS: ErrorEntry[] = [
  // Auth
  { code: 'UNAUTHORIZED', http: 401, category: 'Auth', description: 'Missing or invalid API key.', resolution: 'Provide a valid Bearer token in the Authorization header.' },
  { code: 'FORBIDDEN', http: 403, category: 'Auth', description: 'Valid key but insufficient permissions.', resolution: 'Check key scopes or upgrade your plan.' },
  { code: 'API_KEY_REVOKED', http: 401, category: 'Auth', description: 'The API key has been revoked.', resolution: 'Generate a new key in Dashboard → Settings → API Keys.' },

  // Billing Guard
  { code: 'RATE_LIMIT_EXCEEDED', http: 429, category: 'Billing Guard', description: 'Too many requests per minute.', resolution: 'Respect the Retry-After header. Implement exponential backoff.' },
  { code: 'DAILY_SPEND_LIMIT_EXCEEDED', http: 402, category: 'Billing Guard', description: 'Daily spend cap reached.', resolution: 'Wait for daily reset (00:00 UTC) or raise your cap in billing settings.' },
  { code: 'CONCURRENCY_LIMIT_EXCEEDED', http: 429, category: 'Billing Guard', description: 'Too many simultaneous in-flight requests.', resolution: 'Queue requests client-side using a semaphore.' },
  { code: 'ANOMALY_DETECTED', http: 402, category: 'Billing Guard', description: 'Spend velocity anomaly detected by Sentinel AI.', resolution: 'Review the anomaly in Dashboard → Intelligence and resume manually.' },
  { code: 'REQUEST_COST_EXCEEDED', http: 402, category: 'Billing Guard', description: 'Single request cost exceeds per-request cap.', resolution: 'Reduce prompt length or set a higher max_cost_usd.' },
  { code: 'SESSION_BUDGET_EXCEEDED', http: 402, category: 'Billing Guard', description: 'Session has no remaining budget.', resolution: 'Fund the session (POST /sessions/:id/fund) or create a new one.' },
  { code: 'BUDGET_RESERVATION_FAILED', http: 402, category: 'Billing Guard', description: 'Concurrent requests exhausted session budget atomically.', resolution: 'Fund the session or retry after a short backoff.' },

  // Sessions
  { code: 'SESSION_NOT_FOUND', http: 404, category: 'Sessions', description: 'Session ID does not exist or belongs to another tenant.', resolution: 'Verify the session ID. Check it belongs to your account.' },
  { code: 'SESSION_EXPIRED', http: 410, category: 'Sessions', description: 'Session TTL has elapsed.', resolution: 'Create a new session. Expired sessions cannot be reactivated.' },
  { code: 'SESSION_CLOSED', http: 410, category: 'Sessions', description: 'Session was explicitly closed.', resolution: 'Create a new session.' },

  // Routing
  { code: 'NO_PROVIDER_AVAILABLE', http: 503, category: 'Routing', description: 'No healthy provider found for the request.', resolution: 'Check /api/health. Retry after backoff.' },
  { code: 'PROVIDER_TIMEOUT', http: 504, category: 'Routing', description: 'Selected provider did not respond in time.', resolution: 'Retry. P402 auto-retries once on timeout.' },
  { code: 'PROVIDER_ERROR', http: 502, category: 'Routing', description: 'Upstream provider returned an error.', resolution: 'Retry. If persistent, the provider may be degraded.' },
  { code: 'MODEL_NOT_FOUND', http: 404, category: 'Routing', description: 'Requested model does not exist or is unavailable.', resolution: 'Use GET /api/v2/models to list available models.' },
  { code: 'CONTEXT_TOO_LONG', http: 422, category: 'Routing', description: 'Prompt exceeds the selected model\'s context window.', resolution: 'Reduce prompt length or specify a model with a larger context.' },

  // Input
  { code: 'INVALID_INPUT', http: 400, category: 'Input', description: 'Request body failed schema validation.', resolution: 'Check the error.details field for the specific field and constraint.' },
  { code: 'MISSING_FIELD', http: 400, category: 'Input', description: 'A required field is missing.', resolution: 'Add the missing field to the request body.' },
  { code: 'INVALID_MODE', http: 400, category: 'Input', description: 'mode must be cost | quality | speed | balanced.', resolution: 'Use a valid routing mode.' },

  // x402 / Settlement
  { code: 'INVALID_SIGNATURE', http: 400, category: 'x402', description: 'EIP-712 signature verification failed.', resolution: 'Check domain parameters, type hash, and nonce format.' },
  { code: 'REPLAY_DETECTED', http: 400, category: 'x402', description: 'The nonce has already been used.', resolution: 'Generate a fresh nonce (crypto.randomBytes(32)).' },
  { code: 'PAYMENT_EXPIRED', http: 400, category: 'x402', description: 'validBefore timestamp has passed.', resolution: 'Sign a new authorization with a future validBefore.' },
  { code: 'AMOUNT_MISMATCH', http: 400, category: 'x402', description: 'Authorization amount ≠ paymentRequirements.maxAmountRequired.', resolution: 'Ensure value in the authorization matches maxAmountRequired.' },
  { code: 'GAS_PRICE_TOO_HIGH', http: 503, category: 'x402', description: 'Base gas price exceeds configured safety limit.', resolution: 'Retry when gas normalises. P402 rejects settlement above 50 gwei.' },

  // Mandates (AP2)
  { code: 'MANDATE_NOT_FOUND', http: 404, category: 'AP2 Mandates', description: 'Mandate ID not found.', resolution: 'Verify mandate ID and tenant ownership.' },
  { code: 'MANDATE_INACTIVE', http: 403, category: 'AP2 Mandates', description: 'Mandate status is not active.', resolution: 'Check mandate status — may be exhausted, expired, or revoked.' },
  { code: 'MANDATE_EXPIRED', http: 403, category: 'AP2 Mandates', description: 'Mandate valid_until has passed.', resolution: 'Issue a new mandate.' },
  { code: 'MANDATE_BUDGET_EXCEEDED', http: 402, category: 'AP2 Mandates', description: 'Amount would exceed mandate\'s max_amount_usd.', resolution: 'Issue a new mandate with a higher budget.' },
  { code: 'MANDATE_CATEGORY_DENIED', http: 403, category: 'AP2 Mandates', description: 'Request category not in mandate\'s allowed_categories.', resolution: 'Update the mandate constraints or issue a new mandate.' },

  // Internal
  { code: 'INTERNAL_ERROR', http: 500, category: 'Internal', description: 'Unexpected server error.', resolution: 'Retry with exponential backoff. Contact support if persistent.' },
  { code: 'DATABASE_ERROR', http: 503, category: 'Internal', description: 'Database temporarily unavailable.', resolution: 'Retry after backoff. Check status.p402.io.' },
];

const CATEGORIES = [...new Set(ERRORS.map((e) => e.category))];

export default function ErrorCodesPage() {
  return (
    <div className="min-h-screen bg-white text-black selection:bg-primary selection:text-black">
      <TopNav />

      <div className="border-b-2 border-black bg-neutral-50">
        <div className="max-w-[1100px] mx-auto px-6 py-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-neutral-500">
          <Link href="/docs" className="hover:text-black no-underline transition-colors">Docs</Link>
          <span>/</span>
          <span>Reference</span>
          <span>/</span>
          <span className="text-black">Error Codes</span>
        </div>
      </div>

      <main className="max-w-[1100px] mx-auto px-6 py-20">

        <div className="border-b-2 border-black pb-16 mb-16">
          <SectionLabel>DOCS / REFERENCE</SectionLabel>
          <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tight leading-tight mb-6">
            ERROR<br />
            <span className="heading-accent">CODES.</span>
          </h1>
          <div className="border-l-[4px] border-black pl-5 max-w-xl">
            <p className="text-lg text-neutral-600 leading-relaxed">
              Every P402 error response includes a machine-readable <span className="font-mono">code</span> field.
              Use it in your error handler to distinguish billing errors from provider failures.
            </p>
          </div>
        </div>

        {/* ── ERROR RESPONSE FORMAT ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-4">Response Format</h2>
          <CodeBlock
            code={`// All P402 error responses follow this structure:
{
  "error": {
    "code": "SESSION_BUDGET_EXCEEDED",       // Machine-readable constant
    "message": "Human-readable description",
    "request_id": "req_01jx...",             // Use this when contacting support
    // Optional context fields:
    "session_remaining_usd": 0.00,
    "retry_after": 5,                        // Seconds (rate limit errors)
    "details": { ... }                       // Validation errors
  }
}`}
          />
        </div>

        {/* ── TABLES BY CATEGORY ── */}
        <div className="mb-16 space-y-12">
          {CATEGORIES.map((cat) => {
            const catErrors = ERRORS.filter((e) => e.category === cat);
            return (
              <div key={cat}>
                <h2 className="text-[13px] font-black uppercase tracking-widest mb-4 border-b-2 border-black pb-2">
                  {cat}
                </h2>
                <div className="border-2 border-black overflow-hidden">
                  <div className="grid grid-cols-[2fr_1fr_3fr_3fr] bg-black text-white text-[9px] font-black uppercase tracking-widest hidden md:grid">
                    <div className="px-4 py-2">Code</div>
                    <div className="px-4 py-2 border-l border-neutral-700">HTTP</div>
                    <div className="px-4 py-2 border-l border-neutral-700">Description</div>
                    <div className="px-4 py-2 border-l border-neutral-700">Resolution</div>
                  </div>
                  {catErrors.map((err, i) => (
                    <div
                      key={err.code}
                      className={`grid grid-cols-1 md:grid-cols-[2fr_1fr_3fr_3fr] text-sm ${i < catErrors.length - 1 ? 'border-b border-neutral-200' : ''}`}
                    >
                      <div className="px-4 py-3 font-mono font-bold text-[12px] bg-neutral-50">{err.code}</div>
                      <div className="px-4 py-3 font-mono text-neutral-500 md:border-l border-neutral-200">{err.http}</div>
                      <div className="px-4 py-3 text-neutral-600 md:border-l border-neutral-200">{err.description}</div>
                      <div className="px-4 py-3 text-neutral-500 md:border-l border-neutral-200 text-[13px]">{err.resolution}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── RETRY GUIDE ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-4">Retry Guide</h2>
          <div className="border-2 border-black overflow-hidden">
            <div className="grid grid-cols-[2fr_1fr_3fr] bg-black text-white text-[10px] font-black uppercase tracking-widest">
              <div className="px-4 py-3">Error Type</div>
              <div className="px-4 py-3 border-l border-neutral-700">Retry?</div>
              <div className="px-4 py-3 border-l border-neutral-700">Strategy</div>
            </div>
            {[
              { type: '4xx (client errors)', retry: 'No', strategy: 'Fix the request. Retrying the same request will get the same error.' },
              { type: 'RATE_LIMIT_EXCEEDED (429)', retry: 'Yes', strategy: 'Wait for Retry-After seconds, then retry.' },
              { type: 'PROVIDER_TIMEOUT (504)', retry: 'Yes', strategy: 'Immediate retry once. P402 will select a different provider.' },
              { type: 'PROVIDER_ERROR (502)', retry: 'Yes', strategy: 'Exponential backoff: 1s, 2s, 4s. P402 avoids degraded providers.' },
              { type: 'DATABASE_ERROR (503)', retry: 'Yes', strategy: 'Exponential backoff. Check status.p402.io.' },
              { type: 'INTERNAL_ERROR (500)', retry: 'Yes', strategy: 'Retry up to 3 times with backoff. Contact support if persistent.' },
            ].map((row, i) => (
              <div key={row.type} className={`grid grid-cols-[2fr_1fr_3fr] text-sm ${i < 5 ? 'border-b border-neutral-200' : ''}`}>
                <div className="px-4 py-3 font-mono text-[13px] bg-neutral-50">{row.type}</div>
                <div className="px-4 py-3 font-black text-[13px] border-l border-neutral-200">
                  <span className={row.retry === 'Yes' ? 'text-green-600' : 'text-red-500'}>{row.retry}</span>
                </div>
                <div className="px-4 py-3 text-neutral-600 border-l border-neutral-200">{row.strategy}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── WHAT'S NEXT ── */}
        <div className="border-t-2 border-black pt-16">
          <Callout variant="lime" title="Related">
            <ul className="space-y-3">
              {[
                { label: 'Billing Guard — the 6 protection layers', href: '/docs/reference/billing-guard' },
                { label: 'API Reference', href: '/docs/api' },
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
