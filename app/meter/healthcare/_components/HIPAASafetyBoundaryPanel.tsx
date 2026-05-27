'use client';

const ITEMS = [
  'Synthetic data only',
  'No real PHI upload',
  'No persistent PHI in browser state',
  'No real member identifiers',
  'No real provider identifiers',
  'No medical decision automation',
  'Audit log uses synthetic case IDs',
  'Production requires BAA, access controls, encryption, retention policy, and incident response controls',
];

export function HIPAASafetyBoundaryPanel() {
  return (
    <section className="border-2 border-warning p-6 flex flex-col gap-3 bg-neutral-900">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-warning uppercase tracking-tight">
          HIPAA and PHI Safety Boundary
        </h2>
        <span className="text-[10px] font-mono uppercase tracking-widest text-warning border border-warning px-2 py-0.5">
          Demo Mode
        </span>
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {ITEMS.map((i) => (
          <li
            key={i}
            className="border border-neutral-700 p-2 text-xs text-neutral-200 leading-snug"
          >
            ✓ {i}
          </li>
        ))}
      </ul>
      <p className="text-xs text-neutral-400 leading-relaxed">
        Production deployment must complete payer security review and legal review before
        processing PHI.
      </p>
    </section>
  );
}
