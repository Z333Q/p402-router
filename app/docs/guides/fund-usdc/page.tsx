import type { Metadata } from 'next';
import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Fund with USDC | P402 How-To Guides',
  description:
    'Top up your P402 balance with USDC on Base. Gasless for users via EIP-3009. Settles on-chain in seconds.',
  alternates: { canonical: 'https://p402.io/docs/guides/fund-usdc' },
  openGraph: {
    title: 'Fund with USDC | P402',
    description: 'Add USDC to your P402 account using EIP-3009 gasless transfers on Base.',
    url: 'https://p402.io/docs/guides/fund-usdc',
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

export default function FundUsdcPage() {
  return (
    <div className="min-h-screen bg-white text-black selection:bg-primary selection:text-black">
      <TopNav />

      <div className="border-b-2 border-black bg-neutral-50">
        <div className="max-w-[860px] mx-auto px-6 py-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-neutral-500">
          <Link href="/docs" className="hover:text-black no-underline transition-colors">Docs</Link>
          <span>/</span>
          <span>How-To Guides</span>
          <span>/</span>
          <span className="text-black">Fund with USDC</span>
        </div>
      </div>

      <main className="max-w-[860px] mx-auto px-6 py-20">

        <div className="border-b-2 border-black pb-16 mb-16">
          <SectionLabel>DOCS / HOW-TO GUIDES</SectionLabel>
          <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tight leading-tight mb-6">
            FUND WITH<br />
            <span className="heading-accent">USDC.</span>
          </h1>
          <div className="border-l-[4px] border-black pl-5 max-w-xl">
            <p className="text-lg text-neutral-600 leading-relaxed">
              Add USDC on Base to your P402 account. Settlement is gasless for you —
              P402 pays the gas via EIP-3009 <span className="font-mono">transferWithAuthorization</span>.
            </p>
          </div>
        </div>

        {/* ── OPTIONS ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-6">Two Ways to Fund</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-black border-2 border-black">
            {[
              {
                title: 'Dashboard (Recommended)',
                badge: 'EASY',
                steps: [
                  'Go to Dashboard → Settings → Billing',
                  'Click "Add Funds"',
                  'Connect wallet (MetaMask, Coinbase, WalletConnect)',
                  'Enter USDC amount and sign one transaction',
                  'Balance appears in under 30 seconds',
                ],
              },
              {
                title: 'Programmatic (EIP-3009)',
                badge: 'ADVANCED',
                steps: [
                  'Sign an EIP-3009 TransferWithAuthorization off-chain',
                  'POST the signed payload to /api/v1/facilitator/settle',
                  'P402 submits the transaction and pays gas',
                  'No ETH required in your wallet',
                ],
              },
            ].map((opt) => (
              <div key={opt.title} className="p-8 bg-white">
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-[16px] font-black uppercase tracking-tight">{opt.title}</h3>
                  <span className="text-[9px] font-black uppercase tracking-widest bg-black text-primary px-2 py-0.5">
                    {opt.badge}
                  </span>
                </div>
                <ol className="space-y-2">
                  {opt.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-neutral-600">
                      <span className="font-mono font-bold text-black shrink-0">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>

        {/* ── CHAIN + TOKEN DETAILS ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-4">Chain &amp; Token Details</h2>
          <div className="border-2 border-black overflow-hidden">
            {[
              { label: 'Network', value: 'Base Mainnet (Chain ID: 8453)' },
              { label: 'Token', value: 'USDC (USD Coin)' },
              { label: 'USDC Contract', value: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
              { label: 'P402 Treasury', value: '0xFa772434DCe6ED78831EbC9eeAcbDF42E2A031a6' },
              { label: 'Decimals', value: '6 (1 USDC = 1,000,000 atomic units)' },
              { label: 'Minimum deposit', value: '$1.00 USDC' },
              { label: 'Settlement time', value: '< 30 seconds on Base' },
              { label: 'Gas paid by', value: 'P402 (gasless for user via EIP-3009)' },
            ].map((row, i) => (
              <div key={row.label} className={`flex text-sm ${i < 7 ? 'border-b border-neutral-200' : ''}`}>
                <div className="w-48 shrink-0 px-4 py-3 font-black uppercase text-[11px] tracking-widest bg-neutral-50">
                  {row.label}
                </div>
                <div className="px-4 py-3 font-mono text-neutral-700 border-l border-neutral-200 break-all">
                  {row.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── PROGRAMMATIC: GET USDC ON BASE ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-4">Get USDC on Base</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-6">
            If you don&apos;t have USDC on Base, bridge it from Ethereum or buy directly.
          </p>
          <div className="space-y-4">
            {[
              {
                title: 'Bridge from Ethereum',
                desc: 'Use the official Base Bridge to move USDC from Ethereum mainnet to Base.',
                link: 'https://bridge.base.org',
                linkLabel: 'bridge.base.org',
              },
              {
                title: 'Buy directly on Coinbase',
                desc: 'Purchase USDC and withdraw directly to your Base wallet — no bridge needed.',
                link: 'https://coinbase.com',
                linkLabel: 'coinbase.com',
              },
              {
                title: 'Swap on Base DEXs',
                desc: 'Swap any Base token for USDC via Uniswap, Aerodrome, or BaseSwap.',
              },
            ].map((opt) => (
              <div key={opt.title} className="border-2 border-black p-5 bg-neutral-50">
                <div className="font-black text-[13px] uppercase tracking-tight mb-1">{opt.title}</div>
                <p className="text-sm text-neutral-600">{opt.desc}</p>
                {opt.link && (
                  <a
                    href={opt.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-[13px] font-bold text-black border-b-2 border-black hover:border-primary transition-colors no-underline"
                  >
                    {opt.linkLabel} →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── PROGRAMMATIC: SIGN + SUBMIT ── */}
        <div className="mb-16">
          <h2 className="text-xl font-black uppercase italic tracking-tight mb-4">Programmatic Funding (EIP-3009)</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-6">
            For autonomous agents or server-side funding, sign an EIP-3009 authorization
            and submit it directly. Your wallet never pays gas.
          </p>

          <div className="mb-4 font-black text-[11px] uppercase tracking-widest text-neutral-500">Step 1 — Sign the authorization</div>
          <CodeBlock
            language="typescript"
            code={`import { createWalletClient, http, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

const USDC_ADDRESS  = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const P402_TREASURY = '0xFa772434DCe6ED78831EbC9eeAcbDF42E2A031a6';

const account = privateKeyToAccount(process.env.WALLET_PRIVATE_KEY as \`0x\${string}\`);
const client  = createWalletClient({ account, chain: base, transport: http() });

const nonce       = \`0x\${crypto.randomUUID().replace(/-/g, '').padEnd(64, '0')}\`;
const value       = parseUnits('10', 6);    // 10 USDC (6 decimals)
const validAfter  = BigInt(Math.floor(Date.now() / 1000) - 60);
const validBefore = BigInt(Math.floor(Date.now() / 1000) + 3600);  // 1 hour

const signature = await client.signTypedData({
  account,
  domain: {
    name: 'USD Coin',
    version: '2',
    chainId: base.id,
    verifyingContract: USDC_ADDRESS,
  },
  types: {
    TransferWithAuthorization: [
      { name: 'from',        type: 'address' },
      { name: 'to',          type: 'address' },
      { name: 'value',       type: 'uint256' },
      { name: 'validAfter',  type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce',       type: 'bytes32' },
    ],
  },
  primaryType: 'TransferWithAuthorization',
  message: {
    from:        account.address,
    to:          P402_TREASURY,
    value,
    validAfter,
    validBefore,
    nonce:       nonce as \`0x\${string}\`,
  },
});`}
          />

          <div className="mt-6 mb-4 font-black text-[11px] uppercase tracking-widest text-neutral-500">Step 2 — Submit to P402</div>
          <CodeBlock
            language="typescript"
            code={`const response = await fetch('https://p402.io/api/v1/facilitator/settle', {
  method: 'POST',
  headers: {
    Authorization: \`Bearer \${process.env.P402_API_KEY}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    paymentPayload: {
      x402Version: 2,
      scheme: 'exact',
      network: 'eip155:8453',
      payload: {
        signature,
        authorization: {
          from:        account.address,
          to:          P402_TREASURY,
          value:       value.toString(),
          validAfter:  validAfter.toString(),
          validBefore: validBefore.toString(),
          nonce,
        },
      },
    },
    paymentRequirements: {
      scheme: 'exact',
      network: 'eip155:8453',
      maxAmountRequired: value.toString(),
      resource: 'https://p402.io/api/v2/sessions/fund',
      description: 'P402 account funding',
      payTo: P402_TREASURY,
      asset: USDC_ADDRESS,
    },
  }),
});

const result = await response.json();
console.log('Settled:', result.transaction);  // Base tx hash`}
          />
        </div>

        {/* ── AGENT WALLETS ── */}
        <div className="mb-16">
          <Callout variant="lime" title="Autonomous agents — use CDP wallets">
            <p className="text-sm text-neutral-700 mb-3">
              For agents that fund themselves without human interaction, provision a CDP
              Server Wallet. P402 will automatically use the TEE-secured wallet to sign
              and submit the EIP-3009 authorization.
            </p>
            <Link
              href="/docs/guides/agents"
              className="text-[13px] font-bold text-black border-b-2 border-black hover:border-primary transition-colors no-underline"
            >
              Connect your agent →
            </Link>
          </Callout>
        </div>

        {/* ── WHAT'S NEXT ── */}
        <div className="border-t-2 border-black pt-16">
          <Callout variant="lime" title="What's next">
            <ul className="space-y-3">
              {[
                { label: 'Create a session with your new balance', href: '/docs/guides/sessions' },
                { label: 'x402 Protocol — how gasless payments work', href: '/docs/facilitator' },
                { label: 'API Reference — settle endpoint', href: '/docs/api' },
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
