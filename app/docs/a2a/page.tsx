import type { Metadata } from 'next';
import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'A2A Protocol | P402 Docs',
  description:
    'Complete reference for Google A2A JSON-RPC 2.0 protocol on P402. Task lifecycle, all methods, SSE streaming, x402 payment extension, error handling, and end-to-end examples.',
  alternates: { canonical: 'https://p402.io/docs/a2a' },
  openGraph: {
    title: 'A2A Protocol — P402 Agent-to-Agent Integration',
    description:
      'Build payment-aware AI agents with A2A JSON-RPC, x402 micropayments, and AP2 mandate governance.',
    url: 'https://p402.io/docs/a2a',
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

export default function A2ADocs() {
  return (
    <div className="min-h-screen bg-white text-black selection:bg-primary selection:text-black">
      <TopNav />

      <div className="border-b-2 border-black bg-neutral-50">
        <div className="max-w-[860px] mx-auto px-6 py-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-neutral-500">
          <Link href="/docs" className="hover:text-black no-underline transition-colors">Docs</Link>
          <span>/</span>
          <span className="text-black">A2A Protocol</span>
        </div>
      </div>

      <main className="max-w-[860px] mx-auto px-6 py-20">

        {/* ── HEADING ── */}
        <div className="border-b-2 border-black pb-16 mb-16">
          <SectionLabel>DOCS / REFERENCE</SectionLabel>
          <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tight leading-tight mb-6">
            A2A<br />
            <span className="heading-accent">PROTOCOL.</span>
          </h1>
          <div className="border-l-[4px] border-black pl-5 max-w-xl">
            <p className="text-lg text-neutral-600 leading-relaxed">
              P402 implements the Google A2A (Agent-to-Agent) protocol over JSON-RPC 2.0.
              This page is the complete reference: task lifecycle, all four RPC methods,
              SSE streaming, and the x402 payment extension.
            </p>
          </div>
        </div>

        {/* ── WHAT IS A2A ── */}
        <div className="mb-16">
          <h2 className="text-2xl font-black uppercase italic tracking-tight mb-4">What is A2A?</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            A2A is a standardized communication protocol that lets AI agents talk to each other
            using structured tasks over JSON-RPC 2.0. Instead of each agent defining its own API
            format, A2A provides a shared vocabulary that any conforming agent can understand.
          </p>
          <p className="text-sm text-neutral-600 leading-relaxed mb-6">
            P402 extends A2A with the <span className="font-mono">x402</span> payment extension,
            which adds machine-native payment negotiation to any A2A task. An agent can request
            USDC payment, receive a signed authorization from the caller, and confirm settlement
            — all within the same task context.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-black border-2 border-black">
            {[
              { label: 'Transport', value: 'JSON-RPC 2.0 over HTTPS POST' },
              { label: 'Streaming', value: 'Server-Sent Events (SSE)' },
              { label: 'Auth', value: 'Bearer token (P402 API key)' },
              { label: 'Endpoint', value: 'POST /api/a2a' },
              { label: 'Stream endpoint', value: 'GET /api/a2a/stream' },
              { label: 'Agent discovery', value: 'GET /.well-known/agent.json' },
            ].map((row) => (
              <div key={row.label} className="p-4 bg-white">
                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">{row.label}</div>
                <div className="font-mono text-sm font-bold">{row.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── TASK LIFECYCLE ── */}
        <div className="mb-16">
          <h2 className="text-2xl font-black uppercase italic tracking-tight mb-4">Task Lifecycle</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-6">
            Every unit of work in A2A is a <strong>Task</strong>. A task moves through a fixed
            state machine. Understanding these states is essential for building agents that handle
            edge cases correctly.
          </p>
          <div className="border-2 border-black overflow-hidden mb-6">
            <div className="bg-black px-4 py-2 text-[10px] font-black uppercase tracking-widest text-primary font-mono">
              Task State Machine
            </div>
            <div className="p-6 bg-neutral-50 font-mono text-sm text-center text-neutral-700">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span className="border-2 border-black bg-white px-3 py-1 font-bold">pending</span>
                <span className="text-neutral-400">→</span>
                <span className="border-2 border-black bg-white px-3 py-1 font-bold">processing</span>
                <span className="text-neutral-400">→</span>
                <div className="flex flex-col gap-2 items-start">
                  <span className="border-2 border-black bg-[#E9FFD0] px-3 py-1 font-bold">completed</span>
                  <span className="border-2 border-black bg-red-50 px-3 py-1 font-bold">failed</span>
                  <span className="border-2 border-black bg-neutral-100 px-3 py-1 font-bold">cancelled</span>
                </div>
              </div>
            </div>
          </div>
          <div className="border-2 border-black overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-black bg-neutral-50">
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">State</th>
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">Meaning</th>
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">Terminal?</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['pending', 'Task received, queued for processing.', 'No'],
                  ['processing', 'Agent is actively working on the task.', 'No'],
                  ['completed', 'Task finished successfully. Artifacts are available.', 'Yes'],
                  ['failed', 'Task encountered an unrecoverable error. Check status.message.', 'Yes'],
                  ['cancelled', 'Task was explicitly cancelled via tasks/cancel.', 'Yes'],
                ].map(([state, meaning, terminal]) => (
                  <tr key={state} className="border-b border-neutral-200 last:border-0">
                    <td className="px-4 py-3 font-mono text-[12px] font-bold">{state}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{meaning}</td>
                    <td className="px-4 py-3 text-sm font-bold">{terminal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── TASK OBJECT ── */}
        <div className="mb-16">
          <h2 className="text-2xl font-black uppercase italic tracking-tight mb-4">Task Object</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            All methods that return a task return this structure.
          </p>
          <CodeBlock
            language="json — Task object"
            code={`{
  "id": "task_01J...",
  "contextId": "ctx_...",        // Groups related tasks in a conversation
  "status": {
    "state": "completed",        // pending | processing | completed | failed | cancelled
    "message": {                 // Set when state = failed; explains the error
      "role": "agent",
      "parts": [{ "type": "text", "text": "Error: upstream provider timeout" }]
    },
    "timestamp": "2026-04-16T12:00:00.000Z"
  },
  "artifacts": [                 // Output produced by the task
    {
      "name": "completion",
      "parts": [{ "type": "text", "text": "The answer is 42." }]
    }
  ],
  "metadata": {
    "cost_usd": 0.0003,
    "latency_ms": 1240,
    "provider": "deepseek",
    "model": "deepseek-v3"
  }
}`}
          />
        </div>

        {/* ── JSON-RPC METHODS ── */}
        <div className="mb-16">
          <h2 className="text-2xl font-black uppercase italic tracking-tight mb-6">JSON-RPC Methods</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-8">
            All requests are <span className="font-mono">POST /api/a2a</span> with the standard
            JSON-RPC 2.0 envelope. The <span className="font-mono">method</span> field selects the
            operation. All methods require a{' '}
            <span className="font-mono">Authorization: Bearer &lt;api_key&gt;</span> header.
          </p>

          {/* tasks/send */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <span className="border-2 border-black bg-black text-primary font-mono text-xs px-2 py-1 font-bold">POST</span>
              <code className="font-mono text-base font-black">tasks/send</code>
            </div>
            <p className="text-sm text-neutral-600 leading-relaxed mb-4">
              Submits a new task. The router processes the request synchronously and returns the
              completed (or failed) task. Use this for short tasks where you can wait for the result.
            </p>
            <CodeBlock
              language="json — tasks/send request"
              code={`{
  "jsonrpc": "2.0",
  "method": "tasks/send",
  "id": 1,
  "params": {
    "message": {
      "role": "user",
      "parts": [{ "type": "text", "text": "Summarize this in one sentence: [...]" }]
    },
    "configuration": {
      "mode": "cost",        // cost | speed | quality | balanced
      "session_id": "ses_..." // optional: attach to a budget-capped session
    }
  }
}`}
            />
            <div className="mt-4">
              <CodeBlock
                language="json — tasks/send response"
                code={`{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "id": "task_01J...",
    "status": { "state": "completed", "timestamp": "2026-04-16T12:00:01.240Z" },
    "artifacts": [{
      "name": "completion",
      "parts": [{ "type": "text", "text": "The document outlines three key themes." }]
    }],
    "metadata": { "cost_usd": 0.0003, "latency_ms": 1240, "provider": "deepseek" }
  }
}`}
              />
            </div>
          </div>

          {/* tasks/sendSubscribe */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <span className="border-2 border-black bg-black text-primary font-mono text-xs px-2 py-1 font-bold">POST</span>
              <code className="font-mono text-base font-black">tasks/sendSubscribe</code>
            </div>
            <p className="text-sm text-neutral-600 leading-relaxed mb-4">
              Submits a task and immediately opens an SSE stream for live updates. The connection
              stays open until the task reaches a terminal state. Use this for long-running tasks
              or when you want to stream tokens to a UI.
            </p>
            <CodeBlock
              language="json — tasks/sendSubscribe request"
              code={`{
  "jsonrpc": "2.0",
  "method": "tasks/sendSubscribe",
  "id": 1,
  "params": {
    "message": {
      "role": "user",
      "parts": [{ "type": "text", "text": "Write a 500-word report on..." }]
    },
    "configuration": { "mode": "quality" }
  }
}`}
            />
            <div className="mt-4">
              <CodeBlock
                language="text/event-stream — SSE response"
                code={`data: {"id":"task_01J...","status":{"state":"processing","timestamp":"..."}}

data: {"id":"task_01J...","status":{"state":"processing"},"delta":{"type":"text","text":"The "}}

data: {"id":"task_01J...","status":{"state":"processing"},"delta":{"type":"text","text":"report "}}

data: {"id":"task_01J...","status":{"state":"completed","timestamp":"..."},"artifacts":[...]}`}
              />
            </div>
            <div className="mt-4">
              <CodeBlock
                language="javascript — consuming the SSE stream"
                code={`const response = await fetch('https://p402.io/api/a2a', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${process.env.P402_API_KEY}\`,
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'tasks/sendSubscribe',
    id: 1,
    params: {
      message: { role: 'user', parts: [{ type: 'text', text: 'Hello' }] },
      configuration: { mode: 'speed' },
    },
  }),
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();
let output = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const lines = decoder.decode(value).split('\\n');
  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    const event = JSON.parse(line.slice(6));
    if (event.delta?.type === 'text') output += event.delta.text;
    if (event.status?.state === 'completed') break;
  }
}
console.log(output);`}
              />
            </div>
          </div>

          {/* tasks/get */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <span className="border-2 border-black bg-black text-primary font-mono text-xs px-2 py-1 font-bold">POST</span>
              <code className="font-mono text-base font-black">tasks/get</code>
            </div>
            <p className="text-sm text-neutral-600 leading-relaxed mb-4">
              Retrieves a task by ID. Use this to poll for completion when you submitted with
              <span className="font-mono"> tasks/send</span> and want to check status asynchronously.
            </p>
            <CodeBlock
              language="json — tasks/get request"
              code={`{
  "jsonrpc": "2.0",
  "method": "tasks/get",
  "id": 2,
  "params": { "id": "task_01J..." }
}`}
            />
          </div>

          {/* tasks/cancel */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <span className="border-2 border-black bg-black text-primary font-mono text-xs px-2 py-1 font-bold">POST</span>
              <code className="font-mono text-base font-black">tasks/cancel</code>
            </div>
            <p className="text-sm text-neutral-600 leading-relaxed mb-4">
              Cancels an in-progress task. Only tasks in <span className="font-mono">pending</span>{' '}
              or <span className="font-mono">processing</span> state can be cancelled. Cancelling
              a terminal task returns an error.
            </p>
            <CodeBlock
              language="json — tasks/cancel request"
              code={`{
  "jsonrpc": "2.0",
  "method": "tasks/cancel",
  "id": 3,
  "params": { "id": "task_01J..." }
}

// Response: task with state = "cancelled"
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": { "id": "task_01J...", "status": { "state": "cancelled", "timestamp": "..." } }
}`}
            />
          </div>
        </div>

        {/* ── AGENT DISCOVERY ── */}
        <div className="mb-16">
          <h2 className="text-2xl font-black uppercase italic tracking-tight mb-4">Agent Discovery</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Before calling an agent, you can discover its capabilities by fetching its{' '}
            <strong>AgentCard</strong> — a machine-readable JSON manifest served at the standard
            well-known URL.
          </p>
          <CodeBlock
            language="bash — fetch P402's AgentCard"
            code={`curl https://p402.io/.well-known/agent.json`}
          />
          <div className="mt-4">
            <CodeBlock
              language="json — AgentCard response"
              code={`{
  "protocolVersion": "1.0",
  "name": "P402 Payment Router",
  "description": "AI orchestration router with x402 payment settlement.",
  "url": "https://p402.io",
  "capabilities": {
    "streaming": true,
    "pushNotifications": false
  },
  "skills": [
    {
      "id": "ai-completion",
      "name": "Chat Completion",
      "description": "Route a chat completion to the optimal provider",
      "tags": ["ai", "llm", "routing"]
    }
  ],
  "extensions": [
    {
      "uri": "tag:x402.org,2025:x402-payment",
      "description": "Accepts x402 EIP-3009 USDC payments on Base"
    }
  ],
  "endpoints": {
    "a2a": {
      "jsonrpc": "https://p402.io/api/a2a",
      "stream": "https://p402.io/api/a2a/stream"
    }
  }
}`}
            />
          </div>
        </div>

        {/* ── X402 EXTENSION ── */}
        <div className="mb-16">
          <h2 className="text-2xl font-black uppercase italic tracking-tight mb-4">
            x402 Payment Extension
          </h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            When an agent declares the <span className="font-mono">x402-payment</span> extension
            in its AgentCard, it can require payment before completing a task. The payment
            negotiation happens entirely within the A2A task context — no separate payment API call.
          </p>
          <p className="text-sm text-neutral-600 leading-relaxed mb-6">
            The flow has three steps: the agent sends a payment request, the caller submits a
            signed EIP-3009 authorization, and the agent confirms settlement before delivering
            the result.
          </p>

          <div className="space-y-8">
            {/* Step 1 */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 bg-primary border-2 border-black flex items-center justify-center font-black text-xs shrink-0">1</div>
                <h3 className="font-black uppercase tracking-tight">Agent sends payment-required</h3>
              </div>
              <p className="text-sm text-neutral-600 mb-3">
                The agent responds to the initial task with a payment request embedded in the result.
                The task state remains <span className="font-mono">processing</span> until payment
                is received.
              </p>
              <CodeBlock
                language="json — payment-required in task result"
                code={`{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "id": "task_01J...",
    "status": { "state": "processing" },
    "extension": {
      "uri": "tag:x402.org,2025:x402-payment",
      "content": {
        "type": "payment-required",
        "data": {
          "payment_id": "pay_abc123",
          "amount_usd": 0.05,
          "schemes": [{
            "scheme": "exact",
            "asset": "USDC",
            "network": "eip155:8453",
            "amount": "50000",   // 0.05 USDC in atomic units (6 decimals)
            "payTo": "0xFa772434DCe6ED78831EbC9eeAcbDF42E2A031a6"
          }],
          "valid_until": "2026-04-16T12:05:00.000Z"
        }
      }
    }
  }
}`}
              />
            </div>

            {/* Step 2 */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 bg-primary border-2 border-black flex items-center justify-center font-black text-xs shrink-0">2</div>
                <h3 className="font-black uppercase tracking-tight">Caller submits signed payment</h3>
              </div>
              <p className="text-sm text-neutral-600 mb-3">
                The caller signs an EIP-712 <span className="font-mono">TransferWithAuthorization</span>{' '}
                and submits it as a new task message. P402 verifies the signature and nonce before
                forwarding to the agent.
              </p>
              <CodeBlock
                language="json — payment-submitted message"
                code={`{
  "jsonrpc": "2.0",
  "method": "tasks/send",
  "id": 2,
  "params": {
    "id": "task_01J...",    // Continue the same task
    "message": {
      "role": "user",
      "parts": [{
        "type": "data",
        "data": {
          "extension": "tag:x402.org,2025:x402-payment",
          "type": "payment-submitted",
          "payment_id": "pay_abc123",
          "scheme": "exact",
          "authorization": {
            "from": "0xYourWalletAddress",
            "to": "0xFa772434DCe6ED78831EbC9eeAcbDF42E2A031a6",
            "value": "50000",
            "validAfter": "1713261600",
            "validBefore": "1713265200",
            "nonce": "0xabc123..."
          },
          "signature": "0x..."    // EIP-712 signature over the authorization
        }
      }]
    }
  }
}`}
              />
            </div>

            {/* Step 3 */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 bg-primary border-2 border-black flex items-center justify-center font-black text-xs shrink-0">3</div>
                <h3 className="font-black uppercase tracking-tight">Agent confirms and delivers result</h3>
              </div>
              <p className="text-sm text-neutral-600 mb-3">
                After P402 settles the on-chain transfer, the agent receives confirmation and
                completes the original task. The response includes a receipt ID for your records.
              </p>
              <CodeBlock
                language="json — payment-completed and task result"
                code={`{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "id": "task_01J...",
    "status": { "state": "completed", "timestamp": "2026-04-16T12:00:45.000Z" },
    "artifacts": [{
      "name": "completion",
      "parts": [{ "type": "text", "text": "Here is the premium analysis you requested..." }]
    }],
    "extension": {
      "uri": "tag:x402.org,2025:x402-payment",
      "content": {
        "type": "payment-completed",
        "payment_id": "pay_abc123",
        "receipt_id": "rec_789xyz",
        "tx_hash": "0x..."
      }
    },
    "metadata": { "cost_usd": 0.05, "latency_ms": 3200 }
  }
}`}
              />
            </div>
          </div>
        </div>

        {/* ── ERROR HANDLING ── */}
        <div className="mb-16">
          <h2 className="text-2xl font-black uppercase italic tracking-tight mb-4">Error Handling</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-6">
            A2A errors are returned as standard JSON-RPC error objects. The HTTP status is always
            200 — errors are embedded in the JSON payload, not in the HTTP status code. This lets
            orchestrators handle them without HTTP error detection logic.
          </p>
          <CodeBlock
            language="json — JSON-RPC error response"
            code={`{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32000,
    "message": "BILLING_CAP_REACHED",
    "data": {
      "budget_usd": 10.00,
      "spent_usd": 10.00,
      "session_id": "ses_..."
    }
  }
}`}
          />
          <div className="mt-6 border-2 border-black overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-black bg-neutral-50">
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">Code</th>
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">Message</th>
                  <th className="text-left px-4 py-3 font-black uppercase text-[11px] tracking-widest">Meaning & Action</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['-32700', 'Parse error', 'Request body is not valid JSON. Fix the serialization.'],
                  ['-32600', 'Invalid request', 'Missing jsonrpc, method, or id. Check the envelope structure.'],
                  ['-32601', 'Method not found', 'Unknown method. Valid: tasks/send, tasks/get, tasks/cancel, tasks/sendSubscribe.'],
                  ['-32602', 'Invalid params', 'Method params are malformed. Check the required fields.'],
                  ['-32000', 'BILLING_CAP_REACHED', 'Session budget exhausted. Create a new session or increase the budget.'],
                  ['-32000', 'TASK_NOT_FOUND', 'tasks/get or tasks/cancel called with an unknown task ID.'],
                  ['-32000', 'TASK_ALREADY_TERMINAL', 'tasks/cancel called on a completed/failed task.'],
                  ['-32000', 'PAYMENT_EXPIRED', 'x402 payment authorization expired before it was submitted.'],
                  ['-32000', 'PAYMENT_INVALID', 'x402 signature failed verification. Re-sign and resubmit.'],
                ].map(([code, msg, action]) => (
                  <tr key={`${code}-${msg}`} className="border-b border-neutral-200 last:border-0">
                    <td className="px-4 py-3 font-mono text-[12px] font-bold">{code}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-neutral-700">{msg}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <Callout variant="warn" title="Billing errors are not HTTP 402">
              <p className="text-sm text-neutral-700">
                When an agent hits a billing cap, P402 maps it to JSON-RPC error code{' '}
                <span className="font-mono">-32000</span> with message{' '}
                <span className="font-mono">BILLING_CAP_REACHED</span>. It does NOT return HTTP 402.
                This prevents orchestrators from misinterpreting it as an x402 payment request
                rather than a budget error.
              </p>
            </Callout>
          </div>
        </div>

        {/* ── WHAT'S NEXT ── */}
        <div className="border-t-2 border-black pt-16">
          <Callout variant="lime" title="Related docs">
            <ul className="space-y-3">
              {[
                { label: 'AP2 Mandates — signed spending authorizations for agents', href: '/docs/mandates' },
                { label: 'Fund with USDC — sign an EIP-3009 authorization', href: '/docs/guides/fund-usdc' },
                { label: 'Agent Marketplace (Bazaar) — discover x402-enabled services', href: '/docs/bazaar' },
                { label: 'Connect your agent — OpenClaw, Hermes, and generic frameworks', href: '/docs/guides/agents' },
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
