'use client';
/**
 * Slice 3B — Control filter bar. Same URL-driven pattern as Monitor's
 * FilterBar; only the labels and the underlying response endpoint differ.
 */

import React from 'react';

import { Button, Input } from '../../_components/ui';

export interface ControlFilterValues {
    since: string;
    until: string;
    department_id: string;
    employee_id: string;
    workflow_id: string;
    customer_id: string;
    feature_id: string;
    provider: string;
    model_used: string;
}

export const EMPTY_FILTERS: ControlFilterValues = {
    since: '',
    until: '',
    department_id: '',
    employee_id: '',
    workflow_id: '',
    customer_id: '',
    feature_id: '',
    provider: '',
    model_used: '',
};

export function buildControlQs(filters: ControlFilterValues): string {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
        if (typeof v === 'string' && v.length > 0) u.set(k, v);
    }
    const s = u.toString();
    return s ? `?${s}` : '';
}

interface FilterBarProps {
    value: ControlFilterValues;
    onChange: (next: ControlFilterValues) => void;
    onApply: () => void;
    onReset: () => void;
    isFetching?: boolean;
}

export function FilterBar({ value, onChange, onApply, onReset, isFetching }: FilterBarProps) {
    const set = (k: keyof ControlFilterValues) => (v: string) =>
        onChange({ ...value, [k]: v });

    return (
        <div className="bg-white border-2 border-black p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Input label="Since (ISO)" value={value.since} placeholder="2026-05-06T00:00:00Z" onChange={set('since')} />
                <Input label="Until (ISO)" value={value.until} placeholder="2026-06-05T00:00:00Z" onChange={set('until')} />
                <Input label="Department" value={value.department_id} onChange={set('department_id')} />
                <Input label="Employee" value={value.employee_id} onChange={set('employee_id')} />
                <Input label="Workflow" value={value.workflow_id} onChange={set('workflow_id')} />
                <Input label="Customer" value={value.customer_id} onChange={set('customer_id')} />
                <Input label="Feature" value={value.feature_id} onChange={set('feature_id')} />
                <Input label="Provider" value={value.provider} onChange={set('provider')} />
                <Input label="Model (used)" value={value.model_used} onChange={set('model_used')} />
            </div>
            <div className="flex justify-end gap-2 mt-4">
                <Button variant="ghost" size="sm" onClick={onReset}>Reset</Button>
                <Button variant="primary" size="sm" onClick={onApply} loading={isFetching}>Apply</Button>
            </div>
        </div>
    );
}
