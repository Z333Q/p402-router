import type { Metadata } from 'next';
import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Manage API Keys | P402 How-To Guides',
  description:
    'Create, rotate, and revoke P402 API keys. Keys are shown once at creation. Only the SHA-256 hash is stored.',
  alternates: { canonical: 'https://p402.io/docs/guides/api-keys' },
  openGraph: {
    title: 'Manage API Keys | P402',
    description: 'Create, rotate, and revoke API keys securely.',
    url: 'https://p402.io/docs/guides/api-keys',
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

export default function ApiKeysPage() {
  return (
    <div className="min-h-screen bg-white text-black selection:bg-primary selection:text-black">
      <TopNav />

      <div className="border-b-2 border-black bg-neutral-50">
        <div className="max-w-[860px] mx-auto px-6 py-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-neutral-500">
          <Link href="/docs" className="hover:text-black no-underline transition-colors">Docs</Link>
          <span>/</span>
          <span>How-To Guides</span>
          <span>/</span>
          <span className="text-black">Manage API Keys</span>
        </div>
      </div>

      <main className="max-w-[860px] mx-auto px-6 py-20">

        <div className="border-b-2 border-black pb-16 mb-16">
          <SectionLabel>DOCS / HOW-TO GUIDES</SectionLabel>
          <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tight leading-tight mb-6">
            MANAGE<br />
            <span className="heading-accent">API KEYS.</span>
          </h1>
          <div className="border-l-[4px] border-black pl-5 max-w-xl">
            <p className="text-lg text-neutral-600 leading-relaxed">
              Create keys for CI/CD pipelines, agents, and team members.
              Keys are shown exactly once — only the SHA-256 hash is ever stored.
            </p>
          </div>
        </div>

        {/* ── SECURITY MODEL ── */}
        <div className="mb-16">
          <Callout variant="warn" title="Security model — read first">
            <ul className="space-y-2 text-sm text-neutral-700">
              {[
                'API keys are prefixed p402_live_ (production) or p402_test_ (test mode).',
                'The raw key is returned ONCE at creation time. P402 only stores the SHA-256 hash.',
                'If you lose a key, revoke it immediately and create a new one.',
                'Keys never expire unless you revoke them — rotate them regularly.',
                'Never commit keys to version control. Use environment variables or a secrets manager.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="font-mono font-bold text-amber-600 shrink-0">!</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Callout>
        </div>

        {/* ── CREATE VIA DASHBOARD ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-4">Create a Key — Dashboard</h2>
          <ol className="space-y-3">
            {[
              'Go to Dashboard → Settings → API Keys',
              'Click "Generate New Key"',
              'Name the key (e.g. "production-agent" or "ci-pipeline")',
              'Copy the key immediately — it will not be shown again',
              'Store it in your environment secrets (AWS Secrets Manager, Vercel env, GitHub Actions secrets)',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-neutral-700">
                <span className="w-6 h-6 bg-primary border-2 border-black flex items-center justify-center font-black text-xs shrink-0">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* ── CREATE VIA API ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-4">Create a Key — API</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Use your existing key to create additional keys programmatically.
          </p>
          <CodeBlock
            language="bash"
            code={`curl -s -X POST https://p402.io/api/v2/keys \\
  -H "Authorization: Bearer $P402_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "production-agent-v2"}' | jq .`}
          />
          <div className="mt-4">
            <Callout variant="neutral" title="Response — shown once">
              <CodeBlock
                code={`{
  "id": "key_01jx...",
  "name": "production-agent-v2",
  "key": "p402_live_a8f2bc...",    // ← save this NOW, not shown again
  "created_at": "2026-04-15T12:00:00Z",
  "last_used_at": null,
  "status": "active"
}`}
              />
            </Callout>
          </div>
        </div>

        {/* ── LIST KEYS ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-4">List Keys</h2>
          <CodeBlock
            language="bash"
            code={`curl -s https://p402.io/api/v2/keys \\
  -H "Authorization: Bearer $P402_API_KEY" | jq .`}
          />
          <div className="mt-4">
            <CodeBlock
              code={`{
  "keys": [
    {
      "id": "key_01jx...",
      "name": "production-agent-v2",
      "prefix": "p402_live_a8f2...",   // Only first 16 chars visible
      "created_at": "2026-04-15T12:00:00Z",
      "last_used_at": "2026-04-15T14:32:00Z",
      "status": "active"
    }
  ]
}`}
            />
          </div>
        </div>

        {/* ── REVOKE ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-4">Revoke a Key</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Revocation is immediate. Any in-flight request using the key will be rejected.
          </p>
          <CodeBlock
            language="bash"
            code={`curl -s -X DELETE https://p402.io/api/v2/keys/key_01jx... \\
  -H "Authorization: Bearer $P402_API_KEY" | jq .`}
          />
          <div className="mt-4">
            <CodeBlock
              code={`{ "id": "key_01jx...", "status": "revoked" }`}
            />
          </div>
        </div>

        {/* ── KEY ROTATION ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-4">Key Rotation Pattern</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Rotate keys without downtime using this blue-green pattern:
          </p>
          <div className="space-y-3">
            {[
              { step: '1', text: 'Create the new key while the old one is still active.' },
              { step: '2', text: 'Deploy the new key to your environment / secrets manager.' },
              { step: '3', text: 'Confirm the new key is working in production (check last_used_at).' },
              { step: '4', text: 'Revoke the old key.' },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3 border-2 border-black p-4 bg-neutral-50">
                <span className="w-7 h-7 bg-primary border-2 border-black flex items-center justify-center font-black text-xs shrink-0">
                  {item.step}
                </span>
                <span className="text-sm text-neutral-700 pt-0.5">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── SECRETS MANAGEMENT ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-4">Secrets Management</h2>
          <div className="space-y-4">
            {[
              {
                env: 'Vercel',
                code: '# In Vercel dashboard: Settings → Environment Variables\n# Or via CLI:\nvercel env add P402_API_KEY production',
              },
              {
                env: 'GitHub Actions',
                code: '# In repo: Settings → Secrets → Actions → New secret\n# Reference in workflow:\nenv:\n  P402_API_KEY: ${{ secrets.P402_API_KEY }}',
              },
              {
                env: 'AWS Secrets Manager',
                code: 'aws secretsmanager create-secret \\\n  --name /prod/p402/api-key \\\n  --secret-string "p402_live_..."',
              },
              {
                env: 'dotenv (local dev only)',
                code: '# .env.local — NEVER commit this file\nP402_API_KEY=p402_live_...',
              },
            ].map((item) => (
              <div key={item.env}>
                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">{item.env}</div>
                <CodeBlock language="bash" code={item.code} />
              </div>
            ))}
          </div>
        </div>

        {/* ── WHAT'S NEXT ── */}
        <div className="border-t-2 border-black pt-16">
          <Callout variant="lime" title="What's next">
            <ul className="space-y-3">
              {[
                { label: 'Create your first session', href: '/docs/guides/sessions' },
                { label: 'Error codes — authentication errors', href: '/docs/reference/error-codes' },
                { label: 'API Reference', href: '/docs/api' },
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
