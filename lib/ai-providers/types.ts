/**
 * P402 AI Provider Types
 * ======================
 * Core type definitions for the AI orchestration layer.
 * V2 Spec: Section 4.1 (Router Engine) + Section 6.2 (Data Models)
 */

// =============================================================================
// MODEL INFORMATION
// =============================================================================

export type ModelTier = 'budget' | 'mid' | 'premium';

export type ModelCapability = 
    | 'chat'
    | 'vision'
    | 'function_calling'
    | 'json_mode'
    | 'streaming'
    | 'embeddings'
    | 'code'
    | 'reasoning'
    | 'long_context';

export interface ModelInfo {
    /** Provider's model identifier (e.g., 'gpt-4o', 'claude-sonnet-4-5') */
    id: string;
    
    /** Human-readable name */
    name: string;
    
    /** Cost tier for routing decisions */
    tier: ModelTier;
    
    /** Maximum context window in tokens */
    contextWindow: number;
    
    /** Cost per 1K input tokens in USD */
    inputCostPer1k: number;
    
    /** Cost per 1K output tokens in USD */
    outputCostPer1k: number;
    
    /** Supported capabilities */
    capabilities: ModelCapability[];
    
    /** Whether model supports streaming */
    supportsStreaming: boolean;
    
    /** Optional: Maximum output tokens */
    maxOutputTokens?: number;
    
    /** Optional: Default temperature */
    defaultTemperature?: number;
}

// =============================================================================
// REQUEST / RESPONSE TYPES
// =============================================================================

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface Message {
    role: MessageRole;
    content: string | ContentPart[];
    name?: string;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
}

export interface ContentPart {
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
        url: string;
        detail?: 'low' | 'high' | 'auto';
    };
}

export interface ToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}

export interface Tool {
    type: 'function';
    function: {
        name: string;
        description?: string;
        parameters?: Record<string, unknown>;
    };
}

export interface CompletionRequest {
    /** Messages in the conversation */
    messages: Message[];
    
    /** Specific model to use (optional - router may override) */
    model?: string;
    
    /** Temperature (0-2) */
    temperature?: number;
    
    /** Maximum tokens to generate */
    maxTokens?: number;
    
    /** Top-p sampling */
    topP?: number;
    
    /** Frequency penalty */
    frequencyPenalty?: number;
    
    /** Presence penalty */
    presencePenalty?: number;
    
    /** Stop sequences */
    stop?: string | string[];
    
    /** Tools/functions available */
    tools?: Tool[];
    
    /** Tool choice behavior */
    toolChoice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };
    
    /** Response format */
    responseFormat?: { type: 'text' | 'json_object' };
    
    /** Stream the response */
    stream?: boolean;
    
    /** User identifier for abuse tracking */
    user?: string;
}

export interface CompletionChoice {
    index: number;
    message: Message;
    finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
}

export interface CompletionUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

export interface CompletionResponse {
    id: string;
    object: 'chat.completion';
    created: number;
    model: string;
    choices: CompletionChoice[];
    usage: CompletionUsage;
    
    /** P402 Metadata */
    p402?: {
        providerId: string;
        modelId: string;
        costUsd: number;
        latencyMs: number;
        cached: boolean;
    };
}

// =============================================================================
// STREAMING TYPES
// =============================================================================

export interface StreamDelta {
    role?: MessageRole;
    content?: string;
    tool_calls?: Partial<ToolCall>[];
}

export interface StreamChoice {
    index: number;
    delta: StreamDelta;
    finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
}

export interface StreamChunk {
    id: string;
    object: 'chat.completion.chunk';
    created: number;
    model: string;
    choices: StreamChoice[];
    
    /** Final chunk includes usage */
    usage?: CompletionUsage;
}

// =============================================================================
// EMBEDDING TYPES
// =============================================================================

export interface EmbeddingRequest {
    input: string | string[];
    model?: string;
    dimensions?: number;
}

export interface EmbeddingResponse {
    object: 'list';
    data: Array<{
        object: 'embedding';
        index: number;
        embedding: number[];
    }>;
    model: string;
    usage: {
        promptTokens: number;
        totalTokens: number;
    };
}

// =============================================================================
// PROVIDER HEALTH
// =============================================================================

export type ProviderHealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

export interface ProviderHealth {
    status: ProviderHealthStatus;
    latencyP50Ms: number;
    latencyP95Ms: number;
    successRate: number;
    lastCheckedAt: string;
    errorMessage?: string;
    rateLimitRemaining?: number;
    rateLimitResetAt?: string;
}

