/**
 * Built-in Tool Implementations — Phase 3
 *
 * web_search  — calls perplexity/sonar via OpenRouter for real-time web results
 * http_fetch  — fetches a URL and returns clean text (strips HTML, 50KB cap)
 */

import { getProviderRegistry } from '@/lib/ai-providers';
import type { ToolHandler } from './types';

// ── web_search ────────────────────────────────────────────────────────────────

export const webSearchHandler: ToolHandler = async (args, _config) => {
    const start = Date.now();
    const query = String(args.query ?? '').trim();

    if (!query) {
        return { success: false, output: null, text: '', latencyMs: 0, error: 'query is required' };
    }

    try {
        const registry = getProviderRegistry();
        const response = await registry.complete(
            {
                messages: [{ role: 'user' as const, content: query }],
                stream: false,
            },
            {
                mode: 'speed',
                // Prefer Perplexity (sonar) for live web results via OpenRouter
                preferProviders: ['perplexity', 'openrouter'],
                failover: { enabled: true, maxRetries: 1 },
            }
        );

        const rawText = response.choices[0]?.message?.content ?? '';
        const text = typeof rawText === 'string' ? rawText : JSON.stringify(rawText);

        return {
            success: true,
            output: { query, result: text, model: response.p402?.modelId },
            text,
            latencyMs: Date.now() - start,
        };
    } catch (err) {
        return {
            success: false,
            output: null,
            text: '',
            latencyMs: Date.now() - start,
            error: err instanceof Error ? err.message : String(err),
        };
    }
};

// ── http_fetch ────────────────────────────────────────────────────────────────

const MAX_BYTES = 51_200;      // 50KB
const DEFAULT_TIMEOUT_MS = 10_000;

export const httpFetchHandler: ToolHandler = async (args, config) => {
    const start = Date.now();
    const url = String(args.url ?? '').trim();
    const timeoutMs = Number(args.timeout_ms ?? config.timeout_ms ?? DEFAULT_TIMEOUT_MS);

    if (!url) {
        return { success: false, output: null, text: '', latencyMs: 0, error: 'url is required' };
    }

    // Reject non-http(s) URLs
    if (!/^https?:\/\//i.test(url)) {
        return { success: false, output: null, text: '', latencyMs: 0, error: 'Only http/https URLs are supported' };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'P402-Agent/1.0' },
        });

        clearTimeout(timer);

        if (!res.ok) {
            return {
                success: false,
                output: null,
                text: '',
                latencyMs: Date.now() - start,
                error: `HTTP ${res.status} ${res.statusText}`,
            };
        }

        const contentType = res.headers.get('content-type') ?? '';
        const rawBuffer = await res.arrayBuffer();
        const truncated = rawBuffer.byteLength > MAX_BYTES
            ? rawBuffer.slice(0, MAX_BYTES)
            : rawBuffer;
        const rawText = new TextDecoder('utf-8', { fatal: false }).decode(truncated);

        // Strip HTML tags if content-type is HTML
        const text = contentType.includes('text/html')
            ? stripHtml(rawText)
            : rawText;

        return {
            success: true,
            output: { url, text, truncated: rawBuffer.byteLength > MAX_BYTES },
            text,
            latencyMs: Date.now() - start,
        };
    } catch (err) {
        clearTimeout(timer);
        const isTimeout = err instanceof Error && err.name === 'AbortError';
        return {
            success: false,
            output: null,
            text: '',
            latencyMs: Date.now() - start,
            error: isTimeout ? `Fetch timed out after ${timeoutMs}ms` : (err instanceof Error ? err.message : String(err)),
        };
    }
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\s{2,}/g, ' ')
        .trim();
}
