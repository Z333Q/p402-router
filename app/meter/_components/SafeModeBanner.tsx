'use client';

import { useEffect } from 'react';
import { useMeterStore } from '../_store/useMeterStore';

export function SafeModeBanner() {
  const { safeMode, setSafeMode } = useMeterStore();

  // Activate safe mode from URL param (?safe=1) or env var at runtime
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('safe') === '1' || process.env.NEXT_PUBLIC_DEMO_MODE === 'safe') {
      setSafeMode(true);
    }
  }, [setSafeMode]);

  if (safeMode) {
    return (
      <div className="w-full bg-warning text-neutral-900 text-xs font-mono font-bold uppercase px-4 py-2 text-center border-b-2 border-neutral-900 tracking-wider flex items-center justify-center gap-4">
        <span>⚡ SAFE MODE — RECORDED STREAM · REAL ARC TX REFS · NO API KEYS NEEDED</span>
        <button
          className="text-[10px] border-2 border-neutral-900 px-2 py-0.5 hover:bg-neutral-900 hover:text-warning transition-colors"
          onClick={() => setSafeMode(false)}
        >
          DISABLE
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-neutral-800 border-b border-neutral-700 px-4 py-1.5 flex items-center justify-end gap-3">
      <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
        No Gemini API key?
      </span>
      <button
        className="text-[10px] font-mono font-bold uppercase tracking-wider border border-warning text-warning px-3 py-1 hover:bg-warning hover:text-neutral-900 transition-colors"
        onClick={() => setSafeMode(true)}
      >
        Enable Safe Mode
      </button>
    </div>
  );
}
