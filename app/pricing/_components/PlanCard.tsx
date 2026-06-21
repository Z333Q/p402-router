import Link from 'next/link';
import { Check } from 'lucide-react';
import {
    formatEventAllowance,
    formatUsd,
    type PlanDefinition,
} from '@/lib/pricing/rate-card';

interface PlanCardProps {
    plan: PlanDefinition;
    highlight?: boolean;
}

export function PlanCard({ plan, highlight = false }: PlanCardProps) {
    const isFree = plan.annualPriceUsd === 0;
    const isCustom = plan.annualPriceUsd === null;
    const isAnnualOnly = plan.monthlyPriceMonthlyUsd === null && plan.monthlyPriceAnnualUsd !== null;
    const priceLabel = isFree
        ? '$0'
        : isCustom
            ? 'Custom'
            : formatUsd(plan.monthlyPriceAnnualUsd);
    const priceSuffix = isFree
        ? ''
        : isCustom
            ? ''
            : isAnnualOnly
                ? '/mo annual'
                : '/mo';
    const priceFootnote = isCustom
        ? `from $${(60_000).toLocaleString('en-US')} ARR`
        : isAnnualOnly
            ? 'annual contract only'
            : null;

    const borderClass = highlight ? 'border-2 border-primary' : 'border-2 border-neutral-200';
    const bgClass = highlight ? 'bg-primary/5' : 'bg-white';

    return (
        <div className={`${borderClass} ${bgClass} p-6 flex flex-col h-full`}>
            <div className="mb-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-4xl font-black text-black tracking-tight">{priceLabel}</span>
                    {priceSuffix && <span className="text-sm font-mono text-neutral-600">{priceSuffix}</span>}
                </div>
                {priceFootnote && (
                    <p className="mt-1 text-xs font-mono text-neutral-500">{priceFootnote}</p>
                )}
            </div>
            <div className="mb-4 pb-4 border-b-2 border-neutral-200">
                <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-1">
                    Included events
                </div>
                <div className="text-lg font-black text-black">
                    {formatEventAllowance(plan.includedEventsPerMonth)}
                    {plan.includedEventsPerMonth !== null && (
                        <span className="text-sm font-mono text-neutral-500 ml-1">/ month</span>
                    )}
                </div>
                {plan.retentionDays !== null && (
                    <div className="mt-2 text-[11px] font-mono text-neutral-600">
                        Retention: {plan.retentionDays >= 365
                            ? `${Math.round(plan.retentionDays / 365)} year${plan.retentionDays >= 730 ? 's' : ''}`
                            : `${plan.retentionDays} days`}
                    </div>
                )}
                {plan.overageUsdPer1kEvents !== null && (
                    <div className="mt-1 text-[11px] font-mono text-neutral-600">
                        Overage: ${plan.overageUsdPer1kEvents.toFixed(2)} per 1k events
                    </div>
                )}
            </div>
            <p className="text-xs font-mono text-neutral-700 mb-4">{plan.audience}</p>
            <ul className="space-y-2 mb-6 flex-1">
                {plan.inclusions.map((line) => (
                    <li key={line} className="flex items-start gap-2 text-xs font-mono text-neutral-800">
                        <Check className="w-3 h-3 mt-0.5 shrink-0 text-primary" aria-hidden />
                        <span>{line}</span>
                    </li>
                ))}
            </ul>
            <Link
                href={plan.ctaHref}
                className="inline-flex items-center justify-center h-11 px-6 bg-black border-2 border-black text-white font-black text-[11px] uppercase tracking-widest hover:bg-primary hover:text-black transition-colors no-underline"
            >
                {plan.ctaLabel}
            </Link>
        </div>
    );
}
