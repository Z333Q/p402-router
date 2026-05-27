'use client';

import { useGovernance } from '../_store/useGovernance';
import type { HealthcarePersona } from '@/lib/meter/healthcare/types';

const TABS: { persona: HealthcarePersona; label: string; scenario: string }[] = [
  { persona: 'medicaid-mco', label: 'Medicaid MCO', scenario: 'Behavioral Health Inpatient Extension' },
  { persona: 'dual-eligible', label: 'Medicare D-SNP', scenario: 'Post-Acute SNF Extension' },
  { persona: 'marketplace', label: 'Marketplace', scenario: 'Outpatient Imaging PA' },
];

export function LineOfBusinessSelector() {
  const { persona, setPersona } = useGovernance();

  return (
    <section className="border-2 border-neutral-700 p-6 flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-neutral-50 uppercase tracking-tight">
          Line of Business
        </h2>
        <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
          Default: Medicaid MCO
        </span>
      </div>
      <div
        role="tablist"
        aria-label="Line of business selector"
        className="grid grid-cols-1 md:grid-cols-3 gap-3"
      >
        {TABS.map((t) => {
          const active = t.persona === persona;
          return (
            <button
              key={t.persona}
              role="tab"
              aria-selected={active}
              onClick={() => setPersona(t.persona)}
              className={`border-2 p-4 text-left flex flex-col gap-2 transition-none ${
                active
                  ? 'border-primary bg-neutral-800'
                  : 'border-neutral-700 hover:border-neutral-500'
              }`}
            >
              <div
                className={`text-xs font-mono uppercase tracking-widest ${
                  active ? 'text-primary' : 'text-neutral-500'
                }`}
              >
                {t.label}
              </div>
              <div className="text-sm font-bold text-neutral-50 leading-tight">{t.scenario}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
