'use client';

export function SafeModeBanner() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'safe') return null;

  return (
    <div className="w-full bg-warning text-neutral-900 text-xs font-mono font-bold uppercase px-4 py-2 text-center border-b-2 border-neutral-900 tracking-wider">
      SAFE MODE. LIVE UI, RECORDED ECONOMIC EVENTS, REAL ARCSCAN PROOF.
    </div>
  );
}
