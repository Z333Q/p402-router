/**
 * P402 AI Providers Module
 * ========================
 * Central export point for all AI provider functionality.
 * 
 * Usage:
 * ```typescript
 * import { getProviderRegistry, OpenAIAdapter } from '@/lib/ai-providers';
 * 
 * const registry = getProviderRegistry();
 * const response = await registry.complete(request, { mode: 'cost' });
 * ```
 */

// Core types
export * from './types';

// Base adapter
export { BaseProviderAdapter, type ProviderConfig } from './base';

// Individual providers
export { OpenAIAdapter } from './openai';
export { AnthropicAdapter } from './anthropic';
export { GroqAdapter } from './groq';
export { GoogleAdapter } from './google';
export { DeepSeekAdapter } from './deepseek';
export { MistralAdapter } from './mistral';
export { TogetherAdapter } from './together';
export { FireworksAdapter } from './fireworks';
export { OpenRouterAdapter } from './openrouter';
export { CohereAdapter } from './cohere';
export { PerplexityAdapter } from './perplexity';
export { AI21Adapter } from './ai21';

// Registry (main entry point)
export { 
    ProviderRegistry, 
    getProviderRegistry, 
    resetProviderRegistry 
} from './registry';

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

import { getProviderRegistry } from './registry';
import { CompletionRequest, CompletionResponse, StreamChunk, RoutingOptions } from './types';

/**
 * Complete a request using the global registry with automatic routing.
 * 
 * @example
 * ```typescript
 * const response = await complete({
 *   messages: [{ role: 'user', content: 'Hello!' }]
 * }, { mode: 'cost' });
 * ```
 */
export async function complete(
    request: CompletionRequest,
    options?: RoutingOptions
): Promise<CompletionResponse> {
    return getProviderRegistry().complete(request, options);
}

/**
 * Stream a response using the global registry with automatic routing.
 * 
 * @example
 * ```typescript
 * for await (const chunk of stream({ messages: [...] })) {
 *   process.stdout.write(chunk.choices[0]?.delta?.content || '');
 * }
 * ```
 */
export async function* stream(
    request: CompletionRequest,
    options?: RoutingOptions
): AsyncGenerator<StreamChunk> {
    yield* getProviderRegistry().stream(request, options);
}

/**
 * Get the cheapest model that supports the given capabilities.
 */
export function getCheapestModel(capabilities?: string[]) {
    return getProviderRegistry().getCheapestModel(capabilities as any);
}

/**
 * Compare costs across all providers for a given request size.
 */
export function compareCosts(inputTokens: number, outputTokens: number) {
    return getProviderRegistry().compareCosts(inputTokens, outputTokens);
}

/**
 * Get registry statistics.
 */
export function getProviderStats() {
    return getProviderRegistry().getStats();
}
