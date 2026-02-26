import type { Metadata } from 'next';
import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
    title: 'Orchestration | P402',
    description: 'Run A2A agent tasks with streaming trace and paid workflows via x402. JSON-RPC 2.0 task lifecycle with SSE real-time updates.',
    alternates: { canonical: 'https://p402.io/product/orchestration' },
};

const TASK_STATES = [
    { state: 'pending', desc: 'Task received. Not yet assigned to a worker.' },
    { state: 'processing', desc: 'Agent is executing. SSE stream is open.' },
    { state: 'completed', desc: 'Artifacts available. Final state.' },
    { state: 'failed', desc: 'Execution error. Includes error message and requestId.' },
    { state: 'cancelled', desc: 'Cancelled by caller before completion.' },
] as const;

const RPC_METHODS = [
    { method: 'tasks/send', desc: 'Submit a new task. Returns task object with initial state.' },
    { method: 'tasks/get', desc: 'Retrieve task by ID. Includes artifacts if completed.' },
    { method: 'tasks/cancel', desc: 'Cancel an in-progress task. Idempotent.' },
    { method: 'tasks/sendSubscribe', desc: 'Submit and subscribe. Opens SSE stream for live updates.' },
] as const;

export default function OrchestrationPage() {
    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-primary selection:text-black">
            <TopNav />
            <main>

                {/* Header */}
                <section className="border-b-2 border-black py-16 bg-white">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">Product / Orchestration</div>
                        <h1 className="text-5xl lg:text-6xl font-black uppercase tracking-tighter leading-none mb-5">
                            Agent tasks.<br />
                            <span className="bg-primary px-2">Streaming trace.</span>
                        </h1>
                        <p className="text-lg font-medium text-neutral-600 max-w-2xl leading-relaxed border-l-4 border-black pl-5">
                            The A2A protocol lets agents communicate via JSON-RPC 2.0 task requests.
                            Tasks stream live updates via SSE. Payment-required events are first-class — handled via the x402 extension, not as errors.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-4">
                            <Link href="/docs/a2a" className="inline-flex items-center h-11 px-6 bg-primary text-black font-black text-[11px] uppercase tracking-wider border-2 border-black hover:bg-black hover:text-primary transition-colors no-underline">
                                A2A reference
                            </Link>
                            <Link href="/dashboard/tasks" className="inline-flex items-center h-11 px-6 text-black font-black text-[11px] uppercase tracking-wider border-2 border-black hover:bg-neutral-50 transition-colors no-underline">
                                View live tasks
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Task lifecycle */}
                <section className="py-16 border-b-2 border-black bg-neutral-50">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Task lifecycle</div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter mb-8">Five states</h2>
                        <div className="border-2 border-black divide-y divide-neutral-100">
                            {TASK_STATES.map(t => (
                                <div key={t.state} className="flex items-start gap-5 p-5 bg-white">
                                    <code className={`font-mono text-xs font-black w-28 shrink-0 ${
                                        t.state === 'completed' ? 'text-success' :
                                        t.state === 'failed' ? 'text-error' :
                                        t.state === 'processing' ? 'text-info' :
                                        'text-neutral-500'
                                    }`}>{t.state}</code>
                                    <span className="text-xs font-medium text-neutral-600">{t.desc}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* JSON-RPC methods */}
                <section className="py-16 border-b-2 border-black bg-white">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="flex flex-col lg:flex-row gap-12">
                            <div className="lg:w-1/2">
                                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">JSON-RPC 2.0</div>
                                <h2 className="text-3xl font-black uppercase tracking-tighter mb-6">Methods</h2>
                                <div className="space-y-px border-2 border-black">
                                    {RPC_METHODS.map(m => (
                                        <div key={m.method} className="p-4 bg-neutral-50 border-b border-neutral-100 last:border-b-0">
                                            <code className="font-mono text-[11px] font-black text-black">{m.method}</code>
                                            <p className="text-xs font-medium text-neutral-500 mt-1">{m.desc}</p>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[10px] font-medium text-neutral-400 mt-4">
                                    All methods POST to <code className="font-mono">POST /api/a2a</code> with JSON-RPC 2.0 envelope.
                                </p>
                            </div>
                            <div className="lg:w-1/2">
                                <div className="border-2 border-black bg-[#0D0D0D] p-5">
                                    <div className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-3">Send a task</div>
                                    <pre className="font-mono text-[11px] text-neutral-300 overflow-x-auto leading-relaxed whitespace-pre">{`curl -X POST https://p402.io/api/a2a \\
  -H "Authorization: Bearer $P402_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "method": "tasks/send",
    "id": "1",
    "params": {
      "message": {
        "role": "user",
        "parts": [{
          "type": "text",
          "text": "Analyze this dataset"
        }]
      },
      "metadata": {
        "budget_usd": 0.50
      }
    }
  }'

# Response:
{
  "jsonrpc": "2.0",
  "id": "1",
  "result": {
    "id": "task_01HX...",
    "status": { "state": "pending" }
  }
}`}</pre>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Paid task recipe */}
                <section className="py-16 border-b-2 border-black bg-neutral-50">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="flex flex-col lg:flex-row gap-12">
                            <div className="lg:w-1/2">
                                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Paid workflows</div>
                                <h2 className="text-3xl font-black uppercase tracking-tighter mb-4">Payment-required tasks</h2>
                                <p className="text-sm font-medium text-neutral-600 leading-relaxed mb-5">
                                    When an agent requires payment, it emits a <code className="font-mono text-black">payment-required</code> message — not an HTTP error.
                                    The orchestrator handles the x402 extension inline.
                                </p>
                                <div className="space-y-3">
                                    <div className="border-l-2 border-primary pl-4">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Agent sends</div>
                                        <code className="font-mono text-xs text-black">&#123; type: &apos;payment-required&apos;, data: X402PaymentRequired &#125;</code>
                                    </div>
                                    <div className="border-l-2 border-info pl-4">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Client sends</div>
                                        <code className="font-mono text-xs text-black">&#123; type: &apos;payment-submitted&apos;, data: X402PaymentSubmitted &#125;</code>
                                    </div>
                                    <div className="border-l-2 border-success pl-4">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Agent sends</div>
                                        <code className="font-mono text-xs text-black">&#123; type: &apos;payment-completed&apos;, data: X402PaymentCompleted &#125;</code>
                                    </div>
                                </div>
                                <p className="text-xs font-medium text-neutral-500 mt-4">
                                    Payment events appear as structured cards in the Tasks dashboard. Billing cap errors are returned as JSON-RPC <code className="font-mono">-32000</code> block errors — the orchestrator does not crash.
                                </p>
                            </div>
                            <div className="lg:w-1/2">
                                <div className="border-2 border-black bg-[#0D0D0D] p-5">
                                    <div className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-3">SSE stream subscription</div>
                                    <pre className="font-mono text-[11px] text-neutral-300 overflow-x-auto leading-relaxed whitespace-pre">{`# Subscribe to task updates:
curl -N https://p402.io/api/a2a/stream?taskId=task_01HX... \\
  -H "Authorization: Bearer $P402_API_KEY"

# Stream events:
data: {"type":"status","state":"processing"}
data: {"type":"payment-required","amount":"500000"}
data: {"type":"payment-completed","txHash":"0x..."}
data: {"type":"status","state":"completed"}
data: {"type":"artifact","text":"Analysis complete..."}`}</pre>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Trace viewer */}
                <section className="py-16 bg-white">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Decision trace</div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter mb-4">See every routing decision</h2>
                        <p className="text-sm font-medium text-neutral-600 max-w-2xl leading-relaxed mb-8">
                            The trace viewer streams every routing decision in real time — provider selected, cost saved, mandate checked, policy enforced, settlement attempted. Useful for debugging and auditing agentic workflows.
                        </p>
                        <div className="flex gap-4">
                            <Link href="/dashboard/tasks" className="inline-flex items-center h-11 px-6 bg-primary border-2 border-black font-black text-[11px] uppercase tracking-wider hover:bg-black hover:text-primary transition-colors no-underline">
                                Open task dashboard
                            </Link>
                            <Link href="/docs/a2a" className="inline-flex items-center h-11 px-6 border-2 border-black font-black text-[11px] uppercase tracking-wider hover:bg-neutral-50 transition-colors no-underline">
                                A2A reference
                            </Link>
                        </div>
                    </div>
                </section>

            </main>
            <Footer />
        </div>
    );
}
