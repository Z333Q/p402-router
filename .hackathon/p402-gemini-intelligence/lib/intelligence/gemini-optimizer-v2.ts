/**
 * P402 Intelligence Layer V2: OpenRouter-Aware
 * 
 * This module implements the Protocol Economist that:
 * 1. Monitors requests routed THROUGH OpenRouter
 * 2. Uses DIRECT Gemini 3 API for its own reasoning (not via OpenRouter)
 * 3. Optimizes routing parameters, cache policies, and cost efficiency
 * 
 * Architecture:
 * - User requests → P402 Router → OpenRouter (300+ models)
 * - Intelligence analysis → Direct Gemini 3 API (P402's brain)
 * 
 * Built for Gemini 3 Hackathon - Marathon Agent Track
 */

import { GoogleGenerativeAI, FunctionDeclaration } from '@google/generative-ai';

// ============================================================================
// MODELS: Direct Gemini 3 for Intelligence (NOT via OpenRouter)
// ============================================================================

const GEMINI_MODELS = {
  PRO: 'gemini-3-pro-preview',      // Deep analysis, high thinking
  FLASH: 'gemini-3-flash-preview',  // Real-time monitoring, low thinking
  EMBEDDING: 'text-embedding-004'   // Semantic similarity
} as const;

// OpenRouter model IDs (for reference in analysis)
const OPENROUTER_MODELS = {
  GPT_5_2: 'openai/gpt-5.2',
  CLAUDE_4_5: 'anthropic/claude-4.5-opus',
  CLAUDE_SONNET: 'anthropic/claude-3.5-sonnet',
  GEMINI_3_PRO: 'google/gemini-3-pro',
  GEMINI_3_FLASH: 'google/gemini-3-flash',
  LLAMA_405B: 'meta/llama-3.2-405b',
  DEEPSEEK_V3: 'deepseek/deepseek-v3',
  MIXTRAL: 'mistralai/mixtral-8x22b'
} as const;

// ============================================================================
// TYPES: OpenRouter Request/Response Data
// ============================================================================

interface RouterDecision {
  id: string;
  request_id: string;
  timestamp: Date;
  
  // Request details
  task: string;
  input_tokens: number;
  output_tokens: number;
  requested_mode: 'cost' | 'quality' | 'speed' | 'balanced';
  
  // Routing decision
  selected_provider: string;  // 'openrouter'
  selected_model: string;     // e.g., 'openai/gpt-4o'
  reason: string;             // 'cost_optimal' | 'failover' | 'cache_hit'
  
  // Outcome
  cost_usd: number;
  latency_ms: number;
  cache_hit: boolean;
  success: boolean;
  
  // OpenRouter-specific
  openrouter_generation_id?: string;
  openrouter_model_pricing?: {
    prompt: number;
    completion: number;
  };
  
  // P402 metadata
  tenant_id: string;
  policy_applied?: string[];
}

interface OpenRouterUsageStats {
  total_requests: number;
  total_cost_usd: number;
  by_model: Record<string, {
    requests: number;
    cost_usd: number;
    avg_latency_ms: number;
    cache_hit_rate: number;
    success_rate: number;
  }>;
  by_mode: Record<string, {
    requests: number;
    cost_usd: number;
  }>;
  cache_stats: {
    hits: number;
    misses: number;
    hit_rate: number;
    savings_usd: number;
  };
}

interface RoutingOptimization {
  id: string;
  type: 'model_substitution' | 'cache_policy' | 'rate_limit' | 'routing_weight' | 'failover_config';
  target: string;
  current_value: unknown;
  recommended_value: unknown;
  estimated_savings_usd: number;
  confidence: number;
  reasoning: string;
}

interface AuditResult {
  audit_id: string;
  tenant_id: string;
  period: { start: Date; end: Date };
  
  // Analysis
  thinking_trace: string[];
  usage_stats: OpenRouterUsageStats;
  optimizations: RoutingOptimization[];
  
  // Actions
  executed_optimizations: RoutingOptimization[];
  total_estimated_savings_usd: number;
  
  // Metadata
  model_used: string;
  thinking_level: 'low' | 'high';
  context_tokens_used: number;
  created_at: Date;
}

// ============================================================================
// TOOLS: OpenRouter-Aware Optimizations
// ============================================================================

