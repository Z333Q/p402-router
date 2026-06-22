'use client';

/**
 * 3AZ-2-C — Onboarding Stage B (client).
 *
 * Auto-generates an API key on mount, displays it once, surfaces a
 * language-toggleable drop-in code snippet, and routes to /dashboard
 * via completeOnboardingAction on either CTA.
 *
 * Privacy / V5 contract:
 *   - No "wallet", "USDC", "Coinbase", "Base", "gasless", "permit",
 *     "self-custody", or "x402" copy on this page. Asserted by
 *     source-shape test in __tests__/key-page.shape.test.ts.
 *   - The raw API key is shown once in the DOM and then forgotten
 *     by React state. It is never written to localStorage or
 *     posted to a non-P402 origin.
 *
 * Funnel emit:
 *   - funnel.api_key_issued fires (fire-and-forget) once a key has
 *     been generated. Failure to emit does not block the user.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, CheckCircle2, ArrowRight } from 'lucide-react';
import { generateApiKeyAction } from '@/lib/actions/settings';
import { completeOnboardingAction } from '@/lib/actions/onboarding';

type Lang = 'typescript' | 'python' | 'curl';

const SNIPPETS: Record<Lang, { label: string; code: string }> = {
    typescript: {
        label: 'TypeScript',
        code: `import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.P402_API_KEY,
  baseURL: 'https://p402.io/api/v2',
});

const response = await client.chat.completions.create({
  model: 'gpt-4-turbo',
  messages: [{ role: 'user', content: 'Hello' }],
});`,
    },
    python: {
        label: 'Python',
        code: `from openai import OpenAI
import os

client = OpenAI(
    api_key=os.environ['P402_API_KEY'],
    base_url='https://p402.io/api/v2',
)

response = client.chat.completions.create(
    model='gpt-4-turbo',
    messages=[{'role': 'user', 'content': 'Hello'}],
)`,
    },
    curl: {
        label: 'curl',
        code: `curl https://p402.io/api/v2/chat/completions \\
  -H "Authorization: Bearer $P402_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4-turbo",
    "messages": [{ "role": "user", "content": "Hello" }]
  }'`,
    },
};

const KEY_PLACEHOLDER = '••••••••••••••••••••••••••••••••';

export function OnboardingKeyClient() {
    const router = useRouter();
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [lang, setLang] = useState<Lang>('typescript');
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const requestedRef = useRef(false);

    useEffect(() => {
        // Generate exactly once per mount. The strict-mode double-fire
        // in dev is guarded by requestedRef.
        if (requestedRef.current) return;
        requestedRef.current = true;

        let cancelled = false;
        (async () => {
            try {
                const fd = new FormData();
                fd.append('name', 'P402 API Key');
                const result = await generateApiKeyAction(null, fd);
                if (cancelled) return;
                if (result.success && result.rawKey) {
                    setApiKey(result.rawKey);
                    // Fire-and-forget funnel emit; no PII in properties.
                    fetch('/api/v1/funnel/event', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({
                            eventName: 'funnel.api_key_issued',
                            properties: { stage: 'B' },
                        }),
                    }).catch(() => { /* fire-and-forget */ });
                } else {
                    setError(result.error ?? 'Failed to generate key. Try again from Settings.');
                }
            } catch {
                if (!cancelled) {
                    setError('Failed to generate key. Try again from Settings.');
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleCopy = useCallback(() => {
        if (!apiKey) return;
        navigator.clipboard.writeText(apiKey);
        setCopied(true);
        const timer = setTimeout(() => setCopied(false), 2000);
        return () => clearTimeout(timer);
    }, [apiKey]);

    const handleEnter = useCallback(async () => {
        if (submitting) return;
        setSubmitting(true);
        const fd = new FormData();
        // No goal passed: completeOnboardingAction falls through to
        // /dashboard via server-side redirect(). We deliberately do NOT
        // wrap this in try/catch -- doing so intercepts the
        // NEXT_REDIRECT signal that Server Actions use to navigate, and
        // the user gets stuck on Stage B (regression seen on ccb25c7).
        // router.push below is a defensive fallback for the unusual
        // case where the action returns without redirecting.
        await completeOnboardingAction(fd);
        router.push('/dashboard');
    }, [submitting, router]);

    const snippet = SNIPPETS[lang];
    const keyDisplay = apiKey ?? KEY_PLACEHOLDER;
    const codeRendered = snippet.code.replace('$P402_API_KEY', apiKey ?? '$P402_API_KEY');

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 selection:bg-[var(--primary)] selection:text-black">
            <div className="mb-10 border-4 border-black bg-[var(--primary)] px-6 py-2 font-black text-3xl uppercase tracking-tighter text-black shadow-[6px_6px_0px_0px_#000]">
                P402.IO
            </div>

            <div className="max-w-4xl w-full bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-8 md:p-12">
                <h1 className="text-4xl font-black uppercase tracking-tight text-black">
                    Your API key.
                </h1>
                <p className="font-mono text-neutral-500 mt-2 text-base">
                    Save this now. It won&apos;t be shown again.
                </p>

                {/* Key display */}
                <div className="border-4 border-black bg-[#0D0D0D] p-4 mt-8 mb-6 flex items-center justify-between gap-4">
                    <code className="font-mono text-sm text-[var(--primary)] truncate flex-1">
                        {keyDisplay}
                    </code>
                    <button
                        type="button"
                        onClick={handleCopy}
                        disabled={!apiKey}
                        className="shrink-0 border-2 border-[var(--primary)] px-3 py-1.5 font-black text-[10px] uppercase tracking-widest text-[var(--primary)] hover:bg-[var(--primary)] hover:text-black transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {copied ? (
                            <>
                                <CheckCircle2 size={12} />
                                Copied
                            </>
                        ) : (
                            <>
                                <Copy size={12} />
                                Copy
                            </>
                        )}
                    </button>
                </div>

                {error && (
                    <p className="font-bold text-sm mb-4 border-2 border-error text-error px-4 py-2">
                        {error}
                    </p>
                )}

                {/* Language toggle */}
                <div className="flex items-center gap-2 mb-3">
                    {(Object.keys(SNIPPETS) as Lang[]).map((l) => (
                        <button
                            key={l}
                            type="button"
                            onClick={() => setLang(l)}
                            className={`px-3 py-1 border-2 border-black text-[10px] font-black uppercase tracking-widest ${
                                lang === l
                                    ? 'bg-[var(--primary)] text-black'
                                    : 'bg-white text-neutral-600 hover:bg-neutral-100'
                            }`}
                            aria-pressed={lang === l}
                        >
                            {SNIPPETS[l].label}
                        </button>
                    ))}
                </div>

                {/* Code snippet */}
                <pre className="border-2 border-black bg-[#0D0D0D] p-5 font-mono text-xs text-neutral-300 overflow-x-auto leading-relaxed whitespace-pre mb-8">
                    {codeRendered}
                </pre>

                <div className="flex flex-col-reverse sm:flex-row gap-4 items-center justify-between pt-4 border-t-4 border-black">
                    <button
                        type="button"
                        onClick={handleEnter}
                        disabled={submitting}
                        className="text-[11px] font-black uppercase tracking-widest text-neutral-500 hover:text-black transition-colors underline disabled:opacity-40"
                    >
                        Skip and show me the dashboard
                    </button>
                    <button
                        type="button"
                        onClick={handleEnter}
                        disabled={submitting}
                        className="inline-flex items-center justify-center h-12 px-8 bg-black border-2 border-black text-white font-black text-[11px] uppercase tracking-widest hover:bg-[var(--primary)] hover:text-black transition-colors disabled:opacity-40 gap-2"
                    >
                        {submitting ? (
                            'Loading...'
                        ) : (
                            <>
                                Got it. Enter dashboard
                                <ArrowRight size={14} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
