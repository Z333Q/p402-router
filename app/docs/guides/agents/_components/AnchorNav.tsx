'use client';

import { useState, useEffect } from 'react';

const ANCHORS = [
  { id: 'openclaw', label: 'OpenClaw' },
  { id: 'hermes-agent', label: 'Hermes Agent' },
  { id: 'any-framework', label: 'Any Framework' },
  { id: 'environment', label: 'Environment Setup' },
  { id: 'sessions', label: 'Session Lifecycle' },
];

export function AnchorNav() {
  const [activeId, setActiveId] = useState<string>(ANCHORS[0]?.id ?? '');

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    ANCHORS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            setActiveId(id);
          }
        },
        { rootMargin: '-15% 0px -65% 0px' }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach(o => o.disconnect());
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      // offset for sticky header + anchor nav
      const y = el.getBoundingClientRect().top + window.scrollY - 128;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="sticky top-16 z-40 bg-white border-b-2 border-black">
      <div className="max-w-[1200px] mx-auto px-0 flex items-center overflow-x-auto">
        {ANCHORS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => scrollTo(id)}
            className={`px-5 py-3 text-[11px] font-black uppercase tracking-wider whitespace-nowrap border-r-2 border-black last:border-r-0 transition-colors ${
              activeId === id
                ? 'bg-primary text-black'
                : 'bg-white text-black hover:bg-neutral-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
