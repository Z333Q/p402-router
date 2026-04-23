import React from 'react'
import type { ArticleContent } from '../[slug]/page'

export const technicalArticles: Record<string, ArticleContent> = {

  // ─────────────────────────────────────────────────────────────────────────
  // 1. SDK Quickstart
  // ─────────────────────────────────────────────────────────────────────────
  'sdk-quickstart': {
    title: 'SDK Quickstart',
    category: 'Technical Guides',
    categorySlug: 'technical',
    updatedAt: 'April 2025',
    body: (
      <>
        <p className="text-sm text-neutral-700 leading-relaxed">
          This guide walks through everything your audience needs to make their first P402 request,
          switch routing modes, manage sessions, and read spend analytics. Use it as the backbone of
          a getting-started blog post, YouTube tutorial, or written walkthrough.
        </p>

        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          <strong>Prerequisites:</strong> A P402 account (free tier works), Python 3.8+ or
          Node.js 18+, and the standard <code>openai</code> package already installed. No new SDK
          to install — P402 is a drop-in replacement for the OpenAI base URL.
        </div>

        {/* Step 1 */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Step 1 — Get Your API Key
        </h2>
        <div className="flex items-start gap-3 my-3">
          <span className="w-6 h-6 bg-black text-primary text-[11px] font-black flex items-center justify-center shrink-0">1</span>
          <div>
            <p className="text-sm text-neutral-700 leading-relaxed">
              Log into your P402 dashboard at <strong>https://p402.io/dashboard</strong> and
              navigate to <strong>Settings → API Keys</strong>. Click <strong>Generate New Key</strong>.
              Copy the key immediately — it is shown only once.
            </p>
            <p className="text-sm text-neutral-700 leading-relaxed mt-2">
              Your key looks like: <code>p402_live_abc123...</code>
            </p>
            <div className="border-2 border-error px-4 py-3 text-sm text-error font-medium my-4">
              Store your API key in an environment variable, never in source code. If you commit it
              accidentally, rotate it immediately from the dashboard.
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Step 2 — Install the SDK (nothing new required)
        </h2>
        <div className="flex items-start gap-3 my-3">
          <span className="w-6 h-6 bg-black text-primary text-[11px] font-black flex items-center justify-center shrink-0">2</span>
          <div>
            <p className="text-sm text-neutral-700 leading-relaxed">
              P402 is fully OpenAI API-compatible. If you already have the OpenAI SDK, you are done.
              If not, install it now:
            </p>
            <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`# Python
pip install openai

# Node.js / TypeScript
npm install openai`}</code></pre>
            <p className="text-sm text-neutral-700 leading-relaxed">
              The only change is the <code>base_url</code> / <code>baseURL</code> and the API key
              prefix. Every method — <code>chat.completions.create</code>, streaming,
              function calling — works identically.
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Step 3 — Your First Request
        </h2>
        <div className="flex items-start gap-3 my-3">
          <span className="w-6 h-6 bg-black text-primary text-[11px] font-black flex items-center justify-center shrink-0">3</span>
          <div>
            <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Python</h3>
            <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`import os
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["P402_API_KEY"],   # p402_live_...
    base_url="https://p402.io/api/v2",
)

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {"role": "user", "content": "Explain async/await in Python in two sentences."}
    ],
)

print(response.choices[0].message.content)`}</code></pre>

            <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">JavaScript / TypeScript</h3>
            <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.P402_API_KEY,   // p402_live_...
  baseURL: 'https://p402.io/api/v2',
})

const response = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'user', content: 'Explain async/await in JavaScript in two sentences.' }
  ],
})

console.log(response.choices[0].message.content)`}</code></pre>

            <p className="text-sm text-neutral-700 leading-relaxed">
              Expected output: a short two-sentence explanation. Response format is identical to the
              OpenAI API — <code>response.choices[0].message.content</code> always holds the text.
            </p>
          </div>
        </div>

        {/* Step 4 */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Step 4 — Switch Routing Modes
        </h2>
        <div className="flex items-start gap-3 my-3">
          <span className="w-6 h-6 bg-black text-primary text-[11px] font-black flex items-center justify-center shrink-0">4</span>
          <div>
            <p className="text-sm text-neutral-700 leading-relaxed">
              P402 routes your request to the best provider based on the mode you choose.
              Pass the mode as an HTTP header or as a top-level body parameter named
              <code> x_p402_mode</code>.
            </p>
            <ul className="space-y-2 text-sm text-neutral-700 list-none mt-3">
              <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>cost</strong> — cheapest provider that supports the model</span></li>
              <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>quality</strong> — highest-capability provider</span></li>
              <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>speed</strong> — lowest p95 latency</span></li>
              <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>balanced</strong> — default; optimizes across all three</span></li>
            </ul>

            <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Python — header approach</h3>
            <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`import os
import httpx
from openai import OpenAI

# Pass a custom default header so every request uses cost mode
client = OpenAI(
    api_key=os.environ["P402_API_KEY"],
    base_url="https://p402.io/api/v2",
    default_headers={"X-P402-Mode": "cost"},
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Summarize the Rust ownership model."}],
)

