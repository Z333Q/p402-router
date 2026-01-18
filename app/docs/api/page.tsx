'use client';

import React, { useState } from 'react';
import { TopNav } from "@/components/TopNav";
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
                        <a href="#welcome" className="block text-sm font-bold mb-2 hover:text-[#22D3EE] transition-colors">Overview</a>
                        <a href="#auth" className="block text-sm font-bold mb-2 hover:text-[#22D3EE] transition-colors">Authentication</a>
                    </div>

                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4">Orchestration (V2)</h3>
                        {ENDPOINTS.map(ep => (
                            <a
                                key={ep.id}
                                href={`#${ep.id}`}
                                onClick={() => setActiveSection(ep.id)}
                                className={`block text-xs font-bold mb-3 uppercase tracking-tight transition-colors ${activeSection === ep.id ? 'text-[#22D3EE]' : 'text-black hover:text-[#22D3EE]'
                                    }`}
                            >
                                {ep.title}
                            </a>
                        ))}
                    </div>

                    <div className="mt-8 pt-8 border-t-2 border-black/5">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4">Legacy (V1)</h3>
                        <a href="#v1-plan" className="block text-xs font-bold mb-3 uppercase text-neutral-400 hover:text-black transition-colors">POST /plan</a>
                        <a href="#v1-settle" className="block text-xs font-bold mb-3 uppercase text-neutral-400 hover:text-black transition-colors">POST /settle</a>
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

                        {/* Legacy V1 Section */}
                        <section id="legacy" className="p-12 bg-neutral-100 italic text-neutral-400">
                            <h2 className="text-xl font-black mb-4">Looking for V1?</h2>
                            <p className="text-sm">The legacy x402 payment endpoints are still available at /api/v1/router/*. Please refer to the V1 documentation for details.</p>
                        </section>
                    </div>
                </main>
            </div>

            {/* Global Smooth Scroll Style */}
            <style jsx global>{`
                html { scroll-behavior: smooth; }
                .scroll-smooth { scroll-behavior: smooth; }
            `}</style>
        </div>
    );
}
