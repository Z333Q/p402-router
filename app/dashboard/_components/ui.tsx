/**
 * P402 UI Components
 * ===================
 * Neo-brutalist component library following P402 design system.
 * High contrast, thick borders, no shadows, minimal rounding.
 */

import React from 'react';

// =============================================================================
// INPUT
// =============================================================================

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    label?: string;
    onChange?: (value: string) => void;
}

export function Input({ label, className = '', onChange, ...props }: InputProps) {
    return (
        <div className={className}>
            {label && (
                <label className="text-xs font-bold uppercase text-neutral-500 block mb-2">
                    {label}
                </label>
            )}
            <input
                className="w-full h-11 px-3 border-2 border-black font-mono focus:outline-none focus:ring-2 focus:ring-[#22D3EE] focus:ring-offset-2"
                onChange={e => onChange?.(e.target.value)}
                {...props}
            />
        </div>
    );
}

// =============================================================================
// SELECT
// =============================================================================

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
    label?: string;
    options: { value: string; label: string }[];
    onChange?: (value: string) => void;
}

export function Select({ label, options, className = '', onChange, ...props }: SelectProps) {
    return (
        <div className={className}>
            {label && (
                <label className="text-xs font-bold uppercase text-neutral-500 block mb-2">
                    {label}
                </label>
            )}
            <select
                className="w-full h-11 px-3 border-2 border-black font-mono bg-white focus:outline-none focus:ring-2 focus:ring-[#22D3EE] focus:ring-offset-2"
                onChange={e => onChange?.(e.target.value)}
                {...props}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    );
}

// =============================================================================
// CARD
// =============================================================================

interface CardProps {
    title?: string;
    body?: string; // Legacy compat
    children: React.ReactNode;
    className?: string;
    action?: React.ReactNode;
}

export function Card({ title, body, children, className = '', action }: CardProps) {
    return (
        <div className={`bg-white border-2 border-black p-4 ${className}`}>
            {title && (
                <div className="flex justify-between items-center mb-4 pb-3 border-b-2 border-black">
                    <div>
                        <h2 className="text-xs font-extrabold uppercase tracking-wider">
                            {title}
                        </h2>
                        {body && <p className="text-[10px] font-bold text-neutral-400 uppercase mt-1">{body}</p>}
                    </div>
                    {action}
                </div>
            )}
            {children}
        </div>
    );
}

// =============================================================================
// STAT
// =============================================================================

interface StatProps {
    label: string;
    value: string | number;
    trend?: number;
    prefix?: string;
    suffix?: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string; // Add className
    subtext?: string; // Legacy compat
    helpText?: string; // Legacy compat
}

