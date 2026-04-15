'use client';

import { useState, useCallback } from 'react';

export interface CodeTab {
  label: string;
  language: string;
  code: string;
  note?: string;
}

interface CodeTabsProps {
  tabs: CodeTab[];
  defaultTab?: number;
}

export function CodeTabs({ tabs, defaultTab = 0 }: CodeTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const code = tabs[activeTab]?.code ?? '';
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text
    }
  }, [tabs, activeTab]);

  const active = tabs[activeTab];

  return (
    <div className="border-2 border-black">
      {/* Tab bar */}
      <div className="flex border-b-2 border-black overflow-x-auto scrollbar-thin">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2.5 text-[11px] font-black uppercase tracking-wider whitespace-nowrap border-r-2 border-black last:border-r-0 transition-colors ${
              i === activeTab
                ? 'bg-primary text-black'
                : 'bg-white text-black hover:bg-neutral-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Note above code if provided */}
      {active?.note && (
        <div className="px-5 py-3 border-b-2 border-black bg-neutral-50 text-sm text-neutral-600 leading-relaxed">
          {active.note}
        </div>
      )}

      {/* Code block */}
      <div className="relative bg-[#141414]">
        <button
          onClick={handleCopy}
          aria-label="Copy code"
          className="absolute top-3 right-3 px-3 py-1 text-[10px] font-black uppercase tracking-wider border-2 border-neutral-600 text-neutral-300 hover:border-primary hover:text-primary transition-colors z-10"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <pre className="p-6 pr-20 text-[#F5F5F5] font-mono text-sm overflow-x-auto leading-relaxed whitespace-pre">
          <code>{active?.code ?? ''}</code>
        </pre>
      </div>
    </div>
  );
}
