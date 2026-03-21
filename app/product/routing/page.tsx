import type { Metadata } from 'next';
import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
    title: 'AI Routing | P402',
    description: 'Route AI calls across 300+ models via one OpenAI-compatible endpoint. Cost, Quality, Speed, and Balanced modes with full cost metadata on every response.',
    alternates: { canonical: 'https://p402.io/product/routing' },
};

const MODES = [
    {
        id: 'cost',
        label: 'Cost',
        accent: '#B6FF2E',
        goal: 'Minimize spend per token.',
        logic: 'Scores providers by effective cost per 1k tokens. Prefers semantic cache hits. Falls back through DeepSeek → Haiku → Flash.',
        models: ['deepseek-chat', 'claude-haiku-4-6', 'gemini-3.1-flash'],
        example: 'Batch summarization, classification, structured extraction.',
    },
    {
        id: 'quality',
        label: 'Quality',
        accent: '#818CF8',
        goal: 'Maximize capability regardless of cost.',
        logic: 'Routes to frontier models with the highest benchmark scores for the task type. Reasoning and multi-step tasks use the top-ranked model available.',
        models: ['claude-opus-4-6', 'gpt-5.4', 'gemini-3.1-ultra'],
        example: 'Code audits, legal analysis, complex reasoning chains.',
    },
    {
        id: 'speed',
        label: 'Speed',
        accent: '#22D3EE',
        goal: 'Minimize time-to-first-token.',
        logic: 'Prefers models on dedicated inference hardware. Targets sub-200ms TTFB on short prompts. Flash and Groq LPU endpoints are prioritised.',
        models: ['gemini-3.1-flash', 'claude-haiku-4-6', 'llama-3.3-70b-versatile'],
        example: 'User-facing chat, real-time agents, low-latency pipelines.',
    },
    {
        id: 'balanced',
        label: 'Balanced',
        accent: '#F59E0B',
        goal: '50/50 cost and capability score (default).',
        logic: 'Weighs cost efficiency against benchmark quality. Continuously re-weighted by the intelligence layer every hour based on live routing outcomes.',
        models: ['claude-sonnet-4-6', 'gpt-5.4', 'gemini-3.1-pro'],
        example: 'General-purpose agents, production workloads without a hard cost target.',
    },
] as const;

const GUARD_LAYERS = [
    { n: '01', name: 'Rate limit', detail: '1,000 req / hr per tenant. Redis token bucket.' },
    { n: '02', name: 'Daily circuit breaker', detail: '$1,000 / day hard cap. Resets at UTC midnight.' },
    { n: '03', name: 'Concurrency cap', detail: 'Max 10 simultaneous in-flight requests per tenant.' },
    { n: '04', name: 'Anomaly detection', detail: 'Z-score ≥ 3.0σ above cost history. Soft block — logs and alerts without hard-stopping.' },
    { n: '05', name: 'Per-request cap', detail: '$50 max per single request. Always enforced, fail-closed regardless of Redis availability.' },
    { n: '06', name: 'Budget reservation', detail: 'Atomic Redis lock before dispatch. 5-minute TTL. Finalises actual spend on completion.' },
] as const;

