import type { Metadata } from 'next';
import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
    title: 'Meter-only quickstart | P402',
    description:
        'Use P402 Meter without exposing prompts. Your backend calls the model provider directly, then reports the economic event to P402.',
    alternates: { canonical: 'https://p402.io/docs/meter-only' },
    openGraph: {
        title: 'Meter-only quickstart | P402',
        description: 'P402 meters economics, not content. Meter-only mode lets you keep prompts inside your environment.',
        url: 'https://p402.io/docs/meter-only',
    },
};

function H2({ children }: { children: React.ReactNode }) {
    return <h2 className="text-2xl font-black uppercase tracking-tighter text-black mt-12 mb-4 border-b-2 border-black/10 pb-2">{children}</h2>;
}

function Code({ children, lang = 'json' }: { children: string; lang?: string }) {
    return (
        <pre className="bg-neutral-900 text-neutral-100 border-2 border-black font-mono text-[11px] leading-relaxed p-4 overflow-x-auto whitespace-pre">
            <code className={`language-${lang}`}>{children}</code>
        </pre>
    );
}

export default function MeterOnlyDocsPage() {
    return (
        <>
            <TopNav />
            <main className="max-w-[860px] mx-auto px-4 py-12 space-y-6">
                <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Docs · Meter</p>
                    <h1 className="text-4xl font-black uppercase tracking-tighter">Meter-only mode</h1>
                    <p className="text-neutral-600 max-w-[640px]">
                        Use P402 Meter when prompts, documents, code, or customer data must stay inside your application. Your backend calls the model provider directly. You report the economic event to P402. We meter without ever receiving the content.
                    </p>
                </div>

                <H2>1. When to use it</H2>
                <ul className="list-disc pl-5 space-y-2 text-[13px] text-neutral-700">
                    <li>You handle PHI, PII, secrets, or source code that cannot leave your environment.</li>
                    <li>You already have an OpenAI / Anthropic / Gemini integration and don&apos;t want to add a router.</li>
                    <li>You want CFO-grade attribution and budgets without changing how requests are made.</li>
                </ul>

                <H2>2. The contract</H2>
                <p className="text-[13px] text-neutral-700">
                    <code>POST /api/v2/meter/events</code> accepts the economic event and rejects any prompt / response / content / file / message / chat_history field with <code>INVALID_INPUT</code>. There is no path that persists raw content via this endpoint. Privacy posture is resolved server-side; the response tells you what was stored.
                </p>

                <H2>3. Minimum payload</H2>
                <Code>{`POST /api/v2/meter/events
Authorization: Bearer p402_live_...
Content-Type: application/json

{
  "request_id": "req_abc123",
  "source": "meter_only",
  "attribution": {
    "department_id": "claims",
    "employee_id":   "emp_42",
    "action_type":   "claims_summary",
    "workflow_id":   "prior_authorization"
  },
  "model": {
    "provider":   "google",
    "model_used": "gemini-2.0-flash"
  },
  "usage": {
    "input_tokens":  2140,
    "output_tokens": 801,
    "cost_usd":      0.0041,
    "latency_ms":    720,
    "cache_hit":     false
  },
  "governance": {
    "budget_id": "bud_claims_q2",
    "decision":  "approved"
  },
  "outcome": {
    "status":        "accepted",
    "quality_score": 0.91
  }
}`}</Code>

                <H2>4. Response</H2>
                <Code>{`200 OK

{
  "ok": true,
  "event_id":   "evt_...",
  "request_id": "req_abc123",
  "privacy": {
    "mode":                "metadata_only",
    "source":               "tenant_default",
    "prompt_stored":        false,
    "response_stored":      false,
    "redaction_applied":    false,
    "retention_expires_at": "2026-07-04T00:00:00.000Z"
  }
}`}</Code>

                <H2>5. What NOT to send</H2>
                <p className="text-[13px] text-neutral-700">
                    The endpoint hard-rejects any of these top-level fields. The error includes the offending name so misconfigured SDK adapters fail loudly:
                </p>
                <Code lang="text">{`prompt, prompts, response, responses, completion,
messages, content, text, file, files,
document, documents, chat, chat_history, transcript`}</Code>

                <H2>6. Privacy modes</H2>
                <p className="text-[13px] text-neutral-700">
                    Default is <code>metadata_only</code>. Tenant admins can change the tenant default and configure per-scope overrides at <Link href="/dashboard/settings/privacy" className="underline">/dashboard/settings/privacy</Link>:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-[13px] text-neutral-700">
                    <li><strong>metadata_only</strong> — economic metadata only. Default. CFO dashboards work today.</li>
                    <li><strong>fingerprint_only</strong> — HMAC fingerprints for duplicate / retry detection.</li>
                    <li><strong>redacted_trace</strong> — redacted samples and trace summaries (customer redacts first).</li>
                    <li><strong>private_gateway</strong> — gateway runs inside customer VPC; aggregates leave.</li>
                    <li><strong>full_trace</strong> — full prompt + response; opt-in only, retention-bound.</li>
                </ul>
                <p className="text-[13px] text-neutral-700">
                    Per-request callers can pass <code>privacy_mode</code> to ratchet TIGHTER (e.g. force <code>metadata_only</code> for a one-off demo request). Callers cannot widen — admin-saved scope overrides are the only path that can widen the tenant default.
                </p>

                <H2>7. Outcomes</H2>
                <p className="text-[13px] text-neutral-700">
                    Report what happened to a request so Optimize can compute cost per accepted output, retry waste, and quality-adjusted recommendations:
                </p>
                <Code>{`POST /api/v2/outcomes

{
  "request_id":    "req_abc123",
  "status":        "accepted",
  "quality_score": 0.91
}`}</Code>

                <H2>8. Reading events back</H2>
                <ul className="list-disc pl-5 space-y-2 text-[13px] text-neutral-700">
                    <li><code>GET /api/v2/meter/events</code> — paged list, filters by privacy_mode, owner, model, provider, evidence status.</li>
                    <li><code>GET /api/v2/meter/events/{`{id}`}</code> — single event with full privacy posture.</li>
                    <li><Link href="/dashboard/meter/events" className="underline">/dashboard/meter/events</Link> renders both with row → detail navigation.</li>
                </ul>

                <H2>9. Evidence bundles</H2>
                <p className="text-[13px] text-neutral-700">
                    Every evidence bundle export (<code>/api/v1/analytics/evidence-bundle</code>) includes a <code>privacy</code> block (mode, prompt_stored, response_stored, redaction_applied, retention_expires_at, response_capture_status, fingerprint excerpts). Finance / procurement / compliance exports always show what posture governed the event.
                </p>

                <div className="mt-12 pt-6 border-t-2 border-black/10 flex flex-wrap gap-3">
                    <Link href="/dashboard/settings/privacy" className="text-[10px] font-black uppercase tracking-widest border-2 border-primary bg-primary px-3 py-2 hover:bg-black hover:text-white hover:border-black transition-colors">
                        Configure privacy →
                    </Link>
                    <Link href="/dashboard/meter/events" className="text-[10px] font-black uppercase tracking-widest border-2 border-black px-3 py-2 hover:bg-neutral-50 transition-colors">
                        Browse events
                    </Link>
                    <Link href="/docs/quickstart" className="text-[10px] font-black uppercase tracking-widest border-2 border-black px-3 py-2 hover:bg-neutral-50 transition-colors">
                        Hosted-routing quickstart
                    </Link>
                </div>
            </main>
            <Footer />
        </>
    );
}