const ECONOMIST_TOOLS: FunctionDeclaration[] = [
  {
    name: 'get_openrouter_usage',
    description: 'Retrieve OpenRouter usage statistics for a time period. Shows which models are being used, costs, latencies, and cache effectiveness.',
    parameters: {
      type: 'object',
      properties: {
        start_time: { type: 'string', description: 'ISO 8601 datetime' },
        end_time: { type: 'string', description: 'ISO 8601 datetime' },
        group_by: { 
          type: 'string', 
          enum: ['model', 'mode', 'hour', 'day'],
          description: 'Dimension to aggregate by'
        }
      },
      required: ['start_time', 'end_time']
    }
  },
  {
    name: 'configure_model_substitution',
    description: 'Set up automatic model substitution rules. When a request matches certain criteria, route to a cheaper/faster model via OpenRouter.',
    parameters: {
      type: 'object',
      properties: {
        rule_name: { type: 'string', description: 'Human-readable rule identifier' },
        trigger: {
          type: 'object',
          properties: {
            max_input_tokens: { type: 'number', description: 'Only apply if request is below this token count' },
            task_pattern: { type: 'string', description: 'Regex pattern to match against task/prompt' },
            requested_model: { type: 'string', description: 'Original model being requested' }
          }
        },
        substitute_model: { 
          type: 'string', 
          description: 'OpenRouter model ID to substitute (e.g., "openai/gpt-4o-mini")' 
        },
        enabled: { type: 'boolean' }
      },
      required: ['rule_name', 'trigger', 'substitute_model']
    }
  },
  {
    name: 'adjust_routing_weights',
    description: 'Modify the scoring weights used to rank models for each routing mode. Affects how cost/speed/quality are balanced.',
    parameters: {
      type: 'object',
      properties: {
        mode: { 
          type: 'string', 
          enum: ['cost', 'speed', 'quality', 'balanced'],
          description: 'Which routing mode to adjust'
        },
        weights: {
          type: 'object',
          properties: {
            cost: { type: 'number', minimum: 0, maximum: 1 },
            speed: { type: 'number', minimum: 0, maximum: 1 },
            quality: { type: 'number', minimum: 0, maximum: 1 }
          },
          description: 'Weight values (should sum to 1.0)'
        }
      },
      required: ['mode', 'weights']
    }
  },
  {
    name: 'configure_semantic_cache',
    description: 'Adjust semantic cache settings. The cache intercepts requests BEFORE they hit OpenRouter, saving 100% of inference cost on hits.',
    parameters: {
      type: 'object',
      properties: {
        similarity_threshold: { 
          type: 'number', 
          minimum: 0.8, 
          maximum: 0.99,
          description: 'Minimum cosine similarity for cache hit (current: 0.95)'
        },
        ttl_hours: { 
          type: 'number',
          description: 'How long to keep cache entries'
        },
        max_tokens_to_cache: {
          type: 'number',
          description: 'Only cache responses below this token count'
        },
        excluded_models: {
          type: 'array',
          items: { type: 'string' },
          description: 'OpenRouter model IDs to exclude from caching'
        }
      }
    }
  },
  {
    name: 'set_model_rate_limit',
    description: 'Set rate limits for specific OpenRouter models to prevent budget overruns or enforce usage policies.',
    parameters: {
      type: 'object',
      properties: {
        model: { 
          type: 'string', 
          description: 'OpenRouter model ID (e.g., "openai/gpt-5.2")' 
        },
        limits: {
          type: 'object',
          properties: {
            requests_per_minute: { type: 'number' },
            tokens_per_minute: { type: 'number' },
            cost_per_hour_usd: { type: 'number' },
            cost_per_day_usd: { type: 'number' }
          }
        }
      },
      required: ['model', 'limits']
    }
  },
  {
    name: 'configure_failover_chain',
    description: 'Set the automatic failover sequence when a model/provider fails via OpenRouter. Order matters.',
    parameters: {
      type: 'object',
      properties: {
        primary_model: { 
          type: 'string', 
          description: 'OpenRouter model ID for primary requests' 
        },
        failover_chain: {
          type: 'array',
          items: { type: 'string' },
          description: 'Ordered list of OpenRouter model IDs to try on failure'
        },
        max_retries: { type: 'number', default: 3 }
      },
      required: ['primary_model', 'failover_chain']
    }
  },
  {
    name: 'create_cost_alert',
    description: 'Create an alert that triggers when OpenRouter spending approaches thresholds.',
    parameters: {
      type: 'object',
      properties: {
        alert_type: {
          type: 'string',
          enum: ['daily_budget', 'hourly_spike', 'model_cost_anomaly', 'cache_degradation']
        },
        threshold: { type: 'number', description: 'USD amount or percentage' },
        action: {
          type: 'string',
          enum: ['notify', 'reduce_rate_limit', 'force_cheaper_model', 'pause_requests']
        },
        scope: {
          type: 'string',
          description: 'tenant_id, model, or "all"'
        }
      },
      required: ['alert_type', 'threshold', 'action']
    }
  }
];

