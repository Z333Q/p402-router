'use client';

import React from 'react';
import Link from 'next/link';
import { SiOpenai, SiAnthropic, SiGoogle, SiMeta, SiPerplexity } from 'react-icons/si';
import type { IconType } from 'react-icons';

type Provider = {
    name: string;
    short: string;
    Icon?: IconType;
};

const PROVIDERS: Provider[] = [
    { name: 'OpenAI',       short: 'OAI',  Icon: SiOpenai },
    { name: 'Anthropic',    short: 'ANT',  Icon: SiAnthropic },
    { name: 'Google',       short: 'GGL',  Icon: SiGoogle },
    { name: 'Meta',         short: 'META', Icon: SiMeta },
    { name: 'Mistral',      short: 'MST' },
    { name: 'OpenRouter',   short: 'OR' },
    { name: 'Groq',         short: 'GRQ' },
    { name: 'Cohere',       short: 'COH' },
    { name: 'Together',     short: 'TOG' },
    { name: 'Fireworks',    short: 'FW' },
    { name: 'Perplexity',   short: 'PPX',  Icon: SiPerplexity },
    { name: 'AI21',         short: 'A21' },
    { name: 'DeepSeek',     short: 'DS' },
];

function Monogram({ short }: { short: string }) {
    return (
        <span className="inline-flex items-center justify-center w-4 h-4 border border-neutral-700 text-[8px] font-black tracking-tighter text-neutral-600 shrink-0">
            {short.slice(0, 2)}
        </span>
    );
}

export function WorksWithStrip() {
    return (
        <section className="py-4 bg-black border-b border-neutral-800">
            <div className="container mx-auto px-6 max-w-7xl">
                <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-600 whitespace-nowrap shrink-0">
                        Works with
                    </span>
                    <div className="flex flex-wrap gap-x-5 gap-y-2 items-center flex-1">
                        {PROVIDERS.map(({ name, short, Icon }) => (
                            <span
                                key={name}
                                className="flex items-center gap-1.5 text-neutral-500 hover:text-neutral-200 transition-colors cursor-default group"
                                title={name}
                            >
                                {Icon ? (
                                    <Icon className="w-3.5 h-3.5 shrink-0 text-neutral-600 group-hover:text-neutral-300 transition-colors" />
                                ) : (
                                    <Monogram short={short} />
                                )}
                                <span className="text-[11px] font-bold">{name}</span>
                            </span>
                        ))}
                    </div>
                    <Link
                        href="/providers"
                        className="text-[10px] font-black uppercase tracking-widest text-neutral-600 hover:text-primary transition-colors whitespace-nowrap shrink-0"
                    >
                        All providers →
                    </Link>
                </div>
                <p className="text-[11px] text-neutral-700 mt-2 font-medium">
                    Route across providers without rewriting clients. Add provider-native options through extensions.
                </p>
            </div>
        </section>
    );
}
