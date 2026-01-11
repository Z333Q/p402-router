'use client';
import React from 'react'
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for merging tailwind classes with standard clsx
 */
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// ============================================
// BUTTONS
// ============================================
type ButtonProps = {
    children: React.ReactNode
    onClick?: () => void
    variant?: 'primary' | 'secondary' | 'dark'
    disabled?: boolean
    type?: 'button' | 'submit'
    className?: string
}

export function Button({ children, onClick, variant = 'primary', disabled, type = 'button', className }: ButtonProps) {
    const variants = {
        primary: 'bg-primary text-black hover:bg-primary-hover',
        secondary: 'bg-white text-black hover:bg-neutral-50',
        dark: 'bg-neutral-800 text-neutral-50 hover:bg-neutral-900',
    }

    const disabledClasses = 'bg-neutral-200 text-neutral-400 border-neutral-300 cursor-not-allowed transform-none'

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'inline-flex items-center justify-center gap-2 px-4 py-2.5',
                'font-bold text-sm uppercase border-2 border-black transition-transform active:translate-y-0 hover:-translate-y-0.5',
                variants[variant],
                disabled && disabledClasses,
                className
            )}
        >
            {children}
        </button>
    )
}

// ============================================
// INPUTS
// ============================================
type InputProps = {
    value: string
    onChange: (v: string) => void
    placeholder?: string
    label?: string
    type?: string
    className?: string
}

export function Input({ value, onChange, placeholder, label, type = 'text', className }: InputProps) {
    return (
        <div className={cn("space-y-2", className)}>
            {label && <label className="text-xs font-bold uppercase tracking-wider text-neutral-600 block">{label}</label>}
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full h-11 px-3 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-shadow"
            />
        </div>
    )
}

// ============================================
// SELECT
// ============================================
type SelectProps = {
    value: string
    onChange: (v: string) => void
    options: { value: string; label: string }[]
    label?: string
    className?: string
}

export function Select({ value, onChange, options, label, className }: SelectProps) {
    return (
        <div className={cn("space-y-2", className)}>
            {label && <label className="text-xs font-bold uppercase tracking-wider text-neutral-600 block">{label}</label>}
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full h-11 px-3 border-2 border-black bg-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
            >
                {options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
        </div>
    )
}

// ============================================
// BADGES
// ============================================
type BadgeProps = {
    children: React.ReactNode
    tone?: 'ok' | 'warn' | 'bad' | 'neutral' | 'info'
    className?: string
}

export function Badge({ children, tone = 'neutral', className }: BadgeProps) {
    const tones = {
        ok: 'bg-success text-black',
        warn: 'bg-warn text-black',
        bad: 'bg-error text-white',
        info: 'bg-info text-black',
        neutral: 'bg-neutral-200 text-neutral-700',
    }

    return (
        <span className={cn(
            'inline-flex items-center px-2 py-1 text-[10px] font-extrabold uppercase border-2 border-black',
            tones[tone],
            className
        )}>
            {children}
        </span>
    )
}

// ============================================
// CARDS
// ============================================
type CardProps = {
    children: React.ReactNode
    title?: string
    body?: string
    className?: string
}

export function Card({ children, title, body, className }: CardProps) {
    return (
        <div className={cn('bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]', className)}>
            {title && (
                <div className="font-extrabold uppercase text-xs tracking-widest mb-1 text-black">
                    {title}
                </div>
            )}
            {body && <div className="text-sm text-neutral-500 mb-6">{body}</div>}
            {children}
        </div>
    )
}

// ============================================
// CODE BOX
// ============================================
type CodeBoxProps = {
    title: string
    value: unknown
    className?: string
}

export function CodeBox({ title, value, className }: CodeBoxProps) {
    const json = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
    const copyToClipboard = () => {
        navigator.clipboard.writeText(json)
        // Potential for a toast here
    }

    return (
        <div className={cn("bg-neutral-100 border-2 border-black p-4 relative font-mono text-xs", className)}>
            <div className="flex justify-between items-center mb-4">
                <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{title}</div>
                <button
                    onClick={copyToClipboard}
                    className="px-2 py-1 bg-neutral-800 text-neutral-100 border border-black text-[10px] font-bold uppercase hover:bg-black transition-colors"
                >
                    Copy
                </button>
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap leading-relaxed text-black">
                {json}
            </pre>
        </div>
    )
}

// ============================================
// EMPTY STATE
// ============================================
type EmptyStateProps = {
    title: string
    body: string
    action?: React.ReactNode
}

export function EmptyState({ title, body, action }: EmptyStateProps) {
    return (
        <div className="text-center py-16 px-6">
            <div className="font-extrabold uppercase text-lg mb-2 tracking-tight">{title}</div>
            <div className="text-sm text-neutral-500 mb-8 max-w-sm mx-auto">{body}</div>
            {action && <div className="flex justify-center">{action}</div>}
        </div>
    )
}

// ============================================
// ERROR STATE
// ============================================
type ErrorStateProps = {
    title: string
    body: string
    action?: React.ReactNode
}

export function ErrorState({ title, body, action }: ErrorStateProps) {
    return (
        <div className="p-8 bg-error/10 border-2 border-error space-y-4">
            <div className="font-extrabold uppercase text-error tracking-tight">{title}</div>
            <div className="text-sm text-error/80 max-w-lg">{body}</div>
            {action && <div>{action}</div>}
        </div>
    )
}
// ============================================
// METRICS
// ============================================
type MetricBoxProps = {
    label: string
    value: string
    subtext: string
    accent?: boolean
    helpText?: string
    className?: string
}

export function MetricBox({ label, value, subtext, accent, helpText, className }: MetricBoxProps) {
    return (
        <div className={cn(
            "p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between h-40 transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] cursor-help group relative overflow-hidden",
            accent ? "bg-primary text-black" : "bg-white text-black",
            className
        )}>
            {/* Scanline effect on hover */}
            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none animate-scanline" />

            <div className="relative z-10 font-sans">
                <div className={cn("text-[10px] font-black uppercase tracking-widest flex items-center justify-between", accent ? "text-black/60" : "text-neutral-400")}>
                    {label}
                    {accent && <div className="w-2 h-2 rounded-full bg-black animate-pulse" />}
                </div>
                <div className="text-3xl font-black tracking-tighter mt-1">{value}</div>
            </div>

            <div className="relative z-10 space-y-1 mt-auto">
                <div className={cn("text-[10px] font-bold uppercase", accent ? "text-black/40" : "text-neutral-500")}>
                    {subtext}
                </div>
                {helpText && (
                    <div className="text-[9px] font-medium opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-0 left-0 right-0 italic pointer-events-none">
                        {helpText}
                    </div>
                )}
            </div>
        </div>
    )
}
// ============================================
// SKELETON
// ============================================
export function Skeleton({ className }: { className?: string }) {
    return (
        <div className={cn(
            "bg-neutral-200 animate-pulse border-2 border-black/5",
            className
        )} />
    )
}
