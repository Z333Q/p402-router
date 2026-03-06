'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { Server, Store, ShieldCheck, Copy, CheckCircle2, ArrowRight, Key } from 'lucide-react';
import { generateApiKeyAction } from '@/lib/actions/settings';
import { completeOnboardingAction } from '@/lib/actions/onboarding';
import { useAuthState } from '@/lib/hooks/useAuthState';

// CDP hooks require browser context — disable SSR
const CDPEmailAuth = dynamic(
    () => import('@/components/auth/CDPEmailAuth').then(m => ({ default: m.CDPEmailAuth })),
    { ssr: false, loading: () => <div className="h-24 animate-pulse bg-neutral-100 border-2 border-neutral-200" /> }
);

type Role = 'builder' | 'publisher' | 'enterprise';
type Goal = 'test_routing' | 'publish_agent' | 'enterprise_trust';

interface RoleOption {
    role: Role;
    goal: Goal;
    icon: React.ReactNode;
    title: string;
    description: string;
    color: string;
}

const ROLES: RoleOption[] = [
    {
        role: 'builder',
        goal: 'test_routing',
        icon: <Server className="w-10 h-10 text-black" />,
        title: 'Build & Route',
        description: 'Route AI calls, reduce costs, and test the OpenAI-compatible endpoint.',
        color: 'var(--primary)',
    },
    {
        role: 'publisher',
        goal: 'publish_agent',
        icon: <Store className="w-10 h-10 text-black" />,
        title: 'Publish Agents',
        description: 'List agents on the Bazaar, verify your identity, and earn revenue.',
        color: 'var(--info)',
    },
    {
        role: 'enterprise',
        goal: 'enterprise_trust',
        icon: <ShieldCheck className="w-10 h-10 text-black" />,
        title: 'Govern Trust',
        description: 'Enforce spending policies, review audit logs, and manage agent safety.',
        color: 'var(--warning)',
    },
];

const CODE_SNIPPETS: Record<Role, { label: string; code: string }> = {
    builder: {
        label: 'Drop-in OpenAI replacement',
        code: `import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.P402_API_KEY,
  baseURL: 'https://p402.io/api/v2',
});

const response = await client.chat.completions.create({
  model: 'gpt-4-turbo', // routed to cheapest equivalent
  messages: [{ role: 'user', content: 'Hello' }],
});`,
    },
    publisher: {
        label: 'Register your agent',
        code: `curl -X POST https://p402.io/api/a2a/agents \\
  -H "Authorization: Bearer $P402_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "My Agent",
    "description": "What your agent does",
    "skills": [{ "id": "skill-1", "name": "Task" }]
  }'`,
    },
    enterprise: {
        label: 'Create a spending policy',
        code: `curl -X POST https://p402.io/api/v2/governance/policies \\
  -H "Authorization: Bearer $P402_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Production Limit",
    "max_spend_usd": 1000,
    "allowed_models": ["gemini-2.0-flash", "gpt-4o-mini"],
    "enforce": true
  }'`,
    },
};

const NEXT_STEPS: Record<Role, Array<{ label: string; desc: string; href: string }>> = {
    builder: [
        { label: 'Playground', desc: 'Test routing interactively', href: '/dashboard/playground' },
        { label: 'Live Traffic', desc: 'Watch requests route in real-time', href: '/dashboard/traffic' },
        { label: 'Cost Intelligence', desc: 'See your savings accumulate', href: '/dashboard' },
    ],
    publisher: [
        { label: 'Bazaar', desc: 'Create your first listing', href: '/dashboard/bazaar' },
        { label: 'Trust Layer', desc: 'Verify your agent identity', href: '/dashboard/trust' },
        { label: 'Analytics', desc: 'Track your agent revenue', href: '/dashboard' },
    ],
    enterprise: [
        { label: 'Policies', desc: 'Set spending rules', href: '/dashboard/policies' },
        { label: 'Mandates', desc: 'Create AP2 agent mandates', href: '/dashboard/mandates' },
        { label: 'Audit Log', desc: 'Review all decisions', href: '/dashboard/audit' },
    ],
};

// Step 0 is the Google wallet activation pre-step; steps 1–3 are the standard flow.
type OnboardingStep = 0 | 1 | 2 | 3;

// Total visible progress steps (not counting the conditional pre-step)
const TOTAL_STEPS = 3;

