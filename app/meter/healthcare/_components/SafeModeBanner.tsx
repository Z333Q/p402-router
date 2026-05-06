'use client';

import { useEffect } from 'react';
import { useMeterStore } from '../_store/useMeterStore';

export function SafeModeBanner() {
  const { safeMode, setSafeMode } = useMeterStore();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('safe') === '1' || process.env.NEXT_PUBLIC_DEMO_MODE === 'safe') {
      setSafeMode(true);
    }
  }, [setSafeMode]);

  if (safeMode) {
    return (
      <div className="w-full bg-neutral-800 border-b border-neutral-700 px-4 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-neutral-600 uppercase tracking-widest">Mode:</span>
          <span className="text-[9px] font-mono font-bold text-warning uppercase tracking-wider">
            Proof Replay · Recorded Gemini stream · Real Arc tx references
          </span>
        </div>
        <button
          className="text-[9px] font-mono uppercase tracking-wider text-neutral-400 hover:text-info border border-neutral-700 hover:border-info px-2 py-0.5 transition-colors"
          onClick={() => setSafeMode(false)}
        >
          Switch to Live →
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-neutral-900 border-b border-neutral-800 px-4 py-1.5 flex items-center justify-end gap-3">
      <span className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider">
        No Gemini API key?
      </span>
      <button
        className="text-[9px] font-mono uppercase tracking-wider border border-neutral-700 text-neutral-500 hover:text-warning hover:border-warning px-2 py-0.5 transition-colors"
        onClick={() => setSafeMode(true)}
      >
        Proof Replay Mode
      </button>
    </div>
  );
}