export default function RoutingPage() {
    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-primary selection:text-black">
            <TopNav />
            <main>

                {/* Header */}
                <section className="border-b-2 border-black py-16 bg-white">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3"><span className="font-mono">{">_"}</span> Product / AI Routing</div>
                        <h1 className="text-5xl lg:text-6xl font-black uppercase tracking-tighter leading-none mb-5">
                            One endpoint.<br />
                            <span className="heading-accent">300+ models.</span>
                        </h1>
                        <p className="text-lg font-medium text-neutral-600 max-w-2xl leading-relaxed border-l-4 border-black pl-5">
                            P402 is an OpenAI-compatible API that routes each request to the optimal model for your
                            cost and quality target — automatically, continuously, across 300+ providers.
                            Every response includes full cost metadata. No vendor lock-in.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-4">
                            <Link href="/login" className="inline-flex items-center h-11 px-6 bg-primary text-black font-black text-[11px] uppercase tracking-wider border-2 border-black hover:bg-black hover:text-primary transition-colors no-underline">
                                Get started free
                            </Link>
                            <Link href="/docs/sdk" className="inline-flex items-center h-11 px-6 text-black font-black text-[11px] uppercase tracking-wider border-2 border-black hover:bg-neutral-50 transition-colors no-underline">
                                SDK reference
                            </Link>
                        </div>
                    </div>
                </section>

                {/* One URL swap */}
                <section className="py-16 border-b-2 border-black bg-neutral-50">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Integration</div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter mb-8">One line to switch.</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-px border-2 border-black bg-black">
                            <div className="bg-white p-6">
                                <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-4">Before</div>
                                <div className="bg-neutral-900 p-4 font-mono text-xs text-neutral-300 leading-relaxed">
                                    <div className="text-neutral-500">{'const openai = new OpenAI({'}</div>
                                    <div className="pl-4"><span className="text-neutral-500">baseURL: </span><span className="text-red-400 line-through">&apos;https://api.openai.com/v1&apos;</span></div>
                                    <div className="text-neutral-500">{'});'}</div>
                                </div>
                            </div>
                            <div className="bg-primary p-6">
                                <div className="text-[9px] font-black uppercase tracking-widest text-black/50 mb-4">After</div>
                                <div className="bg-black p-4 font-mono text-xs text-neutral-300 leading-relaxed">
                                    <div className="text-neutral-500">{'const openai = new OpenAI({'}</div>
                                    <div className="pl-4">
                                        <span className="text-neutral-500">baseURL: </span>
                                        <span className="text-primary">&apos;https://p402.io/api/v2&apos;</span><span className="text-neutral-500">,</span>
                                    </div>
                                    <div className="pl-4">
                                        <span className="text-neutral-500">apiKey:  </span>
                                        <span className="text-neutral-300">process.env.P402_API_KEY</span>
                                    </div>
                                    <div className="text-neutral-500">{'});'}</div>
                                </div>
                                <p className="text-[10px] font-black text-black/60 uppercase tracking-widest mt-3">
                                    All other code unchanged. Same interface. 300+ models.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Routing modes */}
                <section className="py-16 border-b-2 border-black bg-white">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Routing Modes</div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter mb-3">Four modes. One field.</h2>
                        <p className="text-sm font-medium text-neutral-600 mb-10 max-w-xl">
                            Set <code className="font-mono bg-neutral-100 px-1 border border-neutral-200">p402.mode</code> on any request.
                            Provider selection, failover, and re-ranking happen automatically.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-px border-2 border-black bg-black">
                            {MODES.map(m => (
                                <div key={m.id} className="bg-white p-6 flex flex-col gap-3">
                                    <div className="flex items-center gap-3">
                                        <span
                                            className="inline-block w-2.5 h-2.5 border-2 border-black"
                                            style={{ background: m.accent }}
                                        />
                                        <span className="font-black uppercase tracking-wider text-sm">{m.label}</span>
                                    </div>
                                    <p className="text-xs font-bold text-black">{m.goal}</p>
                                    <p className="text-xs font-medium text-neutral-500 leading-relaxed">{m.logic}</p>
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        {m.models.map(model => (
                                            <code key={model} className="text-[9px] font-mono font-bold bg-neutral-100 border border-neutral-200 px-1.5 py-0.5">
                                                {model}
                                            </code>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-neutral-400 font-mono mt-1 border-t border-neutral-100 pt-2">
                                        {m.example}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 bg-neutral-900 p-5 border-2 border-black font-mono text-xs text-neutral-300 leading-relaxed">
                            <div className="text-neutral-500 mb-1">{'// Set mode per-request via the p402 extension field'}</div>
                            <div><span className="text-neutral-400">{'await openai.chat.completions.create({'}</span></div>
                            <div className="pl-4"><span className="text-neutral-400">model: </span><span className="text-primary">&apos;gpt-5.4&apos;</span><span className="text-neutral-500">,  {'// overridden by router'}</span></div>
                            <div className="pl-4"><span className="text-neutral-400">messages,</span></div>
                            <div className="pl-4 text-neutral-400">{'// @ts-ignore — p402 extension field'}</div>
                            <div className="pl-4 text-neutral-400">{'p402: {'}</div>
                            <div className="pl-8"><span className="text-primary">mode: </span><span className="text-[#22D3EE]">&apos;cost&apos;</span><span className="text-neutral-500">,  {'// cost | quality | speed | balanced'}</span></div>
                            <div className="pl-8"><span className="text-primary">cache: </span><span className="text-neutral-300">true</span><span className="text-neutral-500">,</span></div>
                            <div className="pl-8"><span className="text-primary">session_id: </span><span className="text-neutral-300">&apos;sess_xyz&apos;</span><span className="text-neutral-500">,</span></div>
                            <div className="pl-4 text-neutral-400">{'}'}</div>
                            <div className="text-neutral-400">{'});'}</div>
                        </div>
                    </div>
                </section>

                {/* p402_metadata */}
                <section className="py-16 border-b-2 border-black bg-neutral-50">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Response</div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter mb-3">Full cost metadata on every response.</h2>
                        <p className="text-sm font-medium text-neutral-600 mb-8 max-w-xl">
                            Every completion returns a <code className="font-mono bg-neutral-100 px-1 border border-neutral-200">p402_metadata</code> block
                            with the actual cost, provider selected, savings vs. direct access, tokens, and latency.
                        </p>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-px border-2 border-black bg-black">
                            <div className="bg-neutral-900 p-6 font-mono text-[11px] leading-loose text-neutral-300">
                                <div className="text-neutral-600 text-[9px] uppercase tracking-widest mb-4 font-sans">p402_metadata shape</div>
                                <div><span className="text-neutral-500">request_id:          </span><span className="text-white">string</span></div>
                                <div><span className="text-neutral-500">tenant_id:           </span><span className="text-white">string</span></div>
                                <div><span className="text-neutral-500">provider:            </span><span className="text-primary">string</span></div>
                                <div><span className="text-neutral-500">model:               </span><span className="text-primary">string</span>  <span className="text-neutral-700">{'// actual model used'}</span></div>
                                <div><span className="text-neutral-500">cost_usd:            </span><span className="text-green-400">number</span>  <span className="text-neutral-700">{'// what P402 charged'}</span></div>
                                <div><span className="text-neutral-500">direct_cost:         </span><span className="text-green-400">number</span>  <span className="text-neutral-700">{'// list price at provider'}</span></div>
                                <div><span className="text-neutral-500">savings:             </span><span className="text-green-400">number</span>  <span className="text-neutral-700">{'// direct_cost - cost_usd'}</span></div>
                                <div><span className="text-neutral-500">input_tokens:        </span><span className="text-white">number</span></div>
                                <div><span className="text-neutral-500">output_tokens:       </span><span className="text-white">number</span></div>
                                <div><span className="text-neutral-500">latency_ms:          </span><span className="text-white">number</span></div>
                                <div><span className="text-neutral-500">provider_latency_ms: </span><span className="text-white">number</span></div>
                                <div><span className="text-neutral-500">cached:              </span><span className="text-white">boolean</span></div>
                                <div><span className="text-neutral-500">routing_mode:        </span><span className="text-primary">string</span></div>
                            </div>
                            <div className="bg-white p-6">
                                <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-4">Why it matters</div>
                                <div className="space-y-4">
                                    {[
                                        { field: 'cost_usd vs direct_cost', why: 'Shows exactly what you saved on this call vs. going direct to the provider. Compound this across millions of requests.' },
                                        { field: 'cached: true', why: 'A semantic cache hit costs nothing and returns in <50ms. The cache serves responses when a new prompt is >92% similar to a previous one.' },
                                        { field: 'savings', why: 'direct_cost minus cost_usd. Use this field to build live savings dashboards or per-session cost attribution.' },
                                        { field: 'provider_latency_ms', why: 'Separates P402 overhead from provider latency. P402 typically adds <10ms to the critical path.' },
                                    ].map(item => (
                                        <div key={item.field} className="border-l-2 border-black pl-4">
                                            <code className="font-mono text-[10px] font-black text-black">{item.field}</code>
                                            <p className="text-xs font-medium text-neutral-500 mt-1 leading-relaxed">{item.why}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Semantic Cache */}
                <section className="py-16 border-b-2 border-black bg-white">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Semantic Cache</div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter mb-3">Repeated queries cost nothing.</h2>
                        <p className="text-sm font-medium text-neutral-600 mb-8 max-w-xl">
                            Every prompt is embedded and compared against the cache. If an incoming request is
                            more than 92% similar to a cached response, P402 returns it instantly — no provider
                            call, no cost, sub-50ms latency.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-px border-2 border-black bg-black">
                            {[
                                { label: 'Similarity threshold', value: '>92%', desc: 'Vector cosine similarity required before a cache hit is returned.' },
                                { label: 'Cache hit latency', value: '<50ms', desc: 'Response served from Redis. No model inference, no on-chain settlement.' },
                                { label: 'Cache hit cost', value: '$0.00', desc: 'No provider call means no cost. Platform fee is also waived on cache hits.' },
                            ].map(stat => (
                                <div key={stat.label} className="bg-white p-6">
                                    <div className="text-4xl font-black text-primary border-b-2 border-black pb-4 mb-4">{stat.value}</div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-black mb-2">{stat.label}</div>
                                    <p className="text-xs font-medium text-neutral-500 leading-relaxed">{stat.desc}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 p-4 border-2 border-black bg-neutral-50 text-xs font-medium text-neutral-600">
                            Enable with <code className="font-mono bg-white border border-neutral-200 px-1">{'p402: { cache: true }'}</code> on any request.
                            Check <code className="font-mono bg-white border border-neutral-200 px-1">p402_metadata.cached</code> in the response to confirm a hit.
                        </div>
                    </div>
                </section>

                {/* Billing Guard */}
                <section className="py-16 border-b-2 border-black bg-neutral-50">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Billing Guard</div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter mb-3">Six layers of spending protection.</h2>
                        <p className="text-sm font-medium text-neutral-600 mb-8 max-w-xl">
                            Every request passes six enforcement layers before a model is called.
                            Layers 1–4 are Redis-backed and fail-open if Redis is unavailable.
                            Layer 5 is always enforced. Layer 6 uses atomic budget reservation.
                        </p>

                        <div className="border-2 border-black bg-white divide-y-2 divide-black">
                            {GUARD_LAYERS.map(layer => (
                                <div key={layer.n} className="flex items-start gap-6 p-5">
                                    <div className="text-2xl font-black text-neutral-200 font-mono shrink-0 w-8">{layer.n}</div>
                                    <div>
                                        <div className="font-black uppercase tracking-wide text-sm text-black mb-1">{layer.name}</div>
                                        <p className="text-xs font-medium text-neutral-500 leading-relaxed">{layer.detail}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 p-4 border-2 border-black bg-white text-xs font-medium text-neutral-600">
                            Billing Guard errors return structured JSON with a <code className="font-mono bg-neutral-50 border border-neutral-200 px-1">code</code> and
                            a <code className="font-mono bg-neutral-50 border border-neutral-200 px-1">retry_after_ms</code> hint on rate limit responses.
                            See <Link href="/product/controls" className="underline underline-offset-2 font-black">Controls →</Link> for mandate and policy-level spend governance.
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="py-20 bg-primary border-t-2 border-black">
                    <div className="container mx-auto px-6 max-w-5xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div>
                            <h2 className="text-3xl font-black uppercase tracking-tighter">Start routing in minutes.</h2>
                            <p className="text-black/70 font-bold mt-1">Free tier. No credit card. One URL swap.</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                            <Link href="/login" className="inline-flex items-center justify-center h-11 px-6 bg-black text-primary font-black text-[11px] uppercase tracking-wider border-2 border-black hover:bg-white hover:text-black transition-colors no-underline">
                                Get started free
                            </Link>
                            <Link href="/developers/quickstart" className="inline-flex items-center justify-center h-11 px-6 text-black font-black text-[11px] uppercase tracking-wider border-2 border-black hover:bg-black hover:text-primary transition-colors no-underline">
                                Run quickstart
                            </Link>
                        </div>
                    </div>
                </section>

            </main>
            <Footer />
        </div>
    );
}