export interface RateLimitInfo {
    requestsRemaining: number;
    requestsLimit: number;
    tokensRemaining?: number;
    tokensLimit?: number;
    resetAt: string;
}

// =============================================================================
// PROVIDER ADAPTER INTERFACE
// =============================================================================

export interface AIProviderAdapter {
    /** Unique identifier (e.g., 'openai', 'anthropic') */
    id: string;
    
    /** Display name */
    name: string;
    
    /** Base API URL */
    baseUrl: string;
    
    /** Available models */
    models: ModelInfo[];
    
    /** Get a specific model by ID */
    getModel(modelId: string): ModelInfo | undefined;
    
    /** Check if provider supports a capability */
    supportsCapability(capability: ModelCapability): boolean;
    
    /** Execute a completion request */
    complete(request: CompletionRequest): Promise<CompletionResponse>;
    
    /** Stream a completion request */
    stream(request: CompletionRequest): AsyncGenerator<StreamChunk>;
    
    /** Generate embeddings (optional) */
    embed?(request: EmbeddingRequest): Promise<EmbeddingResponse>;
    
    /** Estimate cost for a request */
    estimateCost(model: string, inputTokens: number, outputTokens: number): number;
    
    /** Check provider health */
    checkHealth(): Promise<ProviderHealth>;
    
    /** Get current rate limit status */
    getRateLimitStatus?(): Promise<RateLimitInfo>;
    
    /** Count tokens in text (provider-specific) */
    countTokens?(text: string, model?: string): number;
}

// =============================================================================
// ROUTING TYPES (V2 Spec 4.1)
// =============================================================================

export type RoutingMode = 'cost' | 'quality' | 'speed' | 'balanced';

export interface RoutingWeights {
    cost: number;
    quality: number;
    speed: number;
}

export interface RoutingOptions {
    /** Routing mode or custom weights */
    mode: RoutingMode | RoutingWeights;
    
    /** Task hint for better model selection */
    task?: string;
    
    /** Required capabilities */
    requiredCapabilities?: ModelCapability[];
    
    /** Minimum context window needed */
    minContextWindow?: number;
    
    /** Maximum cost per request (USD) */
    maxCostPerRequest?: number;
    
    /** Preferred providers (ordered) */
    preferProviders?: string[];
    
    /** Providers to exclude */
    excludeProviders?: string[];
    
    /** Preferred model tier */
    preferTier?: ModelTier;
    
    /** Maximum model tier allowed */
    maxTier?: ModelTier;
    
    /** Failover configuration */
    failover?: {
        enabled: boolean;
        maxRetries: number;
        fallbackProviders?: string[];
    };
    
    /** Rate limit strategy */
    rateLimitStrategy?: 'switch' | 'queue' | 'fail';
}

export interface RoutingDecision {
    /** Selected provider */
    provider: AIProviderAdapter;
    
    /** Selected model */
    model: ModelInfo;
    
    /** Decision reason */
    reason: 'cost_optimal' | 'quality_optimal' | 'speed_optimal' | 'balanced' | 'policy_match' | 'failover' | 'rate_limit_avoid';
    
    /** Score breakdown */
    scores: {
        cost: number;
        quality: number;
        speed: number;
        total: number;
    };
    
    /** Alternatives considered */
    alternatives: Array<{
        provider: string;
        model: string;
        score: number;
        disqualifyReason?: string;
    }>;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

export class AIProviderError extends Error {
    constructor(
        message: string,
        public readonly providerId: string,
        public readonly code: string,
        public readonly statusCode?: number,
        public readonly retryable: boolean = false
    ) {
        super(message);
        this.name = 'AIProviderError';
    }
}

export class RateLimitError extends AIProviderError {
    constructor(
        providerId: string,
        public readonly retryAfterMs?: number
    ) {
        super('Rate limit exceeded', providerId, 'RATE_LIMIT', 429, true);
        this.name = 'RateLimitError';
    }
}

export class AuthenticationError extends AIProviderError {
    constructor(providerId: string) {
        super('Authentication failed', providerId, 'AUTH_FAILED', 401, false);
        this.name = 'AuthenticationError';
    }
}

export class ModelNotFoundError extends AIProviderError {
    constructor(providerId: string, modelId: string) {
        super(`Model not found: ${modelId}`, providerId, 'MODEL_NOT_FOUND', 404, false);
        this.name = 'ModelNotFoundError';
    }
}