// ============================================================================
// SEMANTIC CACHE (Shields OpenRouter Calls)
// ============================================================================

export class SemanticCache {
  private genAI: GoogleGenerativeAI;
  
  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const model = this.genAI.getGenerativeModel({ model: GEMINI_MODELS.EMBEDDING });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }

  cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

// ============================================================================
// SENTINEL: Real-Time OpenRouter Monitoring (Flash, Low Thinking)
// ============================================================================

export class Sentinel {
  private genAI: GoogleGenerativeAI;
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;
  
  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: GEMINI_MODELS.FLASH,
      generationConfig: {
        temperature: 0.1,
        // @ts-expect-error - Gemini 3 parameter
        thinking_level: 'low'
      }
    });
  }

  /**
   * Analyze a single OpenRouter request for anomalies
   */
  async analyzeRequest(decision: RouterDecision, baseline: {
    avgCost: number;
    avgLatency: number;
    expectedCacheHitRate: number;
  }): Promise<{
    anomaly: boolean;
    severity: 'low' | 'medium' | 'high';
    issues: string[];
  }> {
    const prompt = `Analyze this OpenRouter routing decision for anomalies:

REQUEST:
- Model: ${decision.selected_model}
- Mode: ${decision.requested_mode}
- Cost: $${decision.cost_usd.toFixed(6)}
- Latency: ${decision.latency_ms}ms
- Cache Hit: ${decision.cache_hit}
- Success: ${decision.success}

BASELINE:
- Avg Cost: $${baseline.avgCost.toFixed(6)}
- Avg Latency: ${baseline.avgLatency}ms
- Expected Cache Rate: ${(baseline.expectedCacheHitRate * 100).toFixed(1)}%

Return JSON: {"anomaly": boolean, "severity": "low"|"medium"|"high", "issues": ["issue1", "issue2"]}`;

    const result = await this.model.generateContent(prompt);
    const text = result.response.text();
    const json = text.match(/\{[\s\S]*\}/)?.[0];
    return json ? JSON.parse(json) : { anomaly: false, severity: 'low', issues: [] };
  }
}

// ============================================================================
// ECONOMIST: Deep OpenRouter Analysis (Pro, High Thinking)
// ============================================================================

export class Economist {
  private genAI: GoogleGenerativeAI;
  private tenantId: string;
  
  constructor(apiKey: string, tenantId: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.tenantId = tenantId;
  }

  /**
   * Run forensic analysis on OpenRouter usage data
   */
  async analyzeOpenRouterUsage(
    decisions: RouterDecision[],
    options: {
      executeOptimizations?: boolean;
      maxOptimizations?: number;
    } = {}
  ): Promise<AuditResult> {
    const { executeOptimizations = true, maxOptimizations = 10 } = options;

    const model = this.genAI.getGenerativeModel({
      model: GEMINI_MODELS.PRO,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 64000,
        // @ts-expect-error - Gemini 3 parameter
        thinking_level: 'high'
      },
      tools: [{ functionDeclarations: ECONOMIST_TOOLS }]
    });

    // Aggregate stats for the prompt
    const stats = this.aggregateStats(decisions);
    
    const systemPrompt = `You are the P402 Protocol Economist analyzing OpenRouter usage patterns.

P402 ARCHITECTURE:
- P402 is a smart router that sends AI requests to OpenRouter (meta-provider with 300+ models)
- You are P402's internal intelligence, using direct Gemini 3 API (NOT via OpenRouter)
- Your job: analyze routing decisions and optimize for cost/speed/quality

AVAILABLE OPENROUTER MODELS (sample):
- openai/gpt-5.2 ($4/$12 per 1M tokens) - Premium reasoning
- anthropic/claude-4.5-opus ($8/$24 per 1M tokens) - Premium coding
- anthropic/claude-3.5-sonnet ($3/$15 per 1M tokens) - Mid-tier balanced
- openai/gpt-4o ($2/$6 per 1M tokens) - Mid-tier fast
- google/gemini-3-flash ($0.075/$0.30 per 1M tokens) - Budget fast
- deepseek/deepseek-v3 ($0.27/$1.10 per 1M tokens) - Budget reasoning

YOUR MANDATE:
1. Identify cost inefficiencies in OpenRouter model selection
2. Find opportunities to improve cache hit rates (cache happens BEFORE OpenRouter)
3. Detect models with poor success/latency and configure failovers
4. Execute optimizations using the available tools

CONSTRAINTS:
- Maximum ${maxOptimizations} optimizations per audit
- Prioritize high-impact changes
- Always explain reasoning before executing`;

