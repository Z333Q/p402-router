'use client';

import { useState } from 'react';

type CopyBlockProps = {
  title: string;
  code: string;
  secondaryTitle?: string;
  secondaryCode?: string;
};

export function CopyBlock({ title, code, secondaryTitle = 'Copy fetch', secondaryCode }: CopyBlockProps) {
  const [copied, setCopied] = useState<string>('');

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(''), 1200);
    } catch {
      setCopied('failed');
      setTimeout(() => setCopied(''), 1200);
    }
  }

  return (
    <div className="border-2 border-black">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black bg-neutral-100 p-2">
        <span className="text-xs font-black uppercase tracking-widest">{title}</span>
        <div className="flex items-center gap-2">
          <button onClick={() => copy(code, title)} className="px-2 py-1 border-2 border-black bg-white text-xs font-black uppercase hover:bg-primary">Copy cURL</button>
          {secondaryCode && (
            <button onClick={() => copy(secondaryCode, secondaryTitle)} className="px-2 py-1 border-2 border-black bg-white text-xs font-black uppercase hover:bg-primary">{secondaryTitle}</button>
          )}
          <span className="text-[10px] font-black uppercase text-cyan-600 min-w-[60px] text-right">{copied}</span>
        </div>
      </div>
      <pre className="bg-neutral-800 text-neutral-100 p-3 overflow-x-auto text-xs leading-6"><code>{code}</code></pre>
    </div>
  );
}