export default function OnboardingPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const { state: authState, isLoading: authLoading } = useAuthState();

    const [step, setStep] = useState<OnboardingStep>(1);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [keyCopied, setKeyCopied] = useState(false);
    const [keyError, setKeyError] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Determine if the Step 0 wallet activation pre-step should be shown.
    // Only for Google users (non-wallet.p402.io email) who have no wallet linked.
    const email = session?.user?.email ?? '';
    const isGoogleUser = email.length > 0 && !email.endsWith('@wallet.p402.io');
    const showWalletActivation = isGoogleUser && authState === 'identity_only' && !authLoading;

    // Jump to Step 0 once we know the user needs wallet activation (and haven't deferred)
    useEffect(() => {
        if (!authLoading && showWalletActivation) {
            const deferred = typeof window !== 'undefined'
                && localStorage.getItem('wallet_activation_deferred') === '1';
            if (!deferred) {
                setStep(0);
            }
        }
    }, [authLoading, showWalletActivation]);

    const handleRoleSelect = (option: RoleOption) => {
        setSelectedRole(option.role);
        setSelectedGoal(option.goal);
    };

    const handleContinueToStep2 = useCallback(async () => {
        if (!selectedRole || !selectedGoal) return;
        setIsGenerating(true);
        setKeyError(null);
        try {
            const fd = new FormData();
            fd.append('name', 'P402 API Key');
            const result = await generateApiKeyAction(null, fd);
            if (result.success && result.rawKey) {
                setApiKey(result.rawKey);
                if (typeof window !== 'undefined') {
                    localStorage.setItem('api_key_generated', '1');
                }
                setStep(2);
            } else {
                setKeyError(result.error ?? 'Failed to generate key. Please try again.');
            }
        } finally {
            setIsGenerating(false);
        }
    }, [selectedRole, selectedGoal]);

    const handleCopyKey = () => {
        if (!apiKey) return;
        navigator.clipboard.writeText(apiKey);
        setKeyCopied(true);
        setTimeout(() => setKeyCopied(false), 2000);
    };

    const handleEnterDashboard = useCallback(async () => {
        if (!selectedRole || !selectedGoal || isSubmitting) return;
        setIsSubmitting(true);
        const fd = new FormData();
        fd.append('role', selectedRole);
        fd.append('goal', selectedGoal);
        await completeOnboardingAction(fd);
        router.push('/dashboard');
    }, [selectedRole, selectedGoal, isSubmitting, router]);

    const snippet = selectedRole ? CODE_SNIPPETS[selectedRole] : null;
    const nextSteps = selectedRole ? NEXT_STEPS[selectedRole] : null;

    // Progress indicator only shows steps 1–3
    const progressStep = step === 0 ? 0 : step;

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 selection:bg-[var(--primary)] selection:text-black">

            {/* Logo */}
            <div className="mb-10 border-4 border-black bg-[var(--primary)] px-6 py-2 font-black text-3xl uppercase tracking-tighter text-black shadow-[6px_6px_0px_0px_#000]">
                P402.IO
            </div>

            {/* Progress indicator — hidden during pre-step */}
            {step > 0 && (
                <div className="flex items-center gap-2 mb-10">
                    {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((n) => (
                        <div key={n} className="flex items-center gap-2">
                            <div className={`w-7 h-7 border-2 border-black flex items-center justify-center font-black text-xs ${progressStep >= n ? 'bg-[var(--primary)] text-black' : 'bg-white text-neutral-400'}`}>
                                {progressStep > n ? <CheckCircle2 size={14} strokeWidth={3} /> : n}
                            </div>
                            {n < TOTAL_STEPS && <div className={`w-10 h-0.5 ${progressStep > n ? 'bg-black' : 'bg-neutral-200'}`} />}
                        </div>
                    ))}
                </div>
            )}

            <div className="max-w-4xl w-full bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">

                {/* ── STEP 0: Wallet Activation (Google users only) ── */}
                {step === 0 && (
                    <div className="p-8 md:p-12">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-[var(--warning)] border-2 border-black flex items-center justify-center font-black text-lg">⚡</div>
                            <h1 className="text-4xl font-black uppercase tracking-tight text-black">One more step.</h1>
                        </div>
                        <p className="font-mono text-neutral-500 mb-8 text-base">Activate Payments to use the AI Router.</p>

                        <div className="border-2 border-black bg-neutral-50 p-6 mb-8">
                            <p className="text-sm font-medium text-neutral-700 leading-relaxed mb-6">
                                Your account is ready. To make gasless USDC payments and use the AI Router,
                                you need a self-custody wallet — <span className="font-black text-black">created automatically in 30 seconds.</span>
                            </p>

                            <CDPEmailAuth
                                initialEmail={isGoogleUser ? email : undefined}
                                onSuccess={() => setStep(1)}
                            />
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t-2 border-neutral-200">
                            <p className="text-[11px] text-neutral-400 font-medium">
                                You can also add a wallet later from dashboard settings.
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    if (typeof window !== 'undefined') {
                                        localStorage.setItem('wallet_activation_deferred', '1');
                                    }
                                    setStep(1);
                                }}
                                className="text-[11px] font-black uppercase tracking-widest text-neutral-400 hover:text-black transition-colors whitespace-nowrap"
                            >
                                Skip — add later →
                            </button>
                        </div>
                    </div>
                )}

                {/* ── STEP 1: Role Selection ── */}
                {step === 1 && (
                    <div className="p-8 md:p-12">
                        <h1 className="text-4xl font-black uppercase tracking-tight mb-2 text-black">Welcome to the network.</h1>
                        <p className="font-mono text-neutral-500 mb-10 text-base">What brings you here?</p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                            {ROLES.map((option) => (
                                <button
                                    key={option.role}
                                    type="button"
                                    onClick={() => handleRoleSelect(option)}
                                    className={`text-left border-4 border-black p-6 flex flex-col gap-3 transition-all hover:-translate-y-1 ${
                                        selectedRole === option.role
                                            ? 'shadow-[4px_4px_0px_#000] -translate-y-1'
                                            : 'bg-neutral-50 hover:bg-neutral-100'
                                    }`}
                                    style={selectedRole === option.role ? { backgroundColor: option.color } : {}}
                                >
                                    {option.icon}
                                    <div>
                                        <h3 className="font-black text-lg uppercase text-black mb-1">{option.title}</h3>
                                        <p className="text-sm font-medium text-neutral-700 leading-relaxed">{option.description}</p>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {keyError && (
                            <p className="text-error font-bold text-sm mb-4 border-2 border-error px-4 py-2">{keyError}</p>
                        )}

                        <div className="flex justify-end pt-4 border-t-4 border-black">
                            <button
                                type="button"
                                onClick={handleContinueToStep2}
                                disabled={!selectedRole || isGenerating}
                                className="btn bg-black text-white font-black text-xl uppercase px-10 py-4 border-4 border-black hover:bg-neutral-800 hover:shadow-[6px_6px_0px_0px_var(--primary)] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-3"
                            >
                                {isGenerating ? 'Generating key...' : 'Continue'}
                                {!isGenerating && <ArrowRight size={20} />}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── STEP 2: API Key ── */}
                {step === 2 && (
                    <div className="p-8 md:p-12">
                        <div className="flex items-center gap-3 mb-2">
                            <Key size={24} className="text-[var(--primary)]" />
                            <h1 className="text-4xl font-black uppercase tracking-tight text-black">Your API key.</h1>
                        </div>
                        <p className="font-mono text-neutral-500 mb-8 text-base">
                            Save this now — it won't be shown again.
                        </p>

                        {/* Key display */}
                        <div className="border-4 border-black bg-[#0D0D0D] p-4 mb-6 flex items-center justify-between gap-4">
                            <code className="font-mono text-sm text-[var(--primary)] truncate flex-1">
                                {apiKey}
                            </code>
                            <button
                                type="button"
                                onClick={handleCopyKey}
                                className="shrink-0 border-2 border-[var(--primary)] px-3 py-1.5 font-black text-[10px] uppercase tracking-widest text-[var(--primary)] hover:bg-[var(--primary)] hover:text-black transition-colors flex items-center gap-2"
                            >
                                {keyCopied ? <><CheckCircle2 size={12} />Copied</> : <><Copy size={12} />Copy</>}
                            </button>
                        </div>

                        {/* Code snippet */}
                        {snippet && (
                            <div className="mb-8">
                                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">{snippet.label}</div>
                                <pre className="border-2 border-black bg-[#0D0D0D] p-5 font-mono text-xs text-neutral-300 overflow-x-auto leading-relaxed whitespace-pre">
                                    {snippet.code.replace('$P402_API_KEY', apiKey ?? '$P402_API_KEY')}
                                </pre>
                            </div>
                        )}

                        {selectedRole === 'builder' && (
                            <div className="border-2 border-dashed border-neutral-300 p-4 mb-6 bg-neutral-50">
                                <p className="text-[11px] text-neutral-600 font-medium leading-relaxed">
                                    <span className="font-black text-black">No wallet required to start routing.</span>{' '}
                                    Add payments when your app needs them — your agents can use CDP server wallets funded by your clients.
                                </p>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 border-t-4 border-black">
                            <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
                                You can generate more keys in Settings.
                            </p>
                            <button
                                type="button"
                                onClick={() => setStep(3)}
                                className="btn bg-[var(--primary)] text-black font-black text-xl uppercase px-10 py-4 border-4 border-black hover:bg-black hover:text-[var(--primary)] transition-all flex items-center gap-3"
                            >
                                I've saved my key <ArrowRight size={20} />
                            </button>
                        </div>
                    </div>
                )}

                {/* ── STEP 3: Orientation ── */}
                {step === 3 && nextSteps && (
                    <div className="p-8 md:p-12">
                        <h1 className="text-4xl font-black uppercase tracking-tight mb-2 text-black">You're ready.</h1>
                        <p className="font-mono text-neutral-500 mb-10 text-base">
                            {selectedRole === 'builder'
                                ? 'Start routing AI calls in minutes:'
                                : 'Here\'s where to start in your dashboard:'}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
                            {nextSteps.map((ns, i) => (
                                <a
                                    key={ns.href}
                                    href={ns.href}
                                    className="border-2 border-black p-6 bg-neutral-50 hover:bg-[var(--primary)] hover:-translate-y-1 transition-all group flex flex-col gap-2"
                                >
                                    <span className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest">Step {i + 1}</span>
                                    <h3 className="font-black text-lg uppercase text-black tracking-tight">{ns.label}</h3>
                                    <p className="text-sm text-neutral-600 font-medium leading-relaxed">{ns.desc}</p>
                                    <ArrowRight size={14} className="mt-auto text-black opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>
                            ))}
                        </div>

                        {/* Builder-specific: session API docs CTA */}
                        {selectedRole === 'builder' ? (
                            <div className="border-2 border-black bg-neutral-900 p-4 mb-8 flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className="w-1.5 h-1.5 bg-[var(--primary)] mt-1.5 shrink-0" />
                                    <p className="text-[11px] text-neutral-300 font-medium leading-relaxed">
                                        <span className="font-black text-white">Payment capability is optional for builders.</span>{' '}
                                        Your agents use CDP server wallets funded by your clients — no personal wallet needed.
                                    </p>
                                </div>
                                <a
                                    href="/docs/v2-sessions"
                                    className="shrink-0 h-7 px-3 bg-[var(--primary)] text-black font-black text-[10px] uppercase tracking-widest border border-black hover:bg-white transition-colors flex items-center whitespace-nowrap"
                                >
                                    Session API →
                                </a>
                            </div>
                        ) : (
                            /* Wallet funding — deferred, non-blocking */
                            <div className="border-2 border-dashed border-neutral-300 p-4 mb-8 flex items-start gap-3">
                                <div className="w-1.5 h-1.5 bg-neutral-400 mt-1.5 shrink-0" />
                                <p className="text-[11px] text-neutral-500 font-medium leading-relaxed">
                                    <span className="font-black text-black">Payments are pay-as-you-go.</span>{' '}
                                    You'll be prompted to fund your wallet (USDC on Base) when you make your first routed request.
                                    Minimum $0.01. Each AI call costs ~$0.001–0.01 depending on model.
                                </p>
                            </div>
                        )}

                        <div className="flex justify-end pt-4 border-t-4 border-black">
                            <button
                                type="button"
                                onClick={handleEnterDashboard}
                                disabled={isSubmitting}
                                className="btn bg-black text-white font-black text-xl uppercase px-10 py-4 border-4 border-black hover:bg-neutral-800 hover:shadow-[6px_6px_0px_0px_var(--primary)] transition-all disabled:opacity-40 flex items-center gap-3"
                            >
                                {isSubmitting ? 'Loading...' : 'Enter Dashboard'}
                                {!isSubmitting && <ArrowRight size={20} />}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