export function Stat({ label, value, trend, prefix = '', suffix = '', size = 'md', className = '', subtext, helpText }: StatProps) {
    const sizeClasses = {
        sm: 'text-lg',
        md: 'text-2xl',
        lg: 'text-4xl'
    };

    return (
        <div title={helpText} className={className}>
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                {label}
            </p>
            <div className="flex items-baseline gap-2">
                <span className={`font-extrabold ${sizeClasses[size]}`}>
                    {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
                </span>
                {trend !== undefined && (
                    <span className={`text-sm font-bold ${trend >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                        {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
                    </span>
                )}
            </div>
            {(subtext || helpText) && (
                <p className="text-[10px] font-bold text-neutral-400 uppercase mt-1">
                    {subtext || helpText}
                </p>
            )}
        </div>
    );
}

// =============================================================================
// BUTTON
// =============================================================================

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
}

export function Button({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    className = '',
    disabled,
    ...props
}: ButtonProps) {
    const baseStyles = 'font-extrabold uppercase tracking-wide border-2 border-black transition-transform duration-[80ms] ease-out';

    const variantStyles = {
        primary: 'bg-[#B6FF2E] text-black hover:translate-y-[-2px] active:translate-y-0 active:scale-[0.99]',
        secondary: 'bg-white text-black hover:translate-y-[-2px] active:translate-y-0 active:scale-[0.99]',
        ghost: 'bg-transparent text-black border-transparent hover:border-black',
        danger: 'bg-[#EF4444] text-white hover:translate-y-[-2px] active:translate-y-0 active:scale-[0.99]',
        dark: 'bg-black text-white hover:translate-y-[-2px] active:translate-y-0 active:scale-[0.99]'
    };

    const sizeStyles = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2.5 text-sm',
        lg: 'px-6 py-3 text-base'
    };

    const disabledStyles = (disabled || loading)
        ? 'bg-neutral-200 text-neutral-600 cursor-not-allowed hover:translate-y-0'
        : '';

    return (
        <button
            className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${disabledStyles} ${className}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <span className="flex items-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent animate-spin" />
                    Loading...
                </span>
            ) : children}
        </button>
    );
}

// =============================================================================
// ALERT
// =============================================================================

interface AlertProps {
    variant?: 'info' | 'success' | 'warning' | 'error';
    title?: string;
    children: React.ReactNode;
    className?: string;
    onDismiss?: () => void;
}

export function Alert({ variant = 'info', title, children, className = '', onDismiss }: AlertProps) {
    const variantStyles = {
        info: 'border-[#22D3EE] bg-[#22D3EE]/10',
        success: 'border-[#22C55E] bg-[#22C55E]/10',
        warning: 'border-[#F59E0B] bg-[#F59E0B]/10',
        error: 'border-[#EF4444] bg-[#EF4444]/10'
    };

    const icons = {
        info: 'ℹ',
        success: '✓',
        warning: '⚠',
        error: '✕'
    };

    return (
        <div className={`border-2 border-black ${variantStyles[variant]} p-4 ${className}`}>
            <div className="flex justify-between items-start">
                <div className="flex gap-3">
                    <span className="text-lg">{icons[variant]}</span>
                    <div>
                        {title && <p className="font-bold text-sm mb-1">{title}</p>}
                        <div className="text-sm">{children}</div>
                    </div>
                </div>
                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="text-neutral-500 hover:text-black"
                    >
                        ✕
                    </button>
                )}
            </div>
        </div>
    );
}

// =============================================================================
// EMPTY STATE
// =============================================================================

interface EmptyStateProps {
    title: string;
    body?: string;
    icon?: string;
    action?: React.ReactNode; // Legacy compat
    children?: React.ReactNode;
}

export function EmptyState({ title, body, icon = '📂', action, children }: EmptyStateProps) {
    return (
        <div className="text-center py-12 px-6 border-2 border-dashed border-neutral-300">
            <span className="text-4xl mb-4 block">{icon}</span>
            <h3 className="font-extrabold text-xl uppercase mb-2">{title}</h3>
            {body && <p className="text-neutral-500 text-sm mb-6">{body}</p>}
            {action && <div className="mb-4">{action}</div>}
            {children}
        </div>
    );
}

// =============================================================================
// ERROR STATE
// =============================================================================

interface ErrorStateProps {
    message?: string;
    title?: string; // Legacy compat
    body?: string; // Legacy compat
    action?: React.ReactNode; // Legacy compat
}

export function ErrorState({ message, title, body, action }: ErrorStateProps) {
    return (
        <div className="p-6 bg-[#EF4444]/10 border-2 border-[#EF4444] text-[#EF4444] text-center">
            <span className="text-2xl mb-2 block">⚠️</span>
            <h3 className="font-extrabold uppercase text-sm mb-1">{title || 'Error'}</h3>
            <p className="text-sm mb-4">{message || body}</p>
            {action && <div className="mt-2">{action}</div>}
        </div>
    );
}

// =============================================================================
// METRIC BOX
// =============================================================================

export function MetricBox({
    label,
    value,
    subvalue,
    subtext,
    helpText,
    accent,
    className = ''
}: {
    label: string,
    value: string | number,
    subvalue?: string,
    subtext?: string,
    helpText?: string,
    accent?: boolean,
    className?: string
}) {
    return (
        <div className={`p-4 border-2 border-black ${accent ? 'bg-[#B6FF2E]' : 'bg-white'} ${className}`} title={helpText}>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">{label}</p>
            <p className="text-2xl font-black">{value}</p>
            {(subvalue || subtext) && (
                <p className="text-[10px] font-bold text-neutral-500 uppercase mt-1">{subvalue || subtext}</p>
            )}
        </div>
    );
}

// =============================================================================
// PROGRESS BAR
// =============================================================================

interface ProgressBarProps {
    value: number;
    max?: number;
    label?: string;
    showValue?: boolean;
    variant?: 'default' | 'success' | 'warning' | 'danger';
    className?: string; // Add className
}

export function ProgressBar({
    value,
    max = 100,
    label,
    showValue = true,
    variant = 'default',
    className = ''
}: ProgressBarProps) {
    const percent = Math.min((value / max) * 100, 100);

    const variantColors = {
        default: 'bg-[#B6FF2E]',
        success: 'bg-[#22C55E]',
        warning: 'bg-[#F59E0B]',
        danger: 'bg-[#EF4444]'
    };

    return (
        <div className={className}>
            {(label || showValue) && (
                <div className="flex justify-between mb-1">
                    {label && <span className="text-xs font-bold uppercase">{label}</span>}
                    {showValue && <span className="text-xs font-mono">{percent.toFixed(1)}%</span>}
                </div>
            )}
            <div className="h-4 bg-neutral-100 border-2 border-black">
                <div
                    className={`h-full ${variantColors[variant]} transition-all duration-300`}
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    );
}

// =============================================================================
// STATUS DOT
// =============================================================================

interface StatusDotProps {
    status: 'healthy' | 'degraded' | 'down' | 'unknown';
    label?: string;
    pulse?: boolean;
    className?: string; // Add className
}

export function StatusDot({ status, label, pulse = true, className = '' }: StatusDotProps) {
    const statusColors = {
        healthy: 'bg-[#22C55E]',
        degraded: 'bg-[#F59E0B]',
        down: 'bg-[#EF4444]',
        unknown: 'bg-neutral-400'
    };

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <span className={`
                inline-block w-3 h-3 rounded-full ${statusColors[status]}
                ${pulse && status === 'healthy' ? 'animate-pulse' : ''}
            `} />
            {label && <span className="text-xs font-bold uppercase">{label}</span>}
        </div>
    );
}

// =============================================================================
// BADGE
// =============================================================================

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
    tone?: string; // For backward compat
    className?: string; // Add className
}

export function Badge({ children, variant = 'default', tone, className = '' }: BadgeProps) {
    const variantStyles = {
        default: 'bg-neutral-100 text-black',
        primary: 'bg-[#B6FF2E] text-black',
        success: 'bg-[#22C55E] text-white',
        warning: 'bg-[#F59E0B] text-black',
        danger: 'bg-[#EF4444] text-white'
    };

    // Map tone to variant styles if provided
    const styleKey = (tone as keyof typeof variantStyles) || variant;
    const finalStyle = variantStyles[styleKey] || variantStyles.default;

    return (
        <span className={`
            inline-block px-2 py-0.5 text-xs font-bold uppercase 
            border-2 border-black ${finalStyle} ${className}
        `}>
            {children}
        </span>
    );
}

// =============================================================================
// CODE BLOCK / CODE BOX
// =============================================================================

interface CodeBlockProps {
    code?: string;
    value?: any; // For backward compat with CodeBox
    title?: string;
    language?: string;
    showCopy?: boolean;
    className?: string;
}

export function CodeBlock({ code, value, title, language = 'json', showCopy = true, className = '' }: CodeBlockProps) {
    const [copied, setCopied] = React.useState(false);

    // Support both direct string 'code' and object 'value' (for CodeBox compatibility)
    const content = code || (value ? JSON.stringify(value, null, 2) : '');

    const handleCopy = async () => {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={`relative bg-[#141414] border-2 border-black ${className}`}>
            {title && (
                <div className="px-4 py-2 border-b-2 border-black bg-neutral-900 flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">{title}</span>
                </div>
            )}
            {showCopy && (
                <button
                    onClick={handleCopy}
                    className="absolute top-2 right-2 z-10 px-2 py-1 text-xs font-bold uppercase 
                               bg-neutral-700 text-neutral-200 hover:bg-neutral-600 border border-neutral-600"
                >
                    {copied ? 'Copied!' : 'Copy'}
                </button>
            )}
            <pre className="p-4 overflow-x-auto">
                <code className="text-sm font-mono text-[#F5F5F5]">{content}</code>
            </pre>
        </div>
    );
}

// Alias for backward compatibility
export const CodeBox = CodeBlock;

// =============================================================================
// TAB GROUP
// =============================================================================

interface TabGroupProps {
    tabs: { id: string; label: string; content: React.ReactNode }[];
    defaultTab?: string;
    className?: string; // Add className
}

export function TabGroup({ tabs, defaultTab, className = '' }: TabGroupProps) {
    const [activeTab, setActiveTab] = React.useState(defaultTab || tabs[0]?.id);

    return (
        <div className={className}>
            <div className="flex border-b-2 border-black">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            px-4 py-2 text-xs font-bold uppercase tracking-wide
                            border-2 border-black border-b-0 -mb-[2px]
                            ${activeTab === tab.id
                                ? 'bg-white'
                                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}
                        `}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className="border-2 border-t-0 border-black p-4 bg-white">
                {tabs.find(t => t.id === activeTab)?.content}
            </div>
        </div>
    );
}

// =============================================================================
// SKELETON
// =============================================================================

export function Skeleton({ className = '' }: { className?: string }) {
    return (
        <div className={`bg-neutral-200 animate-pulse ${className}`} />
    );
}

// =============================================================================
// LOADING BAR
// =============================================================================

export function LoadingBar() {
    return (
        <div className="h-1 w-full bg-neutral-200 overflow-hidden">
            <div className="h-full w-1/3 bg-[#22D3EE] animate-[loading_1s_ease-in-out_infinite]" />
        </div>
    );
}
