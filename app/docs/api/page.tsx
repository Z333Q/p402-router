'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";
import { Badge, CodeBlock, TabGroup } from '../../dashboard/_components/ui';

// =============================================================================
// TYPES & DATA
// =============================================================================

interface Param {
    name: string;
    type: string;
    required: boolean;
    desc: string;
}

interface Endpoint {
    id: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path: string;
    title: string;
    description: string;
    params?: Param[];
    examples: {
        curl: string;
        javascript: string;
        python: string;
        response: any;
    };
}

const ENDPOINTS: Endpoint[] = [
    {
        id: 'settle-eip3009',
        method: 'POST',
        path: '/api/v1/facilitator/settle',
        title: 'Execute Settlement (EIP-3009)',
        description: 'Execute a gasless settlement on Base Mainnet by submitting a signed EIP-3009 authorization. P402 acts as the facilitator, paying the gas fees to settle the transaction on-chain.',
        params: [
            { name: 'tenantId', type: 'string', required: true, desc: 'The ID of the tenant receiving the funds.' },
            { name: 'decisionId', type: 'string', required: true, desc: 'Trace ID for the decision/mandate being settled.' },
            { name: 'asset', type: 'string', required: false, desc: 'The asset symbol (default: "USDC").' },
            { name: 'authorization', type: 'object', required: true, desc: 'The signed EIP-3009 authorization object containing { from, to, value, validAfter, validBefore, nonce, v, r, s }.' }
        ],
        examples: {
            curl: `curl https://p402.io/api/v1/facilitator/settle \\
  -H "Content-Type: application/json" \\
  -d '{
    "tenantId": "...",
    "decisionId": "trace_123",
    "asset": "USDC",
    "authorization": {
        "from": "0xUserAddress...",
        "to": "0xTreasuryAddress...",
        "value": "1000000",
        "validAfter": 0,
        "validBefore": 1735689600,
        "nonce": "0x...",
        "v": 27,
        "r": "0x...",
        "s": "0x..."
    }
  }'`,
            javascript: `// Using Viem or Ethers to sign first...
const response = await fetch('https://p402.io/api/v1/facilitator/settle', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tenantId: '...',
    decisionId: 'trace_123',
    asset: 'USDC',
    authorization: signedAuthObject // EIP-3009 compatible
  })
});`,
            python: `# Prepare signed data off-chain using web3.py
import requests
res = requests.post(
    "https://p402.io/api/v1/facilitator/settle",
    json={
        "tenantId": "...",
        "decisionId": "trace_123",
        "asset": "USDC",
        "authorization": { ... }
    }
)`,
            response: {
                settled: true,
                facilitatorId: "chain_base",
                receipt: {
                    txHash: "0x88df01e...",
                    verifiedAmount: "1.0",
                    asset: "USDC",
                    timestamp: "2026-01-21T12:00:00Z"
                }
            }
        }
    },
    {
        id: 'verify-settlement',
        method: 'POST',
        path: '/api/v1/facilitator/verify',
        title: 'Verify Settlement',
        description: 'Verify an existing on-chain transaction was successful and matches the expected amount and recipient. Useful for client-initiated (non-gasless) settlements.',
        params: [
            { name: 'txHash', type: 'string', required: true, desc: 'The transaction hash to verify.' },
            { name: 'amount', type: 'string', required: true, desc: 'Expected amount (decimal string).' },
            { name: 'recipient', type: 'string', required: true, desc: 'Expected recipient address (tenant treasury).' },
            { name: 'network', type: 'string', required: false, desc: 'Chain ID (default: eip155:8453).' }
        ],
        examples: {
            curl: `curl https://p402.io/api/v1/facilitator/verify \\
  -H "Content-Type: application/json" \\
  -d '{
    "txHash": "0x...",
    "amount": "1.0",
    "recipient": "0xTreasury..."
  }'`,
            javascript: `const res = await fetch('https://p402.io/api/v1/facilitator/verify', {
  method: 'POST',
  body: JSON.stringify({ txHash: '0x...', amount: '1.0', recipient: '0x...' })
});`,
            python: `requests.post("https://p402.io/api/v1/facilitator/verify", json={...})`,
            response: {
                success: true,
                transaction: "0x...",
                network: "eip155:8453",
                settlement_id: "set_..."
            }
        }
    },
    {
        id: 'chat-completions',
        method: 'POST',
        path: '/api/v2/chat/completions',
        title: 'Chat Completions',
        description: 'OpenAI-compatible endpoint for generating AI responses with P402 orchestration. Supports multi-provider routing, semantic caching, and real-time cost tracking.',
        params: [
            { name: 'model', type: 'string', required: false, desc: 'The model to use. If omitted, P402 will select the optimal model based on your routing mode.' },
            { name: 'messages', type: 'array', required: true, desc: 'A list of messages comprising the conversation so far.' },
            { name: 'p402.mode', type: 'string', required: false, desc: 'Routing mode: "cost", "quality", "speed", or "balanced" (default).' },
            { name: 'p402.cache', type: 'boolean', required: false, desc: 'Enable semantic caching to eliminate redundant API calls.' }
        ],
        examples: {
            curl: `curl https://p402.io/api/v2/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $P402_API_KEY" \\
  -d '{
    "messages": [{"role": "user", "content": "Explain P402."}],
    "p402": { "mode": "cost", "cache": true }
  }'`,
            javascript: `const response = await fetch('https://p402.io/api/v2/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + process.env.P402_API_KEY
  },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Explain P402.' }],
    p402: { mode: 'cost', cache: true }
  })
});`,
            python: `import requests

res = requests.post(
    "https://p402.io/api/v2/chat/completions",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={
        "messages": [{"role": "user", "content": "Explain P402."}],
        "p402": {"mode": "cost", "cache": True}
    }
)`,
            response: {
                id: "chatcmpl-123",
                choices: [{ message: { content: "P402 is an AI orchestration layer..." } }],
                p402_metadata: {
                    provider: "anthropic",
                    cost_usd: 0.00045,
                    cached: false,
                    latency_ms: 840
                }
            }
        }
    },
    {
        id: 'list-models',
        method: 'GET',
        path: '/api/v2/models',
        title: 'List Models',
        description: 'Dynamically retrieve all 300+ models accessible via the OpenRouter Meta-Provider, including real-time pricing, context windows, and model capabilities.',
        examples: {
            curl: `curl https://p402.io/api/v2/models`,
            javascript: `const res = await fetch('https://p402.io/api/v2/models');`,
            python: `res = requests.get("https://p402.io/api/v2/models")`,
            response: {
                object: "list",
                total: 339,
                data: [
                    {
                        id: "openai/gpt-4o",
                        name: "GPT-4o",
                        context_window: 128000,
                        pricing: { prompt: "0.000005", completion: "0.000015" }
                    }
                ]
            }
        }
    },
    {
        id: 'get-recommendations',
        method: 'GET',
        path: '/api/v2/analytics/recommendations',
        title: 'Cost Recommendations',
        description: 'Get AI-powered cost optimization suggestions based on your historical usage patterns.',
        examples: {
            curl: `curl https://p402.io/api/v2/analytics/recommendations`,
            javascript: `const res = await fetch('https://p402.io/api/v2/analytics/recommendations');`,
            python: `res = requests.get("https://p402.io/api/v2/analytics/recommendations")`,
            response: {
                recommendations: [
                    { type: "model_switch", title: "Switch to Haiku", saved_monthly: 245.00 }
                ]
            }
        }
    },
    {
        id: 'x402-payment-submitted',
        method: 'POST',
        path: '/api/a2a',
        title: 'Submit x402 Payment',
        description: 'Submit cryptographic proof of payment (EIP-3009 signature or transaction hash) for an A2A task. Mandatory step in the A2A x402 Extension 3-message flow.',
        params: [
            { name: 'payment_id', type: 'string', required: true, desc: 'The unique payment identifier provided in the payment-required message.' },
            { name: 'scheme', type: 'string', required: true, desc: 'The payment scheme used: "exact", "onchain", or "receipt".' },
            { name: 'signature', type: 'string', required: false, desc: 'The EIP-3009 permit signature (required for "exact" scheme).' },
            { name: 'tx_hash', type: 'string', required: false, desc: 'The blockchain transaction hash (required for "onchain" scheme).' }
        ],
        examples: {
            curl: `curl https://p402.io/api/a2a \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "method": "x402/payment-submitted",
    "params": {
      "payment_id": "pay_123",
      "scheme": "exact",
      "signature": "0x..."
    },
    "id": 1
  }'`,
            javascript: `const res = await fetch('https://p402.io/api/a2a', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'x402/payment-submitted',
    params: { payment_id: 'pay_123', scheme: 'exact', signature: '0x...' },
    id: 1
  })
});`,
            python: `res = requests.post(
    "https://p402.io/api/a2a",
    json={
        "jsonrpc": "2.0",
        "method": "x402/payment-submitted",
        "params": {"payment_id": "pay_123", "scheme": "exact", "signature": "0x..."},
        "id": 1
    }
)`,
            response: {
                jsonrpc: "2.0",
                result: {
                    payment_id: "pay_123",
                    status: "completed",
                    receipt: { receipt_id: "rec_456", signature: "0x..." }
                },
                id: 1
            }
        }
    },
    {
        id: 'plan-v1',
        method: 'POST',
        path: '/api/v1/router/plan',
        title: 'Plan Route (Legacy)',
        description: 'V1 Endpoint. Calculates the optimal routing path for a resource request without executing it. Returns payment requirements and facilitator selection.',
        params: [
            { name: 'routeId', type: 'string', required: true, desc: 'The target resource identifier.' },
            { name: 'payment', type: 'object', required: true, desc: 'Payment preferences { network, scheme, amount, asset }.' },
            { name: 'policyId', type: 'string', required: false, desc: 'Optional policy ID to enforce during planning.' }
        ],
        examples: {
            curl: `curl https://p402.io/api/v1/router/plan \\
  -H "Content-Type: application/json" \\
  -d '{
    "routeId": "MODEL_GPT4",
    "payment": {
        "network": "eip155:8453",
        "scheme": "eip3009",
        "amount": "0.50",
        "asset": "USDC"
    }
  }'`,
            javascript: `const res = await fetch('https://p402.io/api/v1/router/plan', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    routeId: 'MODEL_GPT4',
    payment: { network: 'eip155:8453', scheme: 'eip3009', amount: '0.50', asset: 'USDC' }
  })
});`,
            python: `requests.post("https://p402.io/api/v1/router/plan", json={...})`,
            response: {
                decision_id: "trace_abc123",
                route: {
                    id: "route_xyz",
                    facilitator_url: "https://...",
                    cost: 0.50
                },
                payment_headers: {
                    "X-Payment-Required": "true"
                }
            }
        }
    },
    {
        id: 'settle-v1',
        method: 'POST',
        path: '/api/v1/router/settle',
        title: 'Settle Payment (Legacy)',
        description: 'V1 Endpoint. Records an on-chain settlement for a planned route. Use this to finalize a transaction after the user has paid.',
        params: [
            { name: 'txHash', type: 'string', required: true, desc: 'The verified transaction hash.' },
            { name: 'amount', type: 'string', required: true, desc: 'Amount settled.' },
            { name: 'asset', type: 'string', required: true, desc: 'Asset symbol (e.g. USDC).' },
            { name: 'decisionId', type: 'string', required: false, desc: 'The decision ID from the /plan response.' }
        ],
        examples: {
            curl: `curl https://p402.io/api/v1/router/settle \\
  -H "Content-Type: application/json" \\
  -d '{
    "txHash": "0x...",
    "amount": "0.50",
    "asset": "USDC",
    "decisionId": "trace_abc123"
  }'`,
            javascript: `const res = await fetch('https://p402.io/api/v1/router/settle', {
  method: 'POST',
  body: JSON.stringify({
    txHash: '0x...',
    amount: '0.50',
    asset: 'USDC',
    decisionId: 'trace_abc123'
  })
});`,
            python: `requests.post("https://p402.io/api/v1/router/settle", json={...})`,
            response: {
                success: true,
                settlement_id: "set_789",
                status: "confirmed"
            }
        }
    },
    {
        id: 'intelligence-audit',
        method: 'POST',
        path: '/api/v1/intelligence/audit',
        title: 'Autonomous Policy Audit',
        description: 'Audits A2A traffic flows to identify cost optimizations and budget compliance. Powered by Gemini 3 Pro.',
        params: [
            { name: 'days', type: 'number', required: false, desc: 'History window to analyze (default: 7).' },
            { name: 'execute', type: 'boolean', required: false, desc: 'Actually execute the recommended optimizations (Autonomous mode).' }
        ],
        examples: {
            curl: `curl -X POST https://p402.io/api/v1/intelligence/audit \\
  -H "Content-Type: application/json" \\
  -d '{"days": 7, "execute": true}'`,
            javascript: `const res = await fetch('https://p402.io/api/v1/intelligence/audit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ days: 30, execute: true })
});`,
            python: `requests.post("https://p402.io/api/v1/intelligence/audit", json={"days": 7, "execute": True})`,
            response: {
                audit_id: "audit_123",
                thinking_trace: ["Analyzing 5,432 decisions...", "Detected GPT-4 overkill on simple tasks.", "Executing model_substitution..."],
                total_savings: 42.50
            }
        }
    },
    {
        id: 'code-audit',
        method: 'POST',
        path: '/api/v1/intelligence/code-audit',
        title: 'Security & Privacy Audit',
        description: 'Performs a deep audit of agent infrastructure for security vulnerabilities and privacy leaks.',
        params: [
            { name: 'code', type: 'string', required: true, desc: 'The agent/application code to audit.' }
        ],
        examples: {
            curl: `curl -X POST https://p402.io/api/v1/intelligence/code-audit \\
  -H "Content-Type: application/json" \\
  -d '{"code": "import openai\\nclient = openai.OpenAI(...)"}'`,
            javascript: `const res = await fetch('https://p402.io/api/v1/intelligence/code-audit', {
  method: 'POST',
  body: JSON.stringify({ code: myCodeString })
});`,
            python: `requests.post("https://p402.io/api/v1/intelligence/code-audit", json={"code": code})`,
            response: {
                report: "# Audit Report\n\nRISK SCORE: 8/10\n- Dangerous loop detected...",
                metrics: { riskScore: 8, costPerHour: 15.00 }
            }
        }
    },
    {
        id: 'intelligence-status',
        method: 'GET',
        path: '/api/v1/intelligence/status',
        title: 'Governance Status',
        description: 'Retrieves the current status of the protocol governance layer and active policy enforcement.',
        examples: {
            curl: `curl https://p402.io/api/v1/intelligence/status`,
            javascript: `const res = await fetch('https://p402.io/api/v1/intelligence/status');`,
            python: `res = requests.get("https://p402.io/api/v1/intelligence/status")`,
            response: {
                agents: {
                    economist: "online",
                    sentinel: "active",
                    memory: "92% hit rate"
                },
                total_savings: 12450.80
            }
        }
    }
];

