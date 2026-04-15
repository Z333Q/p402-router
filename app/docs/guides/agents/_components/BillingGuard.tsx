const LAYERS = [
  { n: 1, desc: 'Rate limit (1,000 req/hr)' },
  { n: 2, desc: 'Daily circuit breaker ($1,000/day)' },
  { n: 3, desc: 'Concurrency cap (10 simultaneous)' },
  { n: 4, desc: 'Anomaly detection (Z-score >= 3.0)' },
  { n: 5, desc: 'Per-request cap ($50 max)' },
  { n: 6, desc: 'Atomic budget reservation (5-min TTL)' },
];

export function BillingGuard() {
  return (
    <div className="border-2 border-black">
      {LAYERS.map((layer, i) => (
        <div
          key={layer.n}
          className={`flex items-center gap-4 px-4 py-3 ${
            i < LAYERS.length - 1 ? 'border-b-2 border-black' : ''
          }`}
        >
          <span className="w-7 h-7 bg-primary border-2 border-black flex items-center justify-center font-black text-xs shrink-0">
            {layer.n}
          </span>
          <span className="text-sm font-mono text-neutral-800">{layer.desc}</span>
        </div>
      ))}
    </div>
  );
}