    const userPrompt = `OPENROUTER USAGE DATA (${decisions.length} routing decisions):

AGGREGATE STATS:
${JSON.stringify(stats, null, 2)}

RAW DECISIONS (sample of ${Math.min(100, decisions.length)}):
${JSON.stringify(decisions.slice(0, 100), null, 2)}

TASK:
1. Analyze the usage patterns
2. Identify optimization opportunities
3. Execute the most impactful optimizations using the tools
4. Provide a reasoning trace for each decision`;

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'I am the P402 Protocol Economist. I will analyze your OpenRouter usage and execute optimizations. Please provide the data.' }] }
      ]
    });

    const thinkingTrace: string[] = [];
    const executedOptimizations: RoutingOptimization[] = [];

    let response = await chat.sendMessage(userPrompt);

    // Agentic loop - process function calls
    while (true) {
      const text = response.response.text();
      if (text) {
        thinkingTrace.push(...this.extractReasoningSteps(text));
      }

      const functionCalls = response.response.functionCalls();
      if (!functionCalls || functionCalls.length === 0) break;
      if (executedOptimizations.length >= maxOptimizations) {
        thinkingTrace.push(`[LIMIT] Maximum ${maxOptimizations} optimizations reached.`);
        break;
      }

      const functionResponses = [];
      for (const call of functionCalls) {
        const optimization: RoutingOptimization = {
          id: `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: this.mapToolToType(call.name),
          target: this.extractTarget(call.args as Record<string, unknown>),
          current_value: null,
          recommended_value: call.args,
          estimated_savings_usd: 0,
          confidence: 0.8,
          reasoning: ''
        };

        if (executeOptimizations) {
          try {
            const result = await this.executeToolCall(call.name, call.args as Record<string, unknown>);
            optimization.estimated_savings_usd = (result as any)?.estimated_savings_usd || 0;
            executedOptimizations.push(optimization);
            thinkingTrace.push(`[EXECUTED] ${call.name}: ${JSON.stringify(call.args)}`);
            functionResponses.push({ functionResponse: { name: call.name, response: result } });
          } catch (error) {
            thinkingTrace.push(`[FAILED] ${call.name}: ${error}`);
            functionResponses.push({ functionResponse: { name: call.name, response: { error: String(error) } } });
          }
        } else {
          thinkingTrace.push(`[DRY RUN] Would execute: ${call.name}`);
          functionResponses.push({ functionResponse: { name: call.name, response: { status: 'dry_run' } } });
        }
      }

      response = await chat.sendMessage(functionResponses);
    }

    const period = {
      start: new Date(Math.min(...decisions.map(d => new Date(d.timestamp).getTime()))),
      end: new Date(Math.max(...decisions.map(d => new Date(d.timestamp).getTime())))
    };

    return {
      audit_id: `audit_${Date.now()}`,
      tenant_id: this.tenantId,
      period,
      thinking_trace: thinkingTrace,
      usage_stats: stats,
      optimizations: executedOptimizations.map(o => ({ ...o, reasoning: '' })),
      executed_optimizations: executedOptimizations,
      total_estimated_savings_usd: executedOptimizations.reduce((sum, o) => sum + o.estimated_savings_usd, 0),
      model_used: GEMINI_MODELS.PRO,
      thinking_level: 'high',
      context_tokens_used: Math.round(JSON.stringify(decisions).length / 4),
      created_at: new Date()
    };
  }

  private aggregateStats(decisions: RouterDecision[]): OpenRouterUsageStats {
    const byModel: Record<string, { requests: number; cost: number; latency: number[]; cacheHits: number; successes: number }> = {};
    const byMode: Record<string, { requests: number; cost: number }> = {};
    let cacheHits = 0;
    let cacheMisses = 0;
    let totalCost = 0;

    for (const d of decisions) {
      // By model
      if (!byModel[d.selected_model]) {
        byModel[d.selected_model] = { requests: 0, cost: 0, latency: [], cacheHits: 0, successes: 0 };
      }
      byModel[d.selected_model].requests++;
      byModel[d.selected_model].cost += d.cost_usd;
      byModel[d.selected_model].latency.push(d.latency_ms);
      if (d.cache_hit) byModel[d.selected_model].cacheHits++;
      if (d.success) byModel[d.selected_model].successes++;

      // By mode
      if (!byMode[d.requested_mode]) {
        byMode[d.requested_mode] = { requests: 0, cost: 0 };
      }
      byMode[d.requested_mode].requests++;
      byMode[d.requested_mode].cost += d.cost_usd;

      // Cache stats
      if (d.cache_hit) cacheHits++;
      else cacheMisses++;

      totalCost += d.cost_usd;
    }

    // Transform to final format
    const byModelFinal: OpenRouterUsageStats['by_model'] = {};
    for (const [model, data] of Object.entries(byModel)) {
      byModelFinal[model] = {
        requests: data.requests,
        cost_usd: data.cost,
        avg_latency_ms: data.latency.reduce((a, b) => a + b, 0) / data.latency.length,
        cache_hit_rate: data.cacheHits / data.requests,
        success_rate: data.successes / data.requests
      };
    }

    const byModeFinal: OpenRouterUsageStats['by_mode'] = {};
    for (const [mode, data] of Object.entries(byMode)) {
      byModeFinal[mode] = { requests: data.requests, cost_usd: data.cost };
    }

    // Estimate cache savings (assume avg cost of $0.01 per request saved)
    const avgCostPerRequest = totalCost / (cacheHits + cacheMisses);
    const cacheSavings = cacheHits * avgCostPerRequest;

    return {
      total_requests: decisions.length,
      total_cost_usd: totalCost,
      by_model: byModelFinal,
      by_mode: byModeFinal,
      cache_stats: {
        hits: cacheHits,
        misses: cacheMisses,
        hit_rate: cacheHits / (cacheHits + cacheMisses),
        savings_usd: cacheSavings
      }
    };
  }

  private extractReasoningSteps(text: string): string[] {
    const steps: string[] = [];
    const patterns = [
      /(?:^|\n)\d+\.\s*(.+)/g,
      /(?:^|\n)[•\-\*]\s*(.+)/g,
      /(?:^|\n)I (?:notice|observe|see|found|recommend|will)(.+?)(?:\n|$)/gi
    ];
    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) {
        if (match[1]?.trim().length > 10) steps.push(match[1].trim());
      }
    }
    return steps;
  }

  private mapToolToType(toolName: string): RoutingOptimization['type'] {
    const map: Record<string, RoutingOptimization['type']> = {
      'configure_model_substitution': 'model_substitution',
      'configure_semantic_cache': 'cache_policy',
      'set_model_rate_limit': 'rate_limit',
      'adjust_routing_weights': 'routing_weight',
      'configure_failover_chain': 'failover_config'
    };
    return map[toolName] || 'routing_weight';
  }

  private extractTarget(args: Record<string, unknown>): string {
    return (args.model || args.primary_model || args.rule_name || args.mode || 'global') as string;
  }

  private async executeToolCall(name: string, args: Record<string, unknown>): Promise<unknown> {
    // In production, these call actual P402 router configuration APIs
    // For now, return mock results
    const mockResults: Record<string, unknown> = {
      get_openrouter_usage: { status: 'success', data: 'stats_returned' },
      configure_model_substitution: { status: 'success', estimated_savings_usd: Math.random() * 50 },
      adjust_routing_weights: { status: 'success', estimated_savings_usd: Math.random() * 30 },
      configure_semantic_cache: { status: 'success', estimated_savings_usd: Math.random() * 100 },
      set_model_rate_limit: { status: 'success' },
      configure_failover_chain: { status: 'success' },
      create_cost_alert: { status: 'success', alert_id: `alert_${Date.now()}` }
    };
    return mockResults[name] || { status: 'unknown_tool' };
  }
}

// ============================================================================
// MAIN EXPORT: OpenRouter-Aware Optimizer
// ============================================================================

export class GeminiOptimizer {
  private sentinel: Sentinel;
  private economist: Economist;
  
  constructor(apiKey: string, tenantId: string) {
    this.sentinel = new Sentinel(apiKey);
    this.economist = new Economist(apiKey, tenantId);
  }

  /**
   * Real-time analysis of individual OpenRouter requests
   */
  async analyzeRequest(decision: RouterDecision, baseline: Parameters<Sentinel['analyzeRequest']>[1]) {
    return this.sentinel.analyzeRequest(decision, baseline);
  }

  /**
   * Deep analysis of OpenRouter usage patterns with autonomous optimization
   */
  async runForensicAudit(decisions: RouterDecision[], options?: Parameters<Economist['analyzeOpenRouterUsage']>[1]) {
    return this.economist.analyzeOpenRouterUsage(decisions, options);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { GEMINI_MODELS, OPENROUTER_MODELS, ECONOMIST_TOOLS };
export type { RouterDecision, OpenRouterUsageStats, RoutingOptimization, AuditResult };
