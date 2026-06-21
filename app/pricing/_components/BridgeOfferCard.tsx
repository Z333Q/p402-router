import Link from 'next/link';
import { formatUsd, type BridgeOfferDefinition } from '@/lib/pricing/rate-card';

interface BridgeOfferCardProps {
    offer: BridgeOfferDefinition;
}

export function BridgeOfferCard({ offer }: BridgeOfferCardProps) {
    const priceLabel = offer.priceIsFloor
        ? `${formatUsd(offer.priceUsd)}+`
        : formatUsd(offer.priceUsd);

    return (
        <div className="border-2 border-black bg-white p-6 flex flex-col">
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-2">
                {offer.name}
            </h3>
            <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-black text-black tracking-tight">{priceLabel}</span>
                <span className="text-sm font-mono text-neutral-600">{offer.durationDays}-day engagement</span>
            </div>
            <p className="text-xs font-mono text-neutral-800 mb-4 leading-relaxed">{offer.scope}</p>
            <div className="mb-4 pb-4 border-b-2 border-neutral-200">
                <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-1">
                    Credit policy
                </div>
                <p className="text-xs font-mono text-neutral-700">{offer.creditPolicy}</p>
            </div>
            <p className="text-[11px] font-mono text-neutral-600 mb-4">{offer.audience}</p>
            <Link
                href={offer.ctaHref}
                className="inline-flex items-center justify-center h-11 px-6 bg-primary text-black font-black text-[11px] uppercase tracking-widest border-2 border-black hover:bg-black hover:text-primary transition-colors no-underline"
            >
                {offer.ctaLabel}
            </Link>
        </div>
    );
}
