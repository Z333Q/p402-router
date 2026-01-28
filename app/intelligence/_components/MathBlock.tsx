"use client";

import React from 'react';

interface MathBlockProps {
    formula: string;
    description?: string;
    label?: string;
}

export function MathBlock({ formula, description, label }: MathBlockProps) {
    return (
        <div className="my-10 border-y-2 border-black/10 py-8 text-center bg-white">
            <div className="font-serif text-3xl italic mb-4 tracking-wider">
                {formula}
            </div>
            {description && (
                <div className="text-sm font-mono text-neutral-500 max-w-md mx-auto">
                    {label && <span className="font-bold text-black mr-2">({label})</span>}
                    {description}
                </div>
            )}
        </div>
    );
}