print(response.choices[0].message.content)
# The model field in the response reflects which provider was actually used`}</code></pre>

            <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">JavaScript — per-request override</h3>
            <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`// Use quality mode for this specific call only
const response = await client.chat.completions.create(
  {
    model: 'claude-3-5-sonnet-20241022',
    messages: [{ role: 'user', content: 'Review this code for security issues.' }],
  },
  {
    headers: { 'X-P402-Mode': 'quality' },
  }
)`}</code></pre>
          </div>
        </div>

        {/* Step 5 */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Step 5 — List Available Models
        </h2>
        <div className="flex items-start gap-3 my-3">
          <span className="w-6 h-6 bg-black text-primary text-[11px] font-black flex items-center justify-center shrink-0">5</span>
          <div>
            <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`curl https://p402.io/api/v2/models \\
  -H "Authorization: Bearer $P402_API_KEY" | jq '.data[].id'`}</code></pre>
            <p className="text-sm text-neutral-700 leading-relaxed">
              Sample output (truncated):
            </p>
            <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`"gpt-4o"
"gpt-4o-mini"
"gpt-4-turbo"
"claude-3-5-sonnet-20241022"
"claude-3-haiku-20240307"
"gemini-1.5-pro"
"gemini-1.5-flash"
"llama-3.1-70b-instruct"
"deepseek-chat"
"mixtral-8x7b-instruct"`}</code></pre>
            <p className="text-sm text-neutral-700 leading-relaxed">
              Use these exact strings as the <code>model</code> parameter. The response follows the
              OpenAI <code>/models</code> schema so existing tooling that reads model lists works
              without changes.
            </p>
          </div>
        </div>

        {/* Step 6 */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Step 6 — Read the Cache-Hit Header
        </h2>
        <div className="flex items-start gap-3 my-3">
          <span className="w-6 h-6 bg-black text-primary text-[11px] font-black flex items-center justify-center shrink-0">6</span>
          <div>
            <p className="text-sm text-neutral-700 leading-relaxed">
              P402 uses semantic caching by default. When two semantically similar requests arrive
              within the same tenant, the second gets served from cache — instantly, at zero LLM
              cost. The response header <code>X-P402-Cache: hit</code> tells you when this happens.
            </p>
            <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`import os
import httpx
from openai import OpenAI

# Use the underlying httpx client to capture response headers
transport = httpx.HTTPTransport()
http_client = httpx.Client(transport=transport)

client = OpenAI(
    api_key=os.environ["P402_API_KEY"],
    base_url="https://p402.io/api/v2",
    http_client=http_client,
)

with client.chat.completions.with_raw_response.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "What is a REST API?"}],
) as response_obj:
    cache_status = response_obj.headers.get("X-P402-Cache", "miss")
    completion = response_obj.parse()

print(f"Cache: {cache_status}")
print(completion.choices[0].message.content)

# Run twice with the same prompt — second call returns cache: hit`}</code></pre>
            <p className="text-sm text-neutral-700 leading-relaxed">
              To bypass the cache for a specific request, send the header
              <code> X-P402-Cache-Control: no-cache</code>.
            </p>
          </div>
        </div>

        {/* Step 7 */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Step 7 — Create a Session with a Budget
        </h2>
        <div className="flex items-start gap-3 my-3">
          <span className="w-6 h-6 bg-black text-primary text-[11px] font-black flex items-center justify-center shrink-0">7</span>
          <div>
            <p className="text-sm text-neutral-700 leading-relaxed">
              Sessions let you pre-allocate a USDC budget for an agent or user. All requests made
              with the session token draw from that budget and stop when it is exhausted —
              no surprise bills.
            </p>
            <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`import os, requests

headers = {
    "Authorization": f"Bearer {os.environ['P402_API_KEY']}",
    "Content-Type": "application/json",
}

# Create a $5 session valid for 24 hours
session_resp = requests.post(
    "https://p402.io/api/v2/sessions",
    json={
        "budget_usd": 5.0,
        "expires_in_seconds": 86400,
        "routing_mode": "cost",
    },
    headers=headers,
)
session = session_resp.json()
session_token = session["session_token"]  # ses_...
print(f"Session: {session_token}")
print(f"Wallet:  {session['wallet_address']}")

# Now use the session token instead of your API key for this agent's calls
from openai import OpenAI

agent_client = OpenAI(
    api_key=session_token,
    base_url="https://p402.io/api/v2",
)

response = agent_client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Draft a cold email subject line."}],
)
print(response.choices[0].message.content)`}</code></pre>
          </div>
        </div>

        {/* Step 8 */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Step 8 — Check Spend Analytics
        </h2>
        <div className="flex items-start gap-3 my-3">
          <span className="w-6 h-6 bg-black text-primary text-[11px] font-black flex items-center justify-center shrink-0">8</span>
          <div>
            <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`curl "https://p402.io/api/v2/analytics/spend?period=7d" \\
  -H "Authorization: Bearer $P402_API_KEY" | jq .`}</code></pre>
            <p className="text-sm text-neutral-700 leading-relaxed">Sample response:</p>
            <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`{
  "period": "7d",
  "total_usd": 1.24,
  "total_requests": 412,
  "cache_hit_rate": 0.31,
  "savings_from_cache_usd": 0.38,
  "breakdown_by_model": {
    "gpt-4o-mini": { "requests": 310, "usd": 0.62 },
    "claude-3-haiku-20240307": { "requests": 102, "usd": 0.62 }
  },
  "breakdown_by_mode": {
    "cost": 310,
    "quality": 55,
    "balanced": 47
  }
}`}</code></pre>
          </div>
        </div>

        {/* Common Mistakes */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Common Mistakes
        </h2>
        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>
              <strong>Wrong base_url format.</strong> Use <code>https://p402.io/api/v2</code>
              — no trailing slash. Adding <code>/chat/completions</code> yourself causes a 404
              because the SDK appends the path automatically.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>
              <strong>Using <code>sk-...</code> key format.</strong> P402 keys start with
              <code> p402_live_</code>. A key starting with <code>sk-</code> will return 401
              immediately.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>
              <strong>Model name not found.</strong> P402 uses the provider's canonical model
              identifier (e.g. <code>claude-3-5-sonnet-20241022</code>, not
              <code> claude-sonnet</code>). Run <code>GET /api/v2/models</code> to see the exact
              strings.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>
              <strong>Mixing session token and API key.</strong> Once you create a session, use the
              <code> ses_...</code> token as the API key for that agent's calls. Do not pass both.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>
              <strong>Forgetting <code>Content-Type</code> on direct HTTP calls.</strong> The OpenAI
              SDK sets this automatically. Raw <code>fetch</code> / <code>curl</code> calls need
              <code> -H "Content-Type: application/json"</code>.
            </span>
          </li>
        </ul>
      </>
    ),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 2. x402 Code Walkthrough
  // ─────────────────────────────────────────────────────────────────────────
  'x402-code-walkthrough': {
    title: 'x402 Code Walkthrough',
    category: 'Technical Guides',
    categorySlug: 'technical',
    updatedAt: 'April 2025',
    body: (
      <>
        <p className="text-sm text-neutral-700 leading-relaxed">
          x402 is a machine-native payment protocol that uses HTTP 402 as a first-class signal.
          Instead of a login wall or a Stripe checkout, a resource server returns a signed payment
          requirement and the client — which can be an AI agent — signs an EIP-3009 USDC transfer
          and attaches it to the next request. No gas, no wallet popups, no credit card.
        </p>

        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          <strong>What you need:</strong> A funded USDC wallet on Base mainnet (or Base Sepolia for
          testing), viem or ethers.js v6, and a P402 API key.
          USDC on Base: <code>0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913</code>
        </div>

        {/* Section 1 */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          1. The EIP-3009 Authorization Structure
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          x402 payments are EIP-712 signed messages authorizing a USDC transfer. The signer does
          not submit a transaction — the facilitator does. This is why there is no gas cost for the
          payer.
        </p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`// Full TypeScript types for the x402 payment wire format

interface TransferAuthorization {
  from: \`0x\${string}\`        // Payer wallet address
  to: \`0x\${string}\`          // Recipient (P402 treasury or resource owner)
  value: bigint               // Amount in USDC atomic units (6 decimals)
  validAfter: bigint          // Unix timestamp — not valid before this time
  validBefore: bigint         // Unix timestamp — expires after this time
  nonce: \`0x\${string}\`       // Random bytes32 — used exactly once
}

interface PaymentPayload {
  x402Version: 2
  scheme: 'exact'
  network: 'eip155:8453'     // CAIP-2 identifier for Base Mainnet
  payload: {
    signature: \`0x\${string}\` // 65-byte EIP-712 signature
    authorization: TransferAuthorization
  }
}

interface PaymentRequirements {
  scheme: 'exact'
  network: 'eip155:8453'
  maxAmountRequired: string  // Amount in atomic USDC units (e.g. "50000" = $0.05)
  resource: string           // URL of the resource being paid for
  description: string
  payTo: \`0x\${string}\`      // Treasury address
  asset: \`0x\${string}\`      // USDC contract address
}`}</code></pre>

        {/* Section 2 */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          2. The EIP-712 Domain for USDC on Base
        </h2>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`import { type TypedDataDomain } from 'viem'

// This domain is fixed — it is determined by the USDC contract, not by P402
export const USDC_DOMAIN: TypedDataDomain = {
  name: 'USD Coin',
  version: '2',
  chainId: 8453,                                            // Base Mainnet
  verifyingContract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
}

export const TRANSFER_WITH_AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: 'from',        type: 'address' },
    { name: 'to',         type: 'address' },
    { name: 'value',      type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore',type: 'uint256' },
    { name: 'nonce',      type: 'bytes32' },
  ],
} as const`}</code></pre>

        {/* Section 3 */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          3. Signing the Authorization
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Use viem's <code>signTypedData</code> to produce the EIP-712 signature. The wallet doing
          the signing must hold the USDC being transferred.
        </p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`import { createWalletClient, http, toHex, pad } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base } from 'viem/chains'
import { USDC_DOMAIN, TRANSFER_WITH_AUTHORIZATION_TYPES } from './eip712'

const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
const P402_TREASURY = '0xFa772434DCe6ED78831EbC9eeAcbDF42E2A031a6'

export async function signX402Payment(params: {
  privateKey: \`0x\${string}\`
  amountUsdc: number          // e.g. 0.05 for five cents
  resource: string            // URL being paid for
}) {
  const { privateKey, amountUsdc, resource } = params

  const account = privateKeyToAccount(privateKey)
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http('https://mainnet.base.org'),
  })

  // USDC has 6 decimals
  const value = BigInt(Math.round(amountUsdc * 1_000_000))

  const now = Math.floor(Date.now() / 1000)
  const validAfter = BigInt(now - 60)    // 1 minute in the past (clock skew)
  const validBefore = BigInt(now + 300)  // 5 minutes from now

  // Random 32-byte nonce — never reuse
  const nonceBytes = crypto.getRandomValues(new Uint8Array(32))
  const nonce = toHex(nonceBytes) as \`0x\${string}\`

  const authorization = {
    from: account.address,
    to: P402_TREASURY as \`0x\${string}\`,
    value,
    validAfter,
    validBefore,
    nonce,
  }

  const signature = await walletClient.signTypedData({
    account,
    domain: USDC_DOMAIN,
    types: TRANSFER_WITH_AUTHORIZATION_TYPES,
    primaryType: 'TransferWithAuthorization',
    message: authorization,
  })

  const paymentPayload = {
    x402Version: 2 as const,
    scheme: 'exact' as const,
    network: 'eip155:8453' as const,
    payload: {
      signature,
      authorization: {
        from: authorization.from,
        to: authorization.to,
        value: authorization.value.toString(),
        validAfter: authorization.validAfter.toString(),
        validBefore: authorization.validBefore.toString(),
        nonce: authorization.nonce,
      },
    },
  }

  const paymentRequirements = {
    scheme: 'exact' as const,
    network: 'eip155:8453' as const,
    maxAmountRequired: value.toString(),
    resource,
    description: 'API access payment',
    payTo: P402_TREASURY as \`0x\${string}\`,
    asset: USDC_ADDRESS as \`0x\${string}\`,
  }

  return { paymentPayload, paymentRequirements }
}`}</code></pre>

        {/* Section 4 */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          4. Submit to P402 Verify Endpoint
        </h2>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`async function verifyPayment(
  paymentPayload: object,
  paymentRequirements: object
): Promise<{ valid: boolean; error?: string }> {
  const response = await fetch('https://p402.io/api/v1/facilitator/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${process.env.P402_API_KEY}\`,
    },
    body: JSON.stringify({ paymentPayload, paymentRequirements }),
  })

  if (!response.ok) {
    const err = await response.json()
    return { valid: false, error: err.message }
  }

  const data = await response.json()
  return { valid: data.valid }
}

// Usage
const { paymentPayload, paymentRequirements } = await signX402Payment({
  privateKey: process.env.PAYER_PRIVATE_KEY as \`0x\${string}\`,
  amountUsdc: 0.05,
  resource: 'https://your-api.com/report/generate',
})

const { valid, error } = await verifyPayment(paymentPayload, paymentRequirements)
if (!valid) {
  console.error('Payment invalid:', error)
  process.exit(1)
}`}</code></pre>

        {/* Section 5 */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          5. Settlement and Tracking the txHash
        </h2>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`async function settlePayment(
  paymentPayload: object,
  paymentRequirements: object
) {
  const response = await fetch('https://p402.io/api/v1/facilitator/settle', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${process.env.P402_API_KEY}\`,
    },
    body: JSON.stringify({ paymentPayload, paymentRequirements }),
  })

  const data = await response.json()

  // data.success — boolean
  // data.transaction — on-chain tx hash on Base
  // data.network — "eip155:8453"
  // data.payer — the from address
  console.log(\`Settled: \${data.transaction}\`)
  console.log(\`View on BaseScan: https://basescan.org/tx/\${data.transaction}\`)

  return data
}`}</code></pre>

        {/* Section 6 */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          6. Receipt Scheme — Reuse a Prior Payment
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          The <code>receipt</code> scheme lets a client prove they already paid for a resource and
          reuse that proof for repeat access within the validity window. The server checks the
          receipt against its settlement records before serving the response.
        </p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`// After a successful settle, store the receipt
const settlement = await settlePayment(paymentPayload, paymentRequirements)
const receiptId = settlement.transaction // tx hash is the receipt

// On subsequent requests to the same resource within the validity window,
// pass the receipt instead of a new signed authorization:
const receiptPayload = {
  x402Version: 2,
  scheme: 'receipt',
  network: 'eip155:8453',
  payload: {
    receiptId,                                    // The tx hash from settlement
    resource: 'https://your-api.com/report/generate',
  },
}

// Submit to verify as before — returns valid: true if receipt is still good
const { valid } = await verifyPayment(receiptPayload, paymentRequirements)`}</code></pre>

        {/* Section 7 */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          7. Minimal Metered API with x402
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Here is a minimal Express.js route that requires x402 payment before returning data.
          A client that does not include a payment gets a 402 with instructions; a client that
          includes a valid signed authorization gets the data.
        </p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`import express from 'express'

const app = express()
app.use(express.json())

const PRICE_USDC = 0.05                                       // $0.05 per call
const RESOURCE_URL = 'https://your-api.com/report/generate'
const P402_TREASURY = '0xFa772434DCe6ED78831EbC9eeAcbDF42E2A031a6'
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

const paymentRequirements = {
  scheme: 'exact',
  network: 'eip155:8453',
  maxAmountRequired: String(Math.round(PRICE_USDC * 1_000_000)),
  resource: RESOURCE_URL,
  description: 'Research report generation — $0.05 per call',
  payTo: P402_TREASURY,
  asset: USDC_ADDRESS,
}

app.post('/report/generate', async (req, res) => {
  const paymentPayload = req.headers['x-payment-payload']
    ? JSON.parse(req.headers['x-payment-payload'] as string)
    : null

  // No payment — return 402 with payment requirements
  if (!paymentPayload) {
    return res.status(402).json({
      error: 'Payment Required',
      paymentRequirements,
    })
  }

  // Verify with P402
  const verifyResp = await fetch('https://p402.io/api/v1/facilitator/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${process.env.P402_API_KEY}\`,
    },
    body: JSON.stringify({ paymentPayload, paymentRequirements }),
  })

  const { valid, error } = await verifyResp.json()

  if (!valid) {
    return res.status(402).json({ error: 'Invalid payment', detail: error })
  }

  // Settle before serving (idempotent — duplicate nonce will return error)
  await fetch('https://p402.io/api/v1/facilitator/settle', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${process.env.P402_API_KEY}\`,
    },
    body: JSON.stringify({ paymentPayload, paymentRequirements }),
  })

  // Return the paid resource
  res.json({ report: 'Your generated report content goes here...' })
})

app.listen(3000, () => console.log('Metered API running on :3000'))`}</code></pre>

        {/* Section 8 */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          8. Testing Without Real USDC — Base Sepolia
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Base Sepolia is the testnet where you can get free test USDC. P402 verifies signatures on
          Sepolia as well when the network field is set to <code>eip155:84532</code>.
        </p>
        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Get testnet ETH from the Base Sepolia faucet at <code>faucet.base.org</code></span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Get test USDC from Circle's testnet faucet at <code>faucet.circle.com</code></span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Change the domain <code>chainId</code> to <code>84532</code> and update <code>verifyingContract</code> to the Sepolia USDC address</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Set <code>network: 'eip155:84532'</code> in both <code>paymentPayload</code> and <code>paymentRequirements</code></span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Use a Base Sepolia RPC endpoint: <code>https://sepolia.base.org</code></span></li>
        </ul>
        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          Testnet transactions are real on-chain but have no monetary value. Settle freely during
          development. When you are ready for production, switch <code>chainId</code> back to
          <code> 8453</code> and fund a real wallet.
        </div>
      </>
    ),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Building a Paid Agent
  // ─────────────────────────────────────────────────────────────────────────
  'building-a-paid-agent': {
    title: 'Building a Paid Agent',
    category: 'Technical Guides',
    categorySlug: 'technical',
    updatedAt: 'April 2025',
    body: (
      <>
        <p className="text-sm text-neutral-700 leading-relaxed">
          This tutorial walks you through building a "Research Agent" — an AI agent that accepts
          natural-language research queries, calls LLMs through P402 for cost-optimized routing, and
          charges callers $0.05 per report via x402 micropayments. When complete, you will have a
          fully autonomous paid agent deployable to any Node.js host.
        </p>

        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          <strong>What we are building:</strong> A Node.js/TypeScript HTTP service with three
          capabilities: (1) A2A JSON-RPC endpoint for agent-to-agent communication, (2) x402
          payment enforcement before task execution, and (3) LLM routing through P402 in cost mode.
          At the end, you register it on the P402 Bazaar for discoverability.
        </div>

        {/* Part 1 */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Part 1 — LLM Calls via P402
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          The agent uses P402 in <code>cost</code> mode with a pre-funded session so spend is
          bounded per research job. Each report call creates its own session capped at $0.04
          (leaving a $0.01 margin from the $0.05 charged to callers).
        </p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`// src/llm.ts
import OpenAI from 'openai'

const P402_API_KEY = process.env.P402_API_KEY!

// Create a session-scoped client for each report job
export async function createResearchSession(): Promise<{
  client: OpenAI
  sessionToken: string
}> {
  const resp = await fetch('https://p402.io/api/v2/sessions', {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${P402_API_KEY}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      budget_usd: 0.04,          // $0.04 max per report (our cost ceiling)
      expires_in_seconds: 300,   // 5-minute TTL per research job
      routing_mode: 'cost',
    }),
  })

  const { session_token } = await resp.json()

  // Session token used as API key for this job's LLM calls
  const client = new OpenAI({
    apiKey: session_token,
    baseURL: 'https://p402.io/api/v2',
    defaultHeaders: { 'X-P402-Mode': 'cost' },
  })

  return { client, sessionToken: session_token }
}

export async function generateReport(
  client: OpenAI,
  query: string
): Promise<string> {
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are a concise research assistant. Produce a structured report ' +
          'with: Summary, Key Findings (3-5 bullets), and Sources (list any ' +
          'well-known references relevant to the query).',
      },
      { role: 'user', content: query },
    ],
    max_tokens: 800,
  })

  return response.choices[0]?.message.content ?? 'No report generated.'
}`}</code></pre>

        {/* Part 2 */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Part 2 — A2A JSON-RPC Endpoint
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          The A2A protocol uses JSON-RPC 2.0 over HTTP POST. Implement the
          <code> tasks/send</code> method which receives a research query, executes it, and
          returns the result as an artifact.
        </p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`// src/a2a.ts
import { createResearchSession, generateReport } from './llm'
import { verifyX402Payment, settleX402Payment } from './payments'

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params: Record<string, unknown>
}

interface A2AMessage {
  parts: Array<{ type: 'text'; text: string }>
}

export async function handleA2ARequest(body: JsonRpcRequest) {
  const { id, method, params } = body

  if (method !== 'tasks/send') {
    return {
      jsonrpc: '2.0' as const,
      id,
      error: { code: -32601, message: 'Method not found' },
    }
  }

  const message = params.message as A2AMessage
  const query = message?.parts?.[0]?.text ?? ''

  if (!query) {
    return {
      jsonrpc: '2.0' as const,
      id,
      error: { code: -32602, message: 'Invalid params: message.parts[0].text required' },
    }
  }

  // Verify payment before executing (see Part 3 for payment gate)
  const paymentPayload = params.paymentPayload as object | undefined
  if (paymentPayload) {
    const valid = await verifyX402Payment(paymentPayload)
    if (!valid) {
      return {
        jsonrpc: '2.0' as const,
        id,
        error: { code: -32000, message: 'Payment verification failed' },
      }
    }
    await settleX402Payment(paymentPayload)
  }

  // Execute the research task
  const { client } = await createResearchSession()
  const report = await generateReport(client, query)

  const taskId = crypto.randomUUID()

  return {
    jsonrpc: '2.0' as const,
    id,
    result: {
      id: taskId,
      status: {
        state: 'completed',
        timestamp: new Date().toISOString(),
      },
      artifacts: [
        {
          parts: [{ type: 'text', text: report }],
          metadata: { query, generatedAt: new Date().toISOString() },
        },
      ],
    },
  }
}`}</code></pre>

        {/* Part 3 */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Part 3 — x402 Payment Gate
        </h2>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`// src/payments.ts
const P402_API_KEY = process.env.P402_API_KEY!
const AGENT_TREASURY = process.env.AGENT_TREASURY_ADDRESS!  // Your wallet address
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
const PRICE_ATOMIC = '50000'  // $0.05 in USDC atomic units (6 decimals)
const RESOURCE_URL = process.env.AGENT_URL + '/a2a'

export const PAYMENT_REQUIREMENTS = {
  scheme: 'exact' as const,
  network: 'eip155:8453' as const,
  maxAmountRequired: PRICE_ATOMIC,
  resource: RESOURCE_URL,
  description: 'Research Agent — $0.05 per report',
  payTo: AGENT_TREASURY,
  asset: USDC_ADDRESS,
}

export async function verifyX402Payment(paymentPayload: object): Promise<boolean> {
  const resp = await fetch('https://p402.io/api/v1/facilitator/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${P402_API_KEY}\`,
    },
    body: JSON.stringify({
      paymentPayload,
      paymentRequirements: PAYMENT_REQUIREMENTS,
    }),
  })
  const { valid } = await resp.json()
  return valid === true
}

export async function settleX402Payment(paymentPayload: object): Promise<void> {
  await fetch('https://p402.io/api/v1/facilitator/settle', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${P402_API_KEY}\`,
    },
    body: JSON.stringify({
      paymentPayload,
      paymentRequirements: PAYMENT_REQUIREMENTS,
    }),
  })
}`}</code></pre>

        {/* Part 4 */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Part 4 — Full Payment Flow
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Here is the complete HTTP server wiring together the AgentCard, payment gate, and A2A
          endpoint. A caller follows this sequence:
        </p>
        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Fetch <code>/.well-known/agent.json</code> to discover capabilities and payment requirements</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Sign an EIP-3009 USDC authorization for $0.05 to the agent treasury</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>POST to <code>/a2a</code> with the task and <code>paymentPayload</code> in the JSON-RPC params</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Agent verifies and settles the payment, then executes the LLM task</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Returns completed task with artifact</span></li>
        </ul>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`// src/server.ts
import express from 'express'
import { handleA2ARequest } from './a2a'
import { PAYMENT_REQUIREMENTS } from './payments'

const app = express()
app.use(express.json())

const AGENT_URL = process.env.AGENT_URL ?? 'http://localhost:4000'

// AgentCard — required by the A2A spec
app.get('/.well-known/agent.json', (_req, res) => {
  res.json({
    protocolVersion: '1.0',
    name: 'P402 Research Agent',
    description: 'Generates structured research reports on any topic. $0.05 per report.',
    url: AGENT_URL,
    capabilities: { streaming: false },
    skills: [
      {
        id: 'research-report',
        name: 'Research Report',
        description: 'Produce a structured research report with summary, key findings, and sources.',
        tags: ['research', 'analysis', 'summarization'],
      },
    ],
    extensions: [
      {
        uri: 'tag:x402.org,2025:x402-payment',
        required: true,
        params: { paymentRequirements: PAYMENT_REQUIREMENTS },
      },
    ],
    endpoints: {
      a2a: { jsonrpc: \`\${AGENT_URL}/a2a\` },
    },
  })
})

// A2A JSON-RPC endpoint
app.post('/a2a', async (req, res) => {
  try {
    const result = await handleA2ARequest(req.body)
    res.json(result)
  } catch (err) {
    res.json({
      jsonrpc: '2.0',
      id: req.body?.id ?? null,
      error: { code: -32603, message: 'Internal error' },
    })
  }
})

app.listen(4000, () => {
  console.log(\`Research Agent running at \${AGENT_URL}\`)
  console.log(\`AgentCard: \${AGENT_URL}/.well-known/agent.json\`)
})`}</code></pre>

        {/* Part 5 */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Part 5 — List on the P402 Bazaar
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          The Bazaar is P402's agent marketplace. Other agents and developers discover your agent
          here. Listing is done via API:
        </p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`curl -X POST https://p402.io/api/a2a/bazaar \\
  -H "Authorization: Bearer $P402_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agentUrl": "https://your-agent-host.com",
    "agentCardUrl": "https://your-agent-host.com/.well-known/agent.json",
    "category": "research",
    "tags": ["research", "analysis", "summarization"]
  }'`}</code></pre>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Once listed, your agent appears at <code>https://p402.io/dashboard/bazaar</code> and
          is discoverable by other agents via the A2A agents endpoint. P402 periodically health-checks
          your AgentCard URL and removes stale listings automatically.
        </p>

        {/* Pricing */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Pricing Your Agent
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          A simple formula for per-call pricing:
        </p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`Price per call = (avg LLM cost per call via P402) + desired margin

Example for Research Agent:
  avg gpt-4o-mini cost per 800-token report ≈ $0.01–$0.02
  P402 cost mode typically cuts 10-30% vs direct OpenAI
  Target margin: $0.03

  Price = $0.02 (LLM) + $0.03 (margin) = $0.05 per report ✓

Check your actual per-call costs using the analytics endpoint:
GET /api/v2/analytics/spend?period=7d`}</code></pre>
        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          Start with a session budget equal to your LLM cost ceiling (not the price you charge).
          The difference between the x402 payment collected and the session spend is your profit
          per call.
        </div>
      </>
    ),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 4. MCP Integration Guide
  // ─────────────────────────────────────────────────────────────────────────
  'mcp-integration-guide': {
    title: 'MCP Integration Guide',
    category: 'Technical Guides',
    categorySlug: 'technical',
    updatedAt: 'April 2025',
    body: (
      <>
        <p className="text-sm text-neutral-700 leading-relaxed">
          The Model Context Protocol (MCP) is an open standard that lets AI assistants like Claude
          call external tools and data sources during a conversation. When you connect P402 as an
          MCP server, Claude Desktop gains the ability to route AI requests, check spend balances,
          and list models — all from within a chat window. This makes MCP integrations one of the
          highest-leverage content angles for partners: Claude Desktop has millions of users, and
          "install this config, get P402 inside Claude" is a genuinely useful 5-minute tutorial.
        </p>

        {/* Section 1 */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          1. Why MCP Matters for P402 Distribution
        </h2>
        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>Claude Desktop users can ask Claude to "route this prompt through the cheapest model" and P402 executes it — no code required from the end user</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>MCP lowers the adoption barrier to a single JSON config edit — no SDK install, no new accounts required beyond the P402 API key</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>Partners can create tutorials showing Claude autonomously optimizing its own LLM routing — a compelling, shareable demo</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>MCP integrations compound: once installed, every conversation the user has with Claude can benefit from P402 routing</span>
          </li>
        </ul>

        {/* Section 2 */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          2. Installing the P402 MCP Server
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          The P402 MCP server is distributed as an npm package. You can run it without installing it
          via <code>npx</code>, or install it globally:
        </p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`# Run without installing (recommended for quick setup)
npx @p402/mcp-server

# Or install globally
npm install -g @p402/mcp-server
p402-mcp`}</code></pre>
        <p className="text-sm text-neutral-700 leading-relaxed">
          The server communicates over <strong>stdio</strong> (the standard MCP transport for local
          tools) or HTTP SSE (for remote deployments). Claude Desktop uses stdio by default.
        </p>

        {/* Section 3 */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          3. Configuring Claude Desktop
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Claude Desktop reads MCP server configuration from a JSON file. Edit the file at:
        </p>
        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>macOS:</strong> <code>~/Library/Application Support/Claude/claude_desktop_config.json</code></span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>Windows:</strong> <code>%APPDATA%\Claude\claude_desktop_config.json</code></span></li>
        </ul>
        <p className="text-sm text-neutral-700 leading-relaxed mt-3">Add the P402 server to your config:</p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`{
  "mcpServers": {
    "p402": {
      "command": "npx",
      "args": ["@p402/mcp-server"],
      "env": {
        "P402_API_KEY": "p402_live_your_key_here"
      }
    }
  }
}`}</code></pre>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Restart Claude Desktop after saving. You will see a hammer icon in the chat input bar
          indicating MCP tools are available.
        </p>
        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          Never paste your API key directly into the config file that is committed to a git repo.
          The <code>env</code> block in <code>claude_desktop_config.json</code> is read at process
          startup and is not transmitted to Anthropic — it stays local.
        </div>

        {/* Section 4 */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          4. Available MCP Tools
        </h2>
        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">route_request</h3>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Routes a chat completion through P402's intelligent routing layer.
        </p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`// Input
{
  "prompt": "Explain the CAP theorem",
  "model": "gpt-4o-mini",        // optional — P402 selects if omitted
  "mode": "cost",                 // cost | quality | speed | balanced
  "max_tokens": 500               // optional
}

// Output
{
  "content": "The CAP theorem states...",
  "model_used": "gpt-4o-mini",
  "provider": "openrouter",
  "cost_usd": 0.000084,
  "latency_ms": 812,
  "cache": "miss"
}`}</code></pre>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">get_session_balance</h3>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Returns the remaining balance and spend for a session or the main account.
        </p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`// Input
{
  "session_token": "ses_..."    // omit to get account-level spend
}

// Output
{
  "budget_usd": 5.0,
  "spent_usd": 1.24,
  "remaining_usd": 3.76,
  "expires_at": "2025-04-18T10:00:00Z"
}`}</code></pre>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">list_models</h3>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Returns all models available through P402, optionally filtered by provider.
        </p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`// Input
{
  "provider": "anthropic"   // optional filter
}

// Output
{
  "models": [
    { "id": "claude-3-5-sonnet-20241022", "provider": "anthropic", "context_length": 200000 },
    { "id": "claude-3-haiku-20240307",    "provider": "anthropic", "context_length": 200000 }
  ]
}`}</code></pre>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">get_spend_analytics</h3>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Returns spend breakdown and cache savings for a time period.
        </p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`// Input
{
  "period": "7d"    // 1d | 7d | 30d
}

// Output
{
  "total_usd": 4.21,
  "total_requests": 1840,
  "cache_hit_rate": 0.28,
  "savings_from_cache_usd": 1.17,
  "top_models": ["gpt-4o-mini", "claude-3-haiku-20240307"]
}`}</code></pre>

        {/* Section 5 */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          5. Example MCP Conversation
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Once configured, a Claude Desktop conversation looks like this:
        </p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`User:  Use P402 to route a prompt through the cheapest model.
       Ask it: "What is a Merkle tree?"

Claude: I'll use the P402 route_request tool with cost mode.

        [Calling route_request]
        {
          "prompt": "What is a Merkle tree?",
          "mode": "cost"
        }

        [Result]
        A Merkle tree is a data structure where every leaf node contains a
        hash of a data block, and every non-leaf node contains a hash of its
        child nodes...

        This was routed to gpt-4o-mini via OpenRouter at a cost of $0.000061.
        The cache was a miss — next time the same question comes in it will be
        free.

User:  What did that cost me over the last 7 days?

Claude: [Calling get_spend_analytics]
        { "period": "7d" }

        [Result]
        Over the last 7 days you have spent $1.24 across 412 requests.
        Your semantic cache hit rate is 31%, which saved you $0.38.`}</code></pre>

        {/* Section 6 */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          6. Building a Custom MCP Client
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          For partners building custom MCP integrations (e.g., connecting Cursor, a VS Code
          extension, or another MCP host to P402), use the MCP TypeScript SDK directly:
        </p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4"><code>{`import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { spawn } from 'child_process'

async function createP402McpClient() {
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['@p402/mcp-server'],
    env: {
      ...process.env,
      P402_API_KEY: process.env.P402_API_KEY!,
    },
  })

  const client = new Client(
    { name: 'my-mcp-host', version: '1.0.0' },
    { capabilities: {} }
  )

  await client.connect(transport)

  // List available tools
  const { tools } = await client.listTools()
  console.log('P402 MCP tools:', tools.map(t => t.name))

  // Call route_request
  const result = await client.callTool({
    name: 'route_request',
    arguments: {
      prompt: 'Summarize the SOLID principles in 100 words.',
      mode: 'cost',
    },
  })

  console.log(result.content)

  await client.close()
}

createP402McpClient().catch(console.error)`}</code></pre>

        {/* Section 7 */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          7. Content Angles for Partners
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Five tutorial angles that tend to perform well for MCP-specific content:
        </p>
        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>
              <strong>"I gave Claude a $5 AI budget and it managed itself."</strong> Install the
              MCP server, create a session, and let Claude use <code>get_session_balance</code>
              to decide when to use quality vs cost mode based on remaining budget.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>
              <strong>"How I cut my Claude API bill by 30% with one config file."</strong> Show
              the claude_desktop_config.json change, then the analytics showing cache savings over
              a week.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>
              <strong>"Claude Desktop now automatically picks the cheapest AI model."</strong>
              Walk through the MCP tool flow — Claude deciding to use <code>route_request</code>
              in cost mode for a simple task and quality mode for a complex one.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>
              <strong>"Building a company AI budget tracker in Claude Desktop."</strong> Use
              <code> get_spend_analytics</code> to build a weekly spend summary tool — show the
              full MCP client code and the Claude conversation output side by side.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>
              <strong>"MCP + x402: an AI agent that pays for its own API calls."</strong> The
              most advanced angle — show a custom MCP client that signs EIP-3009 payments
              automatically when <code>route_request</code> returns a 402 from a paid endpoint.
            </span>
          </li>
        </ul>

        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          <strong>Affiliate tip:</strong> The config file tutorial (angle 2) has the highest
          completion rate — it is under 5 minutes and produces a visible, measurable result
          (the analytics graph). Lead with that in any YouTube or written format, then link to
          the more advanced tutorials.
        </div>
      </>
    ),
  },
}
