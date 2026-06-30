'use client';

import React from 'react';
import { PlanEventMeter } from '../_components/PlanEventMeter';

export default function PlanPage() {
    return (
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="mb-6">
                <h1 className="text-2xl font-black uppercase tracking-tight">Plan and Usage</h1>
                <p className="text-sm text-neutral-500 mt-1 font-mono">
                    Read-only view of plan limits, current month events, retention, and upgrade context.
                </p>
            </div>
            <PlanEventMeter />
        </div>
    );
}
