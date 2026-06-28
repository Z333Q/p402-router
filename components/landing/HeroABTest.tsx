'use client';

import { useEffect, useState } from 'react';
import { HeroEventTicker } from './HeroEventTicker';
import { HeroSystemStages } from './HeroSystemStages';

type Variant = 'A' | 'B';

const STORAGE_KEY = 'p402_hero_variant';

declare global {
    interface Window {
        gtag?: (command: 'event', eventName: string, params: Record<string, unknown>) => void;
    }
}

function pickVariant(): Variant {
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored === 'A' || stored === 'B') return stored;
    } catch {}
    const choice: Variant = Math.random() < 0.5 ? 'A' : 'B';
    try {
        window.localStorage.setItem(STORAGE_KEY, choice);
    } catch {}
    return choice;
}

export function HeroABTest() {
    const [variant, setVariant] = useState<Variant | null>(null);

    useEffect(() => {
        const v = pickVariant();
        setVariant(v);
        if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
            window.gtag('event', 'hero_variant_shown', { variant: v });
        }
    }, []);

    if (variant === null) {
        return <div className="border-2 border-black bg-neutral-950 h-full min-h-[440px]" aria-hidden />;
    }

    return (
        <div data-hero-variant={variant} className="h-full">
            {variant === 'A' ? <HeroEventTicker /> : <HeroSystemStages />}
        </div>
    );
}
