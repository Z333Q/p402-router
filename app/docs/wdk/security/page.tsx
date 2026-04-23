import type { Metadata } from 'next';
import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';
import { CommandPaletteBar } from '../_components/CommandPaletteBar';

export const metadata: Metadata = {
  title: 'WDK Security & Privacy | P402 Docs',
  description:
    'Production security and privacy baseline for WDK + USDT0 integrations. Key management, nonce hygiene, signature validation, logging practices, and incident response.',
  alternates: { canonical: 'https://p402.io/docs/wdk/security' },
};

export default function WdkSecurityPage() {
  return (
    <div className="min-h-screen bg-white text-black selection:bg-primary selection:text-black">
      <TopNav />

      <div className="border-b-2 border-black bg-neutral-50">
        <div className="max-w-[860px] mx-auto px-6 py-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-neutral-500">
          <Link href="/docs" className="hover:text-black no-underline transition-colors">Docs</Link>
          <span>/</span>
          <Link href="/docs/wdk" className="hover:text-black no-underline transition-colors">WDK</Link>
          <span>/</span>
          <span className="text-black">Security &amp; Privacy</span>
        </div>
      </div>

      <main className="max-w-[860px] mx-auto px-6 py-20">

        {/* ── HEADING ── */}
        <div className="border-b-2 border-black pb-16 mb-16">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-neutral-500 font-mono mb-3">{'>_'} WDK / REFERENCE</p>
          <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tight leading-tight mb-6">
            SECURITY &amp;<br />
            <span className="heading-accent">PRIVACY.</span>
          </h1>
          <div className="border-l-[4px] border-black pl-5 max-w-xl">
            <p className="text-lg text-neutral-600 leading-relaxed">
              Operational security baseline for WDK + USDT0 integrations in production.
              Covers key management, nonce hygiene, signing security, logging practices,
              and incident response.
            </p>
          </div>
        </div>

        <CommandPaletteBar />

        {/* ── THREAT MODEL ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-4">Threat Model</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-6">
            WDK settlement involves three security-critical assets: the private key that signs
            authorizations, the nonces that prevent replay, and the API key that authenticates
            to P402. Compromise of any one of these can result in fund loss.
          </p>
          <div className="border-2 border-black overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-black text-white text-[10px] uppercase tracking-widest">
                  <th className="text-left px-4 py-3">Threat</th>
                  <th className="text-left px-4 py-3">Impact</th>
                  <th className="text-left px-4 py-3">Mitigation</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Private key leak', 'Attacker can sign unlimited transfers.', 'Use hardware wallets or HSMs. Never log or transmit private keys. Rotate immediately if suspected.'],
                  ['Nonce replay', 'Attacker replays a valid signature to settle again.', 'P402 tracks all nonces in the replay protection DB. Each nonce can only be settled once.'],
                  ['API key leak', 'Attacker can call settlement on your behalf.', 'SHA-256 hashed at rest. Rotate immediately via Dashboard → Settings → API Keys. Use scoped keys per environment.'],
                  ['Man-in-the-middle', 'Attacker intercepts and modifies settlement requests.', 'All P402 endpoints enforce HTTPS/TLS 1.3. EIP-712 signatures bind to exact authorization fields — modification breaks verification.'],
                  ['Expired authorization', 'User signs but settlement is delayed past validBefore.', 'Set validBefore to at least 1 hour from signing time. Always handle P402_SETTLEMENT_TIMEOUT errors.'],
                  ['Amount manipulation', 'Service charges more than declared.', 'P402 enforces amount matching at the facilitator layer. Requests where value ≠ maxAmountRequired are rejected.'],
                ].map(([threat, impact, mitigation]) => (
                  <tr key={threat} className="border-t-2 border-black align-top">
                    <td className="px-4 py-3 font-bold text-[13px] w-44">{threat}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{impact}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{mitigation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── KEY MANAGEMENT ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-4">Key Management</h2>

          <h3 className="font-black uppercase tracking-tight text-base mb-3">For user-facing flows</h3>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            When users sign their own authorizations (e.g. paying from their MetaMask wallet),
            the private key never leaves the browser. The WDK adapter calls the wallet&apos;s{' '}
            <span className="font-mono">eth_signTypedData_v4</span> method. The signature is
            the only thing your backend receives.
          </p>
          <div className="border-2 border-black p-5 bg-neutral-50 mb-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">Do / Don&apos;t</p>
            <div className="space-y-2 text-sm">
              {[
                { type: 'do', text: 'Receive the signature from the frontend and forward it directly to P402.' },
                { type: 'do', text: 'Validate the returned receipt on your backend to confirm settlement.' },
                { type: 'dont', text: 'Ask users to send you their private key or seed phrase.' },
                { type: 'dont', text: 'Store the signature in a database — it has no value after settlement.' },
                { type: 'dont', text: 'Log the full authorization object in plaintext application logs.' },
              ].map((item) => (
                <div key={item.text} className="flex items-start gap-2">
                  <span className={`font-mono font-bold shrink-0 ${item.type === 'do' ? 'text-green-700' : 'text-red-600'}`}>
                    {item.type === 'do' ? '✓' : '✗'}
                  </span>
                  <span className="text-neutral-700">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <h3 className="font-black uppercase tracking-tight text-base mb-3">For server-side / agent flows</h3>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            When your server or an autonomous agent signs authorizations, the private key lives
            in your infrastructure. Apply these practices:
          </p>
          <div className="space-y-0 border-2 border-black">
            {[
              { title: 'Use environment variables', desc: 'Store the private key in an environment variable, never in code or config files that could be committed to version control.' },
              { title: 'Prefer HSMs or TEEs for production', desc: 'P402 supports CDP Server Wallets (TEE-backed). The private key never leaves the hardware. Signing happens inside the secure enclave.' },
              { title: 'Separate keys per environment', desc: 'Use different signing keys for development, staging, and production. A dev key leak cannot drain production funds.' },
              { title: 'Implement key rotation before go-live', desc: 'Build a rotation procedure before you go to production. Rotation must be zero-downtime: generate new key, update P402 wallet record, retire old key.' },
            ].map((item, i) => (
              <div key={item.title} className={`p-5 ${i < 3 ? 'border-b-2 border-black' : ''}`}>
                <div className="font-black text-[13px] uppercase tracking-tight mb-1">{item.title}</div>
                <p className="text-sm text-neutral-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── NONCE HYGIENE ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-4">Nonce Hygiene</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            A nonce is a 32-byte random value embedded in every EIP-3009 authorization. P402
            records every used nonce and rejects any settlement that reuses one — this is the
            replay protection mechanism.
          </p>
          <div className="border-2 border-black p-5 bg-amber-50 mb-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Critical rule</p>
            <p className="text-sm text-neutral-700 font-bold">
              Never reuse a nonce. Never generate nonces from sequential IDs, timestamps, or
              deterministic inputs. Always generate 32 cryptographically random bytes.
            </p>
          </div>
          <div className="border-2 border-black bg-[#141414] overflow-x-auto">
            <div className="px-4 py-1.5 border-b border-neutral-700 text-[10px] font-black uppercase tracking-widest text-neutral-500 font-mono">
              typescript — correct nonce generation
            </div>
            <pre className="p-6 text-[#F5F5F5] font-mono text-sm leading-relaxed whitespace-pre">
{`// Correct: 32 cryptographically random bytes
const nonce = '0x' + crypto.getRandomValues(new Uint8Array(32))
  .reduce((hex, b) => hex + b.toString(16).padStart(2, '0'), '');

// Wrong: predictable, not 32 bytes of entropy
// const nonce = \`0x\${Date.now().toString(16)}\`;            // Too short
// const nonce = \`0x\${invoiceId.replace(/-/g, '')}\`;        // Deterministic
// const nonce = \`0x\${counter++}\`;                          // Sequential`}
            </pre>
          </div>
        </div>

        {/* ── LOGGING ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-4">Logging Practices</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Settlement flows involve sensitive data. Log enough to debug incidents without
            creating a liability for your users.
          </p>
          <div className="border-2 border-black overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-black bg-neutral-50">
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">Data</th>
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">Log it?</th>
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">Why</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['receipt_id', 'Yes — always', 'Essential for support and reconciliation.'],
                  ['txHash', 'Yes — always', 'Needed to verify settlement on-chain.'],
                  ['walletAddress (from)', 'Yes — masked', 'Log first 6 + last 4 chars: 0xABCD...1234'],
                  ['amount + asset', 'Yes — always', 'Needed for spend auditing.'],
                  ['signature', 'No', 'No value after settlement; storing creates unnecessary risk.'],
                  ['private key / nonce', 'Never', 'Catastrophic if leaked.'],
                  ['full authorization object', 'Dev/staging only', 'OK for debugging; never in production.'],
                  ['P402 API key', 'Never', 'Store only the last 4 chars for identification.'],
                ].map(([data, log, why]) => (
                  <tr key={data} className="border-b border-neutral-200 last:border-0">
                    <td className="px-4 py-3 font-mono text-[12px] font-bold">{data}</td>
                    <td className="px-4 py-3 text-sm font-bold">{log}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── PRIVACY ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-4">Privacy Considerations</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Settlement transactions are recorded on-chain and are permanently public. Communicate
            this clearly to your users.
          </p>
          <div className="space-y-0 border-2 border-black">
            {[
              {
                title: 'On-chain data is public',
                desc: 'Every settled transaction is visible on Base or Arbitrum block explorers. The from address, to address, amount, and timestamp are public permanently.',
              },
              {
                title: 'Wallet addresses are pseudonymous, not anonymous',
                desc: 'A wallet address does not directly identify a person, but on-chain activity can be linked to real identities through other data. Do not assume on-chain payments are anonymous.',
              },
              {
                title: 'P402 processes personal data',
                desc: 'P402 logs wallet addresses, API keys, and transaction metadata for fraud prevention and support. Review the P402 Privacy Policy before processing payments on behalf of EU/UK users (GDPR implications).',
              },
              {
                title: 'Minimize stored payment metadata',
                desc: 'Store only what you need: receipt_id, txHash, amount, and masked wallet address. Never persist raw private keys, seed phrases, or full authorization objects.',
              },
              {
                title: 'Implement retention policies',
                desc: 'Document how long you retain receipts, audit logs, and payment events. Follow applicable regulations for your jurisdiction and user base.',
              },
            ].map((item, i) => (
              <div key={item.title} className={`p-5 ${i < 4 ? 'border-b-2 border-black' : ''}`}>
                <div className="font-black text-[13px] uppercase tracking-tight mb-1">{item.title}</div>
                <p className="text-sm text-neutral-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── INCIDENT RESPONSE ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-4">Incident Response</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            If you suspect a key compromise or unauthorized settlement, act immediately:
          </p>
          <div className="space-y-3">
            {[
              { n: '1', title: 'Rotate the compromised key', desc: 'For P402 API keys: Dashboard → Settings → API Keys → Revoke. Generate a new key immediately. For signing keys: generate a new wallet, update all references, and drain the old wallet to the new one.' },
              { n: '2', title: 'Review recent settlements', desc: 'Pull settlement history from Dashboard → Transactions. Look for unexpected wallet addresses in the "from" field or amounts you did not authorize.' },
              { n: '3', title: 'Enable emergency pause', desc: 'If you have admin access, use POST /api/v1/admin/security with action: "pause" to halt all settlements for your account while you investigate.' },
              { n: '4', title: 'Contact P402 support', desc: 'Email security@p402.io with incident details. Include the compromised key\'s last 4 chars, time range of suspected activity, and any txHashes you believe are unauthorized.' },
            ].map((step) => (
              <div key={step.n} className="flex gap-5 border-2 border-black p-5">
                <div className="w-8 h-8 bg-primary border-2 border-black flex items-center justify-center font-black text-sm shrink-0">
                  {step.n}
                </div>
                <div>
                  <div className="font-black text-[13px] uppercase tracking-tight mb-1">{step.title}</div>
                  <p className="text-sm text-neutral-600">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── WHAT'S NEXT ── */}
        <div className="border-t-2 border-black pt-16">
          <div className="border-2 border-black p-5 bg-[#E9FFD0]">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4">Related</p>
            <ul className="space-y-3">
              {[
                { label: 'P402 Security Architecture — how P402 protects funds and keys', href: '/docs/explanation/security' },
                { label: 'API Reference — endpoint contracts', href: '/docs/wdk/api-reference' },
                { label: 'Error Codes — handling failures in production', href: '/docs/wdk/errors' },
                { label: 'CDP Agentic Wallets — TEE-secured server-side signing', href: '/docs/agentkit' },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="flex items-start gap-2 text-[15px] font-bold text-black no-underline group">
                    <span className="text-neutral-600 group-hover:text-black transition-colors shrink-0">→</span>
                    <span className="border-b-2 border-black group-hover:border-primary transition-colors">{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

      </main>
      <Footer />
    </div>
  );
}
