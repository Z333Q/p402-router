'use client';

const STEPS = [
  {
    num: '1',
    title: 'Create',
    code: `curl -X POST https://p402.io/api/v2/sessions \\
  -H "Authorization: Bearer $P402_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"budget_usd": 5}'`,
  },
  {
    num: '2',
    title: 'Fund',
    code: `Pay USDC on Base
→ POST /api/v2/sessions/fund
  {
    "session_id": "sess_xxx",
    "amount": 5,
    "tx_hash": "0x..."
  }`,
  },
  {
    num: '3',
    title: 'Use',
    code: `{
  "messages": [...],
  "p402": {
    "session_id": "sess_xxx",
    "mode": "cost",
    "cache": true
  }
}`,
  },
  {
    num: '4',
    title: 'Monitor',
    code: `curl https://p402.io/api/v2/sessions/{id}/stats \\
  -H "Authorization: Bearer $P402_API_KEY"`,
  },
] as const;

export function SessionFlow() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-black border-2 border-black">
      {STEPS.map((step) => (
        <div key={step.num} className="bg-white p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-primary border-2 border-black flex items-center justify-center font-black text-sm shrink-0">
              {step.num}
            </div>
            <span className="font-black uppercase text-sm tracking-wider">{step.title}</span>
          </div>
          <pre className="font-mono text-xs text-neutral-700 overflow-x-auto whitespace-pre bg-neutral-50 border-2 border-neutral-200 p-3 leading-relaxed">
            {step.code}
          </pre>
        </div>
      ))}
    </div>
  );
}
