'use client';
import React, { useState, useEffect } from 'react';
import { Card } from './ui';
import { Lightbulb, X } from 'lucide-react';
import { clsx } from 'clsx';

type ProTipProps = {
    id: string;
    text: string;
    className?: string;
};

export function ProTip({ id, text, className }: ProTipProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const isDismissed = localStorage.getItem(`tip_${id}`);
        if (!isDismissed) {
            setVisible(true);
        }
    }, [id]);

    const handleDismiss = () => {
        localStorage.setItem(`tip_${id}`, 'true');
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className={clsx(
            "bg-info/10 border-l-4 border-info p-4 flex gap-4 animate-in slide-in-from-left duration-500",
            className
        )}>
            <div className="text-info flex-shrink-0 pt-0.5">
                <Lightbulb size={20} />
            </div>
            <div className="flex-1">
                <div className="text-[10px] font-black uppercase tracking-widest text-info mb-1">Pro Tip</div>
                <div className="text-xs font-bold leading-relaxed text-black/80">
                    {text}
                </div>
            </div>
            <button
                onClick={handleDismiss}
                className="text-neutral-400 hover:text-black transition-colors flex-shrink-0"
            >
                <X size={16} />
            </button>
        </div>
    );
}