// =============================================================================
// COMPONENTS
// =============================================================================

export default function ApiDocsPage() {
    const [activeSection, setActiveSection] = useState('chat-completions');

    return (
        <div className="min-h-screen bg-white">
            <TopNav />

            <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', height: 'calc(100vh - 64px)' }}>
                {/* 1. Sidebar Navigation */}
                <aside className="border-r-2 border-black overflow-y-auto p-6 bg-neutral-50">
                    <div className="mb-8">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4">Introduction</h3>
                        <a
                            href="#welcome"
                            onClick={(e) => {
                                e.preventDefault();
                                document.getElementById('welcome')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="block text-sm font-bold mb-2 hover:text-[#22D3EE] transition-colors"
                        >
                            Overview
                        </a>
                        <a
                            href="#auth"
                            onClick={(e) => {
                                e.preventDefault();
                                document.getElementById('auth')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="block text-sm font-bold mb-2 hover:text-[#22D3EE] transition-colors"
                        >
                            Authentication
                        </a>
                    </div>

                    <div className="mb-8">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4">Facilitator (x402)</h3>
                        <a
                            href="#settle-eip3009"
                            onClick={(e) => {
                                e.preventDefault();
                                setActiveSection('settle-eip3009');
                                document.getElementById('settle-eip3009')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className={`block text-xs font-bold mb-3 uppercase tracking-tight transition-colors ${activeSection === 'settle-eip3009' ? 'text-[#22D3EE]' : 'text-black hover:text-[#22D3EE]'}`}
                        >
                            Execute Settlement
                        </a>
                        <a
                            href="#verify-settlement"
                            onClick={(e) => {
                                e.preventDefault();
                                setActiveSection('verify-settlement');
                                document.getElementById('verify-settlement')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className={`block text-xs font-bold mb-3 uppercase tracking-tight transition-colors ${activeSection === 'verify-settlement' ? 'text-[#22D3EE]' : 'text-black hover:text-[#22D3EE]'}`}
                        >
                            Verify Settlement
                        </a>
                    </div>

                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4">Protocol Governance</h3>
                        {ENDPOINTS.filter(ep => ep.path.includes('/intelligence/')).map(ep => (
                            <a
                                key={ep.id}
                                href={`#${ep.id}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    setActiveSection(ep.id);
                                    document.getElementById(ep.id)?.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className={`block text-xs font-bold mb-3 uppercase tracking-tight transition-colors ${activeSection === ep.id ? 'text-[#22D3EE]' : 'text-black hover:text-[#22D3EE]'}`}
                            >
                                {ep.title}
                            </a>
                        ))}
                    </div>

                    <div className="mt-8">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4">Orchestration (V2)</h3>
                        {ENDPOINTS.filter(ep => !ep.path.includes('/api/v1/router') && !ep.path.includes('/facilitator/') && !ep.path.includes('/intelligence/')).map(ep => (
                            <a
                                key={ep.id}
                                href={`#${ep.id}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    setActiveSection(ep.id);
                                    document.getElementById(ep.id)?.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className={`block text-xs font-bold mb-3 uppercase tracking-tight transition-colors ${activeSection === ep.id ? 'text-[#22D3EE]' : 'text-black hover:text-[#22D3EE]'
                                    }`}
                            >
                                {ep.title}
                            </a>
                        ))}
                    </div>

                    <div className="mt-8 pt-8 border-t-2 border-black/5">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4">Legacy (V1)</h3>
                        {ENDPOINTS.filter(ep => ep.path.includes('/api/v1/router')).map(ep => (
                            <a
                                key={ep.id}
                                href={`#${ep.id}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    setActiveSection(ep.id);
                                    document.getElementById(ep.id)?.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className={`block text-xs font-bold mb-3 uppercase tracking-tight transition-colors ${activeSection === ep.id ? 'text-[#22D3EE]' : 'text-neutral-400 hover:text-[#22D3EE]'}`}
                            >
                                {ep.method} {ep.path.split('/').pop()}
                            </a>
                        ))}
                    </div>
                </aside>

                {/* 2. Main Content & Code Snippets Grid */}
                <main className="overflow-y-auto scroll-smooth">
                    <div className="max-w-[1400px] mx-auto">

                        {/* Welcome Header */}
                        <section id="welcome" className="p-12 border-b-2 border-black/5">
                            <Badge variant="primary" className="mb-4">Developer Reference</Badge>
                            <h1 className="text-6xl font-black mb-6 tracking-tighter uppercase italic">API Reference</h1>
                            <p className="text-xl text-neutral-600 max-w-2xl leading-relaxed">
                                Welcome to the P402 V2 API. Our platform provides a payment-aware orchestration layer,
                                allowing you to route AI requests based on cost, quality, and reliability with zero code changes.
                            </p>
                        </section>

                        {/* Authentication Section */}
                        <section id="auth" className="p-12 border-b-2 border-black/5">
                            <h2 className="text-3xl font-black mb-6 uppercase">Authentication</h2>
                            <p className="text-neutral-600 mb-8 leading-relaxed max-w-2xl">
                                All API requests must be authenticated using your P402 API Key.
                                You can manage your keys in the <Link href="/dashboard" className="text-primary font-bold">Dashboard</Link>.
                                Pass the key in the <code>Authorization</code> header for every request.
                            </p>

                            <div className="bg-neutral-50 p-6 border-2 border-black font-mono text-sm mb-8">
                                <div className="text-neutral-400 mb-2"># Example Authorization Header</div>
                                <div className="text-black">Authorization: Bearer p402_live_your_key_here</div>
                            </div>

                            <div className="flex items-start gap-4 p-4 border-2 border-[#F59E0B] bg-[#F59E0B]/5 rounded-none">
                                <span className="text-xl">⚠️</span>
                                <p className="text-xs text-neutral-600 leading-relaxed">
                                    <span className="font-bold text-black uppercase block mb-1">Security Best Practice</span>
                                    Never expose your API key in client-side code (browsers, mobile apps).
                                    Always route requests through a secure backend service to keep your credentials safe.
                                </p>
                            </div>
                        </section>

                        {/* Endpoints Loop */}
                        {ENDPOINTS.map(ep => (
                            <section
                                key={ep.id}
                                id={ep.id}
                                className="grid grid-cols-1 lg:grid-cols-2 min-h-[500px] border-b-2 border-black/5"
                                onMouseEnter={() => setActiveSection(ep.id)}
                            >
                                {/* Center Pillar: Documentation */}
                                <div className="p-12 border-r-2 border-black/5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Badge variant={ep.method === 'POST' ? 'primary' : 'default'} className="!text-[10px] !py-1">
                                            {ep.method}
                                        </Badge>
                                        <code className="text-sm font-black tracking-tight">{ep.path}</code>
                                    </div>
                                    <h2 className="text-3xl font-black mb-4 uppercase">{ep.title}</h2>
                                    <p className="text-neutral-600 mb-8 leading-relaxed">
                                        {ep.description}
                                    </p>

                                    {ep.params && (
                                        <div className="mt-12">
                                            <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4">Parameters</h3>
                                            <div className="space-y-6">
                                                {ep.params.map(p => (
                                                    <div key={p.name} className="flex gap-4 items-start border-l-2 border-black/5 pl-4 py-1">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-xs font-black font-mono">{p.name}</span>
                                                                <span className="text-[10px] uppercase font-bold text-neutral-400">{p.type}</span>
                                                                {p.required && <span className="text-[9px] uppercase font-black text-[#EF4444]">Required</span>}
                                                            </div>
                                                            <p className="text-xs text-neutral-500 leading-normal">{p.desc}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right Pillar: Code Examples */}
                                <div className="p-12 bg-neutral-50 sticky top-0 h-fit">
                                    <div className="mb-8">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4">Example Request</h3>
                                        <TabGroup
                                            tabs={[
                                                { id: 'curl', label: 'cURL', content: <CodeBlock language="bash" code={ep.examples.curl} /> },
                                                { id: 'js', label: 'Node.js', content: <CodeBlock language="javascript" code={ep.examples.javascript} /> },
                                                { id: 'py', label: 'Python', content: <CodeBlock language="python" code={ep.examples.python} /> }
                                            ]}
                                        />
                                    </div>

                                    <div>
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4">Example Response</h3>
                                        <CodeBlock language="json" value={ep.examples.response} />
                                    </div>
                                </div>
                            </section>
                        ))}


                    </div>
                </main>
            </div>

            {/* Global Smooth Scroll Style */}
            <style jsx global>{`
                html { scroll-behavior: smooth; }
                .scroll-smooth { scroll-behavior: smooth; }
            `}</style>
            <Footer />
        </div>
    );
}
