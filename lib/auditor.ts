/**
 * P402 AI Cost Auditor - World-Class Edition
 * ===========================================
 * Model-level detection, tier-aware pricing, and LangChain/OpenRouter-quality optimizations.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface AuditResult {
    estimatedMonthlySpend: number;
    confidence: number; // 0-100%
    usageBreakdown: UsageItem[];
    optimizations: Optimization[];
    alternatives: Alternative[];
    scalingAnalysis: ScalingTier[];
    detectedStack: DetectedStack;
    deploymentGuide: DeploymentGuide;
    v2UpgradeAvailable: boolean;
}

export interface UsageItem {
    provider: string;
    model: string;
    estimatedCost: number;
    callsPerDay: number;
    avgTokensPerCall: number;
    costPer1kTokens: number;
}

export interface Optimization {
    id: string;
    title: string;
    description: string;
    projectedSavings: number;
    savingsPercent: number;
    impact: 'critical' | 'high' | 'medium' | 'low';
    effort: 'trivial' | 'easy' | 'moderate' | 'complex';
    category: 'caching' | 'routing' | 'model-switch' | 'batching' | 'architecture';
    codeExample: string;
    beforeAfter?: { before: string; after: string };
}

export interface Alternative {
    current: string;
    suggestion: string;
    reasoning: string;
    type: 'quality' | 'speed' | 'cost' | 'balanced';
    expectedSavings: number;
    qualityDelta: number; // -10 to +10
    speedDelta: number;   // -10 to +10
}

export interface ScalingTier {
    callsPerDay: number;
    legacyMonthly: number;
    p402Monthly: number;
    savings: number;
    savingsPercent: number;
}

export interface DetectedStack {
    providers: string[];
    models: string[];
    frameworks: string[];
    patterns: string[];
    language: 'typescript' | 'python' | 'javascript' | 'unknown';
}

export interface DeploymentGuide {
    quickStart: string;
    fullIntegration: string;
    sdkInstall: string;
    envVars: string[];
    estimatedTime: string;
}
// ============================================================================
// MODEL KNOWLEDGE BASE (Pricing as of January 2026)
// ============================================================================

interface ModelInfo {
    provider: string;
    displayName: string;
    inputCostPer1M: number;  // Cost per 1M input tokens
    outputCostPer1M: number; // Cost per 1M output tokens
    quality: number;         // 0-100
    speed: number;           // 0-100
    contextWindow: number;
    strengths: string[];
    bestFor: string[];
}

const MODEL_KNOWLEDGE: Record<string, ModelInfo> = {
    // ==========================================================================
    // OpenAI (January 2026)
    // ==========================================================================
    'gpt-5.2': {
        provider: 'openai', displayName: 'GPT-5.2',
        inputCostPer1M: 5.00, outputCostPer1M: 15.00,
        quality: 99, speed: 80, contextWindow: 256000,
        strengths: ['State-of-the-art reasoning', 'Multimodal', 'Agentic'],
        bestFor: ['Complex research', 'Autonomous agents', 'Creative work']
    },
    'gpt-5.2-mini': {
        provider: 'openai', displayName: 'GPT-5.2 Mini',
        inputCostPer1M: 0.50, outputCostPer1M: 1.50,
        quality: 90, speed: 95, contextWindow: 128000,
        strengths: ['Fast', 'Cost-effective', 'High quality for price'],
        bestFor: ['Production workloads', 'Summarization', 'Classification']
    },
    'gpt-4o': {
        provider: 'openai', displayName: 'GPT-4o (Legacy)',
        inputCostPer1M: 1.25, outputCostPer1M: 5.00,
        quality: 92, speed: 85, contextWindow: 128000,
        strengths: ['Proven reliability', 'Multimodal', 'Tool Use'],
        bestFor: ['Vision tasks', 'Code generation', 'General purpose']
    },
    'o3': {
        provider: 'openai', displayName: 'o3 (Reasoning)',
        inputCostPer1M: 10.00, outputCostPer1M: 40.00,
        quality: 100, speed: 25, contextWindow: 200000,
        strengths: ['Frontier reasoning', 'Math proofs', 'Scientific research'],
        bestFor: ['PhD-level problems', 'Novel research', 'Complex proofs']
    },
    'o3-mini': {
        provider: 'openai', displayName: 'o3-mini',
        inputCostPer1M: 1.10, outputCostPer1M: 4.40,
        quality: 94, speed: 70, contextWindow: 200000,
        strengths: ['Reasoning on a budget', 'Coding', 'Math'],
        bestFor: ['Code debugging', 'Logic puzzles', 'Analysis']
    },

    // ==========================================================================
    // Anthropic (January 2026)
    // ==========================================================================
    'claude-opus-4.5': {
        provider: 'anthropic', displayName: 'Claude Opus 4.5',
        inputCostPer1M: 12.00, outputCostPer1M: 60.00,
        quality: 99, speed: 50, contextWindow: 500000,
        strengths: ['Best-in-class coding', 'Nuanced analysis', 'Long context'],
        bestFor: ['Critical production code', 'Research synthesis', 'Complex agents']
    },
    'claude-sonnet-4': {
        provider: 'anthropic', displayName: 'Claude Sonnet 4',
        inputCostPer1M: 3.00, outputCostPer1M: 15.00,
        quality: 96, speed: 80, contextWindow: 500000,
        strengths: ['Excellent balance', 'Fast coding', 'Reliable'],
        bestFor: ['Daily development', 'Document analysis', 'Agents']
    },
    'claude-haiku-3.5': {
        provider: 'anthropic', displayName: 'Claude Haiku 3.5',
        inputCostPer1M: 0.25, outputCostPer1M: 1.00,
        quality: 82, speed: 98, contextWindow: 200000,
        strengths: ['Extremely fast', 'Very cheap', 'Long context'],
        bestFor: ['High volume', 'Simple tasks', 'Preprocessing']
    },

    // ==========================================================================
    // Google DeepMind (January 2026)
    // ==========================================================================
    'gemini-3-ultra': {
        provider: 'google', displayName: 'Gemini 3 Ultra',
        inputCostPer1M: 8.00, outputCostPer1M: 24.00,
        quality: 98, speed: 60, contextWindow: 2000000,
        strengths: ['Massive context', 'Multimodal excellence', 'Reasoning'],
        bestFor: ['Video analysis', 'Full codebase review', 'Research']
    },
    'gemini-3-pro': {
        provider: 'google', displayName: 'Gemini 3 Pro',
        inputCostPer1M: 1.00, outputCostPer1M: 4.00,
        quality: 94, speed: 85, contextWindow: 1000000,
        strengths: ['Great value', 'Long context', 'Multimodal'],
        bestFor: ['Document Q&A', 'Code assistance', 'General tasks']
    },
    'gemini-3-flash': {
        provider: 'google', displayName: 'Gemini 3 Flash',
        inputCostPer1M: 0.05, outputCostPer1M: 0.15,
        quality: 85, speed: 98, contextWindow: 1000000,
        strengths: ['Incredibly cheap', 'Lightning fast', 'Long context'],
        bestFor: ['High volume processing', 'Summarization', 'Classification']
    },

    // ==========================================================================
    // Meta / Llama (January 2026 - via Groq, Together, Fireworks)
    // ==========================================================================
    'llama-4-405b': {
        provider: 'meta', displayName: 'Llama 4 405B',
        inputCostPer1M: 0.80, outputCostPer1M: 2.40,
        quality: 94, speed: 75, contextWindow: 256000,
        strengths: ['Open weights', 'Self-hostable', 'No vendor lock-in'],
        bestFor: ['On-prem deployment', 'Fine-tuning', 'Custom applications']
    },
    'llama-4-70b-groq': {
        provider: 'groq', displayName: 'Llama 4 70B (Groq)',
        inputCostPer1M: 0.35, outputCostPer1M: 0.50,
        quality: 90, speed: 100, contextWindow: 128000,
        strengths: ['Fastest inference', 'Sub-50ms latency', 'Cheap'],
        bestFor: ['Real-time apps', 'Chatbots', 'Latency-critical']
    },
    'llama-4-8b-groq': {
        provider: 'groq', displayName: 'Llama 4 8B (Groq)',
        inputCostPer1M: 0.03, outputCostPer1M: 0.05,
        quality: 78, speed: 100, contextWindow: 128000,
        strengths: ['Cheapest option', 'Blazing fast'],
        bestFor: ['Preprocessing', 'Filtering', 'Simple classification']
    },

    // ==========================================================================
    // Mistral AI (January 2026)
    // ==========================================================================
    'mistral-large-3': {
        provider: 'mistral', displayName: 'Mistral Large 3',
        inputCostPer1M: 1.50, outputCostPer1M: 4.50,
        quality: 93, speed: 82, contextWindow: 128000,
        strengths: ['European data sovereignty', 'Open weights', 'Multilingual'],
        bestFor: ['EU compliance', 'Multilingual apps', 'General purpose']
    },
    'codestral-2': {
        provider: 'mistral', displayName: 'Codestral 2',
        inputCostPer1M: 0.20, outputCostPer1M: 0.60,
        quality: 90, speed: 92, contextWindow: 64000,
        strengths: ['Best code model for price', 'Fill-in-middle', 'Fast'],
        bestFor: ['Code completion', 'Debugging', 'Refactoring']
    },

    // ==========================================================================
    // DeepSeek (January 2026)
    // ==========================================================================
    'deepseek-v4': {
        provider: 'deepseek', displayName: 'DeepSeek V4',
        inputCostPer1M: 0.14, outputCostPer1M: 0.28,
        quality: 92, speed: 88, contextWindow: 128000,
        strengths: ['Incredible value', 'Strong coding', 'MoE efficiency'],
        bestFor: ['Budget-conscious', 'Coding tasks', 'General purpose']
    },
    'deepseek-r2': {
        provider: 'deepseek', displayName: 'DeepSeek R2',
        inputCostPer1M: 0.55, outputCostPer1M: 2.19,
        quality: 97, speed: 55, contextWindow: 128000,
        strengths: ['Frontier reasoning', 'Matches o3-mini', 'Cheap'],
        bestFor: ['Complex reasoning at 5% of o3 cost', 'Research', 'Math']
    },

    // ==========================================================================
    // xAI (January 2026)
    // ==========================================================================
    'grok-3': {
        provider: 'xai', displayName: 'Grok 3',
        inputCostPer1M: 2.00, outputCostPer1M: 8.00,
        quality: 95, speed: 80, contextWindow: 131072,
        strengths: ['Real-time data', 'Unfiltered', 'X integration'],
        bestFor: ['Current events', 'Social analysis', 'Creative writing']
    },

    // ==========================================================================
    // Cohere (January 2026)
    // ==========================================================================
    'command-r-2': {
        provider: 'cohere', displayName: 'Command R2',
        inputCostPer1M: 0.50, outputCostPer1M: 1.50,
        quality: 88, speed: 85, contextWindow: 128000,
        strengths: ['RAG-optimized', 'Grounded generation', 'Enterprise'],
        bestFor: ['RAG pipelines', 'Enterprise search', 'Document Q&A']
    }
};

// ============================================================================
// FRAMEWORK & PATTERN DETECTION
// ============================================================================

const FRAMEWORK_SIGNATURES: Record<string, { pattern: RegExp; name: string; type: 'agent' | 'rag' | 'chain' | 'sdk' }> = {
    'langchain': { pattern: /langchain|from langchain/i, name: 'LangChain', type: 'chain' },
    'llamaindex': { pattern: /llama[-_]?index|from llama_index/i, name: 'LlamaIndex', type: 'rag' },
    'autogen': { pattern: /autogen|pyautogen/i, name: 'AutoGen', type: 'agent' },
    'crewai': { pattern: /crewai|from crewai/i, name: 'CrewAI', type: 'agent' },
    'dspy': { pattern: /dspy|import dspy/i, name: 'DSPy', type: 'chain' },
    'haystack': { pattern: /haystack|from haystack/i, name: 'Haystack', type: 'rag' },
    'semantic-kernel': { pattern: /semantic[-_]kernel/i, name: 'Semantic Kernel', type: 'chain' },
    'vercel-ai': { pattern: /ai\/|@ai-sdk/i, name: 'Vercel AI SDK', type: 'sdk' },
    'openai-sdk': { pattern: /openai|from openai|new OpenAI/i, name: 'OpenAI SDK', type: 'sdk' },
    'anthropic-sdk': { pattern: /anthropic|from anthropic|new Anthropic/i, name: 'Anthropic SDK', type: 'sdk' },
};

const USAGE_PATTERNS: Record<string, { pattern: RegExp; name: string; costMultiplier: number }> = {
    'streaming': { pattern: /stream[=:]true|\.stream\(|for await.*chunk/i, name: 'Streaming', costMultiplier: 1.0 },
    'agents': { pattern: /agent|\.run\(|\.execute\(|tool[s]?[=:]/i, name: 'Agent Loops', costMultiplier: 3.0 },
    'rag': { pattern: /retriev|vector|embed|chunk|pinecone|weaviate|qdrant/i, name: 'RAG Pipeline', costMultiplier: 1.5 },
    'batch': { pattern: /batch|bulk|parallel|Promise\.all/i, name: 'Batch Processing', costMultiplier: 1.2 },
    'fine-tuning': { pattern: /fine[-_]?tun|training|\.train\(/i, name: 'Fine-tuning', costMultiplier: 5.0 },
    'function-calling': { pattern: /tools[=:]|function[s]?[=:]|tool_choice/i, name: 'Function Calling', costMultiplier: 1.3 },
};

// ============================================================================
// OPTIMIZATION TEMPLATES
// ============================================================================

interface OptimizationTemplate {
    id: string;
    title: string;
    category: Optimization['category'];
    impact: Optimization['impact'];
    effort: Optimization['effort'];
    baseSavingsPercent: number;
    applicability: (signals: string[], models: string[]) => boolean;
    description: (context: { providers: string[]; models: string[]; spend: number }) => string;
    codeExample: (lang: 'typescript' | 'python') => string;
}

const OPTIMIZATION_TEMPLATES: OptimizationTemplate[] = [
    {
        id: 'semantic-cache',
        title: 'Enable Semantic Caching',
        category: 'caching',
        impact: 'critical',
        effort: 'trivial',
        baseSavingsPercent: 45,
        applicability: (signals) => signals.some(s => ['agents', 'rag', 'function-calling'].includes(s)),
        description: ({ spend }) => `Similar queries are hitting your AI APIs repeatedly. P402's semantic cache uses vector similarity to return cached responses for near-identical prompts, potentially saving $${(spend * 0.45).toFixed(0)}/month.`,
        codeExample: (lang) => lang === 'typescript'
            ? `const res = await p402.chat({
  model: 'gpt-4o',
  messages: [...],
  cache: true,
  cache_ttl: 3600,
  similarity_threshold: 0.92
});`
            : `res = p402.chat(
    model="gpt-4o",
    messages=[...],
    cache=True,
    cache_ttl=3600,
    similarity_threshold=0.92
)`
    },
    {
        id: 'smart-routing',
        title: 'Deploy Quality-Aware Routing',
        category: 'routing',
        impact: 'critical',
        effort: 'easy',
        baseSavingsPercent: 40,
        applicability: () => true,
        description: ({ providers }) => `Route simple queries to fast/cheap models (Gemini Flash, Llama 3.1) and complex ones to premium models (${providers[0] || 'GPT-4o'}). P402 analyzes query complexity in real-time.`,
        codeExample: (lang) => lang === 'typescript'
            ? `const res = await p402.chat({
  mode: 'cost_optimized',
  fallback_chain: ['gemini-1.5-flash', 'gpt-4o-mini', 'gpt-4o'],
  messages: [...],
  complexity_threshold: 0.7
});`
            : `res = p402.chat(
    mode="cost_optimized",
    fallback_chain=["gemini-1.5-flash", "gpt-4o-mini", "gpt-4o"],
    messages=[...],
    complexity_threshold=0.7
)`
    },
    {
        id: 'model-downgrade',
        title: 'Switch to Cost-Efficient Models',
        category: 'model-switch',
        impact: 'high',
        effort: 'moderate',
        baseSavingsPercent: 70,
        applicability: (_, models) => models.some(m => ['gpt-4-turbo', 'claude-3-opus', 'gpt-4o'].includes(m)),
        description: ({ models }) => `You're using ${models[0] || 'premium models'} for all tasks. For 80% of queries, GPT-4o-mini or Gemini Flash delivers equivalent results at 1/50th the cost.`,
        codeExample: (lang) => lang === 'typescript'
            ? `// Before: Always using expensive model
const res = await openai.chat({ model: 'gpt-4-turbo', ... });

// After: P402 auto-selects optimal model
const res = await p402.chat({
  mode: 'balanced',  // 'quality_first' | 'cost_first' | 'balanced'
  messages: [...],
});`
            : `# Before: Always using expensive model
res = openai.chat(model="gpt-4-turbo", ...)

# After: P402 auto-selects optimal model
res = p402.chat(
    mode="balanced",  # "quality_first" | "cost_first" | "balanced"
    messages=[...],
)`
    },
    {
        id: 'prompt-caching',
        title: 'Leverage Prompt Caching',
        category: 'caching',
        impact: 'high',
        effort: 'trivial',
        baseSavingsPercent: 50,
        applicability: (signals) => signals.includes('agents') || signals.includes('rag'),
        description: () => `Anthropic and OpenAI offer native prompt caching for repeated system prompts. P402 automatically enables this when beneficial, reducing input token costs by up to 90%.`,
        codeExample: (lang) => lang === 'typescript'
            ? `const res = await p402.chat({
  model: 'claude-3-5-sonnet',
  system: longSystemPrompt,  // Automatically cached
  messages: [...],
  prompt_cache: 'auto'
});`
            : `res = p402.chat(
    model="claude-3-5-sonnet",
    system=long_system_prompt,  # Automatically cached
    messages=[...],
    prompt_cache="auto"
)`
    },
    {
        id: 'batch-api',
        title: 'Use Batch API for Async Workloads',
        category: 'batching',
        impact: 'high',
        effort: 'moderate',
        baseSavingsPercent: 50,
        applicability: (signals) => signals.includes('batch'),
        description: () => `OpenAI's Batch API offers 50% discount for non-urgent requests (24h SLA). P402 automatically batches eligible requests during off-peak hours.`,
        codeExample: (lang) => lang === 'typescript'
            ? `const results = await p402.batch({
  requests: items.map(item => ({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: item.prompt }]
  })),
  completion_window: '24h'  // 50% discount
});`
            : `results = p402.batch(
    requests=[
        {"model": "gpt-4o-mini", "messages": [{"role": "user", "content": item.prompt}]}
        for item in items
    ],
    completion_window="24h"  # 50% discount
)`
    },
    {
        id: 'fallback-chains',
        title: 'Implement Intelligent Fallbacks',
        category: 'routing',
        impact: 'medium',
        effort: 'easy',
        baseSavingsPercent: 25,
        applicability: () => true,
        description: () => `Start with cheaper models and escalate only on failure. P402 retries with progressively more capable models, avoiding premium costs for simple queries.`,
        codeExample: (lang) => lang === 'typescript'
            ? `const res = await p402.chat({
  messages: [...],
  fallback_chain: [
    'llama-3.3-70b',     // Try first: $0.59/M
    'gpt-4o-mini',       // Fallback: $0.15/M
    'gpt-4o'             // Final: $2.50/M
  ],
  retry_on: ['rate_limit', 'quality_threshold']
});`
            : `res = p402.chat(
    messages=[...],
    fallback_chain=[
        "llama-3.3-70b",     # Try first: $0.59/M
        "gpt-4o-mini",       # Fallback: $0.15/M
        "gpt-4o"             # Final: $2.50/M
    ],
    retry_on=["rate_limit", "quality_threshold"]
)`
    },
    {
        id: 'deepseek-migration',
        title: 'Consider DeepSeek for Complex Reasoning',
        category: 'model-switch',
        impact: 'high',
        effort: 'moderate',
        baseSavingsPercent: 85,
        applicability: (_, models) => models.some(m => ['o1', 'o1-mini', 'claude-3-opus'].includes(m)),
        description: () => `DeepSeek R1 matches o1's reasoning capabilities at 1/30th the cost. For math, coding, and complex analysis, this swap saves 85%+ with minimal quality loss.`,
        codeExample: (lang) => lang === 'typescript'
            ? `// P402 routes reasoning tasks to DeepSeek R1
const res = await p402.chat({
  mode: 'reasoning',
  provider_preferences: { prefer: ['deepseek'], avoid: [] },
  messages: [...],
});`
            : `# P402 routes reasoning tasks to DeepSeek R1
res = p402.chat(
    mode="reasoning",
    provider_preferences={"prefer": ["deepseek"], "avoid": []},
    messages=[...],
)`
    }
];

// ============================================================================
// SCAN FILES
// ============================================================================

const SCAN_FILES = [
    'package.json',
    'requirements.txt',
    '.env.example',
    'README.md',
    'pyproject.toml',
    'Pipfile',
    'src/index.ts',
    'src/main.py',
    'app/page.tsx',
    'lib/ai.ts',
    'lib/llm.py',
    'config.yaml',
    'docker-compose.yml'
];

// ============================================================================
// MAIN AUDIT FUNCTION
// ============================================================================

export async function auditRepository(repoUrl: string): Promise<AuditResult> {
    const githubRegex = /github\.com\/([^/]+)\/([^/]+)/;
    const match = repoUrl.match(githubRegex);

    if (!match) {
        return emptyResult();
    }

    const [_, user, repo] = match;

    // Parallel scan of all files
    const fileContents = await Promise.all(SCAN_FILES.map(async file => {
        try {
            let res = await fetch(`https://raw.githubusercontent.com/${user}/${repo}/main/${file}`);
            if (!res.ok) {
                res = await fetch(`https://raw.githubusercontent.com/${user}/${repo}/master/${file}`);
            }
            if (!res.ok) return null;
            return { file, content: await res.text() };
        } catch {
            return null;
        }
    }));

    const validFiles = fileContents.filter((f): f is { file: string; content: string } => f !== null);
    const allContent = validFiles.map(f => f.content).join('\n');

    // Detect language
    const language = detectLanguage(validFiles.map(f => f.file));

    // Detect models
    const detectedModels = detectModels(allContent);

    // Detect frameworks
    const detectedFrameworks = detectFrameworks(allContent);

    // Detect usage patterns
    const detectedPatterns = detectPatterns(allContent);

    // Calculate confidence
    const confidence = calculateConfidence(detectedModels, detectedFrameworks, detectedPatterns);

    if (detectedModels.length === 0 && detectedFrameworks.length === 0) {
        return emptyResult();
    }

    // Estimate usage
    const baseCalls = estimateCallVolume(detectedPatterns, detectedFrameworks);

    // Build usage breakdown
    const usageBreakdown = buildUsageBreakdown(detectedModels, baseCalls, detectedPatterns);
    const totalSpend = usageBreakdown.reduce((sum, u) => sum + u.estimatedCost, 0);

    // Generate optimizations
    const detectedSignals = detectedPatterns.map(p => p.id);
    const modelIds = detectedModels.map(m => m.id);
    const providers = [...new Set(detectedModels.map(m => m.info.provider))];

    const optimizations = generateOptimizations(detectedSignals, modelIds, providers, totalSpend, language);

    // Generate alternatives
    const alternatives = generateAlternatives(detectedModels, totalSpend);

    // Generate scaling analysis
    const scalingAnalysis = generateScalingAnalysis(totalSpend, baseCalls);

    // Generate deployment guide
    const deploymentGuide = generateDeploymentGuide(language, providers, detectFrameworks);

    return {
        estimatedMonthlySpend: totalSpend,
        confidence,
        usageBreakdown,
        optimizations,
        alternatives,
        scalingAnalysis,
        detectedStack: {
            providers,
            models: modelIds,
            frameworks: detectedFrameworks.map(f => f.name),
            patterns: detectedPatterns.map(p => p.name),
            language
        },
        deploymentGuide,
        v2UpgradeAvailable: true
    };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function emptyResult(): AuditResult {
    return {
        estimatedMonthlySpend: 0,
        confidence: 0,
        usageBreakdown: [],
        optimizations: [],
        alternatives: [],
        scalingAnalysis: [],
        detectedStack: { providers: [], models: [], frameworks: [], patterns: [], language: 'unknown' },
        deploymentGuide: { quickStart: '', fullIntegration: '', sdkInstall: '', envVars: [], estimatedTime: '' },
        v2UpgradeAvailable: false
    };
}

function detectLanguage(files: string[]): 'typescript' | 'python' | 'javascript' | 'unknown' {
    const hasTs = files.some(f => f.endsWith('.ts') || f.endsWith('.tsx'));
    const hasPy = files.some(f => f.endsWith('.py'));
    const hasJs = files.some(f => f.endsWith('.js') || f.endsWith('.jsx'));
    const hasPackageJson = files.includes('package.json');
    const hasRequirements = files.includes('requirements.txt') || files.includes('pyproject.toml');

    if (hasTs) return 'typescript';
    if (hasPy || hasRequirements) return 'python';
    if (hasJs || hasPackageJson) return 'javascript';
    return 'unknown';
}

function detectModels(content: string): { id: string; info: ModelInfo; evidence: string }[] {
    const detected: { id: string; info: ModelInfo; evidence: string }[] = [];

    for (const [modelId, info] of Object.entries(MODEL_KNOWLEDGE)) {
        // Check for model ID directly
        if (content.toLowerCase().includes(modelId.toLowerCase())) {
            detected.push({ id: modelId, info, evidence: 'direct-reference' });
            continue;
        }

        // Check for common aliases (including legacy model names that map to current models)
        const aliases: Record<string, string[]> = {
            'gpt-5.2': ['gpt5', 'gpt-5', 'gpt5.2'],
            'gpt-5.2-mini': ['gpt5-mini', 'gpt-5-mini'],
            'gpt-4o': ['gpt4o', 'gpt-4-o', 'gpt_4o', 'gpt4', 'gpt-4', 'gpt-4-turbo'],
            'o3': ['o3-preview', 'o3-full'],
            'o3-mini': ['o3mini'],
            'claude-opus-4.5': ['claude-4', 'claude4', 'opus-4', 'claude-opus'],
            'claude-sonnet-4': ['claude-sonnet', 'sonnet-4', 'claude-3.5-sonnet', 'claude-3-5-sonnet'],
            'claude-haiku-3.5': ['claude-haiku', 'haiku-3.5', 'claude-3-haiku'],
            'gemini-3-ultra': ['gemini-ultra', 'gemini3-ultra'],
            'gemini-3-pro': ['gemini-pro', 'gemini3-pro', 'gemini-1.5-pro'],
            'gemini-3-flash': ['gemini-flash', 'gemini3-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'],
            'llama-4-70b-groq': ['llama-3.3-70b', 'llama-70b', 'llama3-70b'],
            'llama-4-8b-groq': ['llama-3.1-8b', 'llama-8b', 'llama3-8b'],
            'mistral-large-3': ['mistral-large', 'mistral-large-2'],
            'deepseek-v4': ['deepseek-v3', 'deepseek-chat'],
            'deepseek-r2': ['deepseek-r1', 'deepseek-reasoner'],
        };

        if (aliases[modelId]?.some(a => content.toLowerCase().includes(a.toLowerCase()))) {
            detected.push({ id: modelId, info, evidence: 'alias-reference' });
        }
    }

    // Fallback: Detect providers without specific model
    if (detected.length === 0) {
        if (/openai|gpt-?[45]|chatgpt/i.test(content)) {
            detected.push({ id: 'gpt-5.2', info: MODEL_KNOWLEDGE['gpt-5.2']!, evidence: 'provider-inference' });
        }
        if (/anthropic|claude/i.test(content)) {
            detected.push({ id: 'claude-sonnet-4', info: MODEL_KNOWLEDGE['claude-sonnet-4']!, evidence: 'provider-inference' });
        }
        if (/google.*generat|gemini/i.test(content)) {
            detected.push({ id: 'gemini-3-pro', info: MODEL_KNOWLEDGE['gemini-3-pro']!, evidence: 'provider-inference' });
        }
        if (/groq|llama/i.test(content)) {
            detected.push({ id: 'llama-4-70b-groq', info: MODEL_KNOWLEDGE['llama-4-70b-groq']!, evidence: 'provider-inference' });
        }
        if (/mistral/i.test(content)) {
            detected.push({ id: 'mistral-large-3', info: MODEL_KNOWLEDGE['mistral-large-3']!, evidence: 'provider-inference' });
        }
        if (/deepseek/i.test(content)) {
            detected.push({ id: 'deepseek-v4', info: MODEL_KNOWLEDGE['deepseek-v4']!, evidence: 'provider-inference' });
        }
        if (/cohere/i.test(content)) {
            detected.push({ id: 'command-r-2', info: MODEL_KNOWLEDGE['command-r-2']!, evidence: 'provider-inference' });
        }
        if (/grok|xai/i.test(content)) {
            detected.push({ id: 'grok-3', info: MODEL_KNOWLEDGE['grok-3']!, evidence: 'provider-inference' });
        }
    }

    return detected;
}

function detectFrameworks(content: string): { id: string; name: string; type: string }[] {
    const detected: { id: string; name: string; type: string }[] = [];

    for (const [id, sig] of Object.entries(FRAMEWORK_SIGNATURES)) {
        if (sig.pattern.test(content)) {
            detected.push({ id, name: sig.name, type: sig.type });
        }
    }

    return detected;
}

function detectPatterns(content: string): { id: string; name: string; multiplier: number }[] {
    const detected: { id: string; name: string; multiplier: number }[] = [];

    for (const [id, pat] of Object.entries(USAGE_PATTERNS)) {
        if (pat.pattern.test(content)) {
            detected.push({ id, name: pat.name, multiplier: pat.costMultiplier });
        }
    }

    return detected;
}

function calculateConfidence(
    models: { evidence: string }[],
    frameworks: { id: string }[],
    patterns: { id: string }[]
): number {
    let score = 0;

    // Model detection confidence
    for (const m of models) {
        if (m.evidence === 'direct-reference') score += 30;
        else if (m.evidence === 'alias-reference') score += 20;
        else score += 10;
    }

    // Framework presence
    score += Math.min(frameworks.length * 15, 30);

    // Pattern detection
    score += Math.min(patterns.length * 10, 20);

    return Math.min(score, 100);
}

function estimateCallVolume(
    patterns: { multiplier: number }[],
    frameworks: { type: string }[]
): number {
    let baseCalls = 3000; // Conservative daily estimate

    // Agent frameworks = more calls
    if (frameworks.some(f => f.type === 'agent')) baseCalls = 15000;
    else if (frameworks.some(f => f.type === 'rag')) baseCalls = 8000;

    // Apply pattern multipliers
    const maxMultiplier = Math.max(...patterns.map(p => p.multiplier), 1);
    baseCalls *= maxMultiplier;

    return Math.round(baseCalls);
}

function buildUsageBreakdown(
    models: { id: string; info: ModelInfo }[],
    baseCalls: number,
    patterns: { multiplier: number }[]
): UsageItem[] {
    const callsPerModel = baseCalls / Math.max(models.length, 1);
    const avgTokensPerCall = 1500; // Conservative estimate

    return models.map(({ id, info }) => {
        const avgCostPer1k = ((info.inputCostPer1M * 0.3) + (info.outputCostPer1M * 0.7)) / 1000;
        const tokensPerMonth = callsPerModel * 30 * avgTokensPerCall;
        const estimatedCost = (tokensPerMonth / 1000) * avgCostPer1k;

        return {
            provider: info.provider,
            model: info.displayName,
            estimatedCost: Math.round(estimatedCost * 100) / 100,
            callsPerDay: Math.round(callsPerModel),
            avgTokensPerCall,
            costPer1kTokens: Math.round(avgCostPer1k * 1000) / 1000
        };
    });
}

function generateOptimizations(
    signals: string[],
    models: string[],
    providers: string[],
    totalSpend: number,
    language: 'typescript' | 'python' | 'javascript' | 'unknown'
): Optimization[] {
    const lang = language === 'javascript' ? 'typescript' : (language === 'unknown' ? 'typescript' : language);

    return OPTIMIZATION_TEMPLATES
        .filter(t => t.applicability(signals, models))
        .map(t => ({
            id: t.id,
            title: t.title,
            description: t.description({ providers, models, spend: totalSpend }),
            projectedSavings: Math.round(totalSpend * (t.baseSavingsPercent / 100)),
            savingsPercent: t.baseSavingsPercent,
            impact: t.impact,
            effort: t.effort,
            category: t.category,
            codeExample: t.codeExample(lang)
        }))
        .sort((a, b) => b.projectedSavings - a.projectedSavings)
        .slice(0, 5);
}

function generateAlternatives(
    models: { id: string; info: ModelInfo }[],
    totalSpend: number
): Alternative[] {
    const alternatives: Alternative[] = [];

    for (const { id, info } of models) {
        // Speed alternative
        if (info.speed < 90) {
            const fastModel = MODEL_KNOWLEDGE['llama-4-70b-groq']!;
            alternatives.push({
                current: info.displayName,
                suggestion: 'Llama 4 70B (Groq)',
                reasoning: `Fastest inference available with Groq's LPU. Sub-50ms latency for real-time applications.`,
                type: 'speed',
                expectedSavings: 0,
                qualityDelta: fastModel.quality - info.quality,
                speedDelta: fastModel.speed - info.speed
            });
        }

        // Cost alternative
        if (info.inputCostPer1M > 0.5) {
            const cheapModel = MODEL_KNOWLEDGE['gemini-3-flash']!;
            const savingsPercent = 1 - (cheapModel.inputCostPer1M / info.inputCostPer1M);
            alternatives.push({
                current: info.displayName,
                suggestion: 'Gemini 3 Flash',
                reasoning: `${Math.round(savingsPercent * 100)}% cheaper with 1M+ context window. Lightning fast for summarization and simple tasks.`,
                type: 'cost',
                expectedSavings: Math.round(totalSpend * savingsPercent * 0.7),
                qualityDelta: cheapModel.quality - info.quality,
                speedDelta: cheapModel.speed - info.speed
            });
        }

        // Quality alternative (for cheaper models)
        if (info.quality < 90) {
            const qualityModel = MODEL_KNOWLEDGE['claude-sonnet-4']!;
            alternatives.push({
                current: info.displayName,
                suggestion: 'Claude Sonnet 4',
                reasoning: `Best-in-class coding and analysis with 500K context. Worth the premium for critical tasks.`,
                type: 'quality',
                expectedSavings: -(totalSpend * 0.3), // Costs more
                qualityDelta: qualityModel.quality - info.quality,
                speedDelta: qualityModel.speed - info.speed
            });
        }
    }

    return alternatives.slice(0, 4);
}

function generateScalingAnalysis(totalSpend: number, baseCalls: number): ScalingTier[] {
    const costPerCall = totalSpend / (baseCalls * 30);
    const p402Discount = 0.65; // 35% average savings

    return [1000, 10000, 50000, 100000, 500000, 1000000].map(callsPerDay => {
        const legacyMonthly = callsPerDay * 30 * costPerCall;
        const p402Monthly = legacyMonthly * p402Discount;
        return {
            callsPerDay,
            legacyMonthly: Math.round(legacyMonthly),
            p402Monthly: Math.round(p402Monthly),
            savings: Math.round(legacyMonthly - p402Monthly),
            savingsPercent: Math.round((1 - p402Discount) * 100)
        };
    });
}

function generateDeploymentGuide(
    language: 'typescript' | 'python' | 'javascript' | 'unknown',
    providers: string[],
    frameworks: any
): DeploymentGuide {
    const isPython = language === 'python';

    const sdkInstall = isPython
        ? 'pip install p402-sdk'
        : 'npm install @p402/sdk';

    const quickStart = isPython
        ? `from p402 import P402Client

p402 = P402Client(api_key="your-api-key")

response = p402.chat(
    mode="balanced",
    messages=[{"role": "user", "content": "Hello!"}]
)`
        : `import { P402Client } from '@p402/sdk';

const p402 = new P402Client({ apiKey: 'your-api-key' });

const response = await p402.chat({
  mode: 'balanced',
  messages: [{ role: 'user', content: 'Hello!' }]
});`;

    const fullIntegration = isPython
        ? `# 1. Install SDK
pip install p402-sdk

# 2. Replace your existing calls
# Before:
# from openai import OpenAI
# client = OpenAI()
# response = client.chat.completions.create(...)

# After:
from p402 import P402Client

p402 = P402Client()

response = p402.chat(
    mode="cost_optimized",
    fallback_chain=["gemini-1.5-flash", "gpt-4o-mini", "gpt-4o"],
    cache=True,
    messages=[...]
)

# Access the response the same way
print(response.choices[0].message.content)`
        : `// 1. Install SDK
// npm install @p402/sdk

// 2. Replace your existing calls
// Before:
// import OpenAI from 'openai';
// const client = new OpenAI();

// After:
import { P402Client } from '@p402/sdk';

const p402 = new P402Client();

const response = await p402.chat({
  mode: 'cost_optimized',
  fallback_chain: ['gemini-1.5-flash', 'gpt-4o-mini', 'gpt-4o'],
  cache: true,
  messages: [...]
});

// Access the response the same way
console.log(response.choices[0].message.content);`;

    return {
        quickStart,
        fullIntegration,
        sdkInstall,
        envVars: ['P402_API_KEY', 'P402_DEFAULT_MODE'],
        estimatedTime: '15 minutes'
    };
}
