/**
 * P402 Intelligence Layer: Gemini 3 Integration
 * 
 * This module implements a three-tier intelligence system:
 * 1. Semantic Cache - Embedding-based similarity matching (Shield Layer)
 * 2. Sentinel - Real-time anomaly detection (Flash, low thinking)
 * 3. Economist - Deep forensic analysis with autonomous execution (Pro, high thinking)
 * 
 * Built for Gemini 3 Hackathon - Marathon Agent Track
 */

import { GoogleGenerativeAI, FunctionDeclaration, Tool } from '@google/generative-ai';

// ============================================================================
// CORRECT MODEL IDENTIFIERS (Gemini 3)
// ============================================================================
const MODELS = {
  PRO: 'gemini-3-pro-preview',
  FLASH: 'gemini-3-flash-preview',
  EMBEDDING: 'text-embedding-004'
} as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface LedgerEntry {
  id: string;
  tenant_id: string;
  request_id: string;
  model: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  latency_ms: number;
  cache_hit: boolean;
  created_at: string;
  metadata?: Record<string, unknown>;
}

interface CostMetric {
  timestamp: string;
  total_cost: number;
  request_count: number;
  avg_latency: number;
  cache_hit_rate: number;
  top_models: Array<{ model: string; cost: number; count: number }>;
}

interface AnomalyResult {
  is_anomaly: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  metric_value: number;
  expected_range: [number, number];
}

interface Finding {
  id: string;
  category: 'waste' | 'inefficiency' | 'risk' | 'opportunity';
  title: string;
  description: string;
  impact_usd: number;
  confidence: number;
}

interface Action {
  id: string;
  tool: string;
  args: Record<string, unknown>;
  status: 'pending' | 'executed' | 'failed';
  result?: unknown;
  executed_at?: string;
}

interface AuditResult {
  audit_id: string;
  tenant_id: string;
  thinking_trace: string[];      // Reasoning steps from the model
  findings: Finding[];
  recommendations: Action[];
  executed_actions: Action[];
  total_savings_usd: number;
  created_at: string;
  model_used: string;
  thinking_level: 'low' | 'high';
  context_tokens_used: number;
}

interface SemanticCacheEntry {
  id: string;
  query_embedding: number[];
  query_text: string;
  response: AuditResult;
  tenant_id: string;
  model_used: string;
  created_at: string;
  hit_count: number;
}

interface CacheResult {
  found: boolean;
  response?: AuditResult;
  similarity?: number;
  cache_id?: string;
}

// ============================================================================
// TOOL DEFINITIONS FOR AGENTIC EXECUTION
// ============================================================================

const ECONOMIST_TOOLS: FunctionDeclaration[] = [
  {
    name: 'get_cost_metrics',
    description: 'Retrieve aggregated cost metrics for a specified time period. Use this to understand spending patterns before making optimization decisions.',
    parameters: {
      type: 'object',
      properties: {
        start_time: { 
          type: 'string', 
          description: 'ISO 8601 datetime for period start' 
        },
        end_time: { 
          type: 'string', 
          description: 'ISO 8601 datetime for period end' 
        },
        granularity: { 
          type: 'string', 
          enum: ['hourly', 'daily', 'weekly'],
          description: 'Time bucket granularity for aggregation'
        },
        group_by: {
          type: 'string',
          enum: ['model', 'provider', 'endpoint'],
          description: 'Dimension to group metrics by'
        }
      },
      required: ['start_time', 'end_time']
    }
  },
  {
    name: 'enable_semantic_cache',
    description: 'Enable or configure semantic caching for a specific model or endpoint to reduce redundant API calls.',
    parameters: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          description: 'Model name or endpoint path to enable caching for'
        },
        similarity_threshold: {
          type: 'number',
          description: 'Minimum similarity score (0-1) for cache hits. Higher = stricter matching.'
        },
        ttl_seconds: {
          type: 'number',
          description: 'Cache entry time-to-live in seconds'
        }
      },
      required: ['target', 'similarity_threshold']
    }
  },
  {
    name: 'adjust_rate_limit',
    description: 'Modify rate limiting configuration to prevent budget overruns or optimize throughput.',
    parameters: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          description: 'Model, provider, or endpoint to rate limit'
        },
        requests_per_minute: {
          type: 'number',
          description: 'Maximum requests per minute'
        },
        tokens_per_minute: {
          type: 'number',
          description: 'Maximum tokens per minute'
        },
        cost_per_hour_usd: {
          type: 'number',
          description: 'Maximum cost per hour in USD'
        }
      },
      required: ['target']
    }
  },
  {
    name: 'configure_model_routing',
    description: 'Set up intelligent model routing to automatically downgrade to cheaper models for simple requests.',
    parameters: {
      type: 'object',
      properties: {
        complexity_threshold: {
          type: 'number',
          description: 'Request complexity score (0-1) below which to use cheaper model'
        },
        primary_model: {
          type: 'string',
          description: 'Model for complex requests'
        },
        fallback_model: {
          type: 'string',
          description: 'Cheaper model for simple requests'
        },
        enabled: {
          type: 'boolean',
          description: 'Whether to enable this routing rule'
        }
      },
      required: ['complexity_threshold', 'primary_model', 'fallback_model']
    }
  },
  {
    name: 'create_budget_alert',
    description: 'Create an alert that triggers when spending approaches or exceeds thresholds.',
    parameters: {
      type: 'object',
      properties: {
        alert_type: {
          type: 'string',
          enum: ['absolute_threshold', 'percentage_of_budget', 'anomaly_detection', 'rate_of_change'],
          description: 'Type of alert trigger'
        },
        threshold_value: {
          type: 'number',
          description: 'Threshold value (USD for absolute, percentage for others)'
        },
        time_window: {
          type: 'string',
          enum: ['hourly', 'daily', 'weekly', 'monthly'],
          description: 'Time window for threshold evaluation'
        },
        notification_channels: {
          type: 'array',
          items: { type: 'string' },
          description: 'Channels to notify: webhook, email, slack'
        },
        auto_action: {
          type: 'string',
          enum: ['none', 'reduce_rate_limit', 'enable_cache', 'pause_requests'],
          description: 'Automatic action to take when alert triggers'
        }
      },
      required: ['alert_type', 'threshold_value', 'time_window']
    }
  },
  {
    name: 'execute_batch_optimization',
    description: 'Enable request batching to reduce per-request overhead and improve throughput.',
    parameters: {
      type: 'object',
      properties: {
        target_endpoint: {
          type: 'string',
          description: 'Endpoint to enable batching for'
        },
        batch_size: {
          type: 'number',
          description: 'Maximum requests per batch'
        },
        batch_window_ms: {
          type: 'number',
          description: 'Time window in ms to collect requests before batching'
        },
        enabled: {
          type: 'boolean'
        }
      },
      required: ['target_endpoint', 'batch_size', 'batch_window_ms']
    }
  }
];

// ============================================================================
// SEMANTIC CACHE IMPLEMENTATION
// ============================================================================

export class SemanticCache {
  private genAI: GoogleGenerativeAI;
  private vectorStore: Map<string, SemanticCacheEntry[]>; // In production: use Pinecone/Weaviate
  
  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.vectorStore = new Map();
  }

  /**
   * Generate embedding for a query using text-embedding-004
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const model = this.genAI.getGenerativeModel({ model: MODELS.EMBEDDING });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Semantic lookup - find cached results with similar queries
   * This is TRUE semantic caching using embeddings, not hash-based
   */
  async lookup(
    query: string, 
    tenantId: string, 
    threshold: number = 0.92
  ): Promise<CacheResult> {
    const queryEmbedding = await this.generateEmbedding(query);
    const tenantCache = this.vectorStore.get(tenantId) || [];
    
    let bestMatch: { entry: SemanticCacheEntry; similarity: number } | null = null;
    
    for (const entry of tenantCache) {
      const similarity = this.cosineSimilarity(queryEmbedding, entry.query_embedding);
      
      if (similarity >= threshold) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { entry, similarity };
        }
      }
    }
    
    if (bestMatch) {
      // Update hit count
      bestMatch.entry.hit_count++;
      
      return {
        found: true,
        response: bestMatch.entry.response,
        similarity: bestMatch.similarity,
        cache_id: bestMatch.entry.id
      };
    }
    
    return { found: false };
  }

  /**
   * Store a new cache entry with its embedding
   */
  async store(
    query: string,
    response: AuditResult,
    tenantId: string,
    modelUsed: string
  ): Promise<string> {
    const queryEmbedding = await this.generateEmbedding(query);
    const cacheId = `cache_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const entry: SemanticCacheEntry = {
      id: cacheId,
      query_embedding: queryEmbedding,
      query_text: query,
      response,
      tenant_id: tenantId,
      model_used: modelUsed,
      created_at: new Date().toISOString(),
      hit_count: 0
    };
    
    const tenantCache = this.vectorStore.get(tenantId) || [];
    tenantCache.push(entry);
    this.vectorStore.set(tenantId, tenantCache);
    
    return cacheId;
  }

  /**
   * Invalidate cache entries older than TTL
   */
  invalidateExpired(tenantId: string, ttlMs: number): number {
    const tenantCache = this.vectorStore.get(tenantId) || [];
    const cutoff = Date.now() - ttlMs;
    
    const validEntries = tenantCache.filter(
      entry => new Date(entry.created_at).getTime() > cutoff
    );
    
    const invalidatedCount = tenantCache.length - validEntries.length;
    this.vectorStore.set(tenantId, validEntries);
    
    return invalidatedCount;
  }
}

// ============================================================================
// SENTINEL: Real-Time Anomaly Detection (Flash, Low Thinking)
// ============================================================================

export class Sentinel {
  private genAI: GoogleGenerativeAI;
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;
  
  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: MODELS.FLASH,
      generationConfig: {
        temperature: 0.1, // Low temperature for consistent anomaly detection
        // @ts-expect-error - Gemini 3 parameter not in types yet
        thinking_level: 'low' // Fast, low-latency for real-time monitoring
      }
    });
  }

  /**
   * Analyze a single metric for anomalies
   * Designed for real-time streaming with <500ms latency
   */
  async detectAnomaly(
    metric: CostMetric,
    historicalBaseline: { mean: number; stdDev: number }
  ): Promise<AnomalyResult> {
    const prompt = `You are a cost anomaly detector for AI infrastructure. Analyze this metric against the baseline.

METRIC:
${JSON.stringify(metric, null, 2)}

BASELINE:
- Mean: $${historicalBaseline.mean.toFixed(4)}/request
- Standard Deviation: $${historicalBaseline.stdDev.toFixed(4)}
- Expected Range: $${(historicalBaseline.mean - 2 * historicalBaseline.stdDev).toFixed(4)} - $${(historicalBaseline.mean + 2 * historicalBaseline.stdDev).toFixed(4)}

Respond with JSON only:
{
  "is_anomaly": boolean,
  "severity": "low" | "medium" | "high" | "critical",
  "reason": "brief explanation",
  "metric_value": number,
  "expected_range": [lower_bound, upper_bound]
}`;

    const result = await this.model.generateContent(prompt);
    const text = result.response.text();
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse anomaly detection response');
    }
    
    return JSON.parse(jsonMatch[0]) as AnomalyResult;
  }

  /**
   * Stream-based monitoring for continuous anomaly detection
   */
  async *monitorStream(
    metricsStream: AsyncIterable<CostMetric>,
    baseline: { mean: number; stdDev: number },
    onAnomaly: (anomaly: AnomalyResult, metric: CostMetric) => Promise<void>
  ): AsyncGenerator<{ metric: CostMetric; result: AnomalyResult }> {
    for await (const metric of metricsStream) {
      const result = await this.detectAnomaly(metric, baseline);
      
      if (result.is_anomaly && result.severity !== 'low') {
        await onAnomaly(result, metric);
      }
      
      yield { metric, result };
    }
  }
}

// ============================================================================
// ECONOMIST: Deep Forensic Analysis (Pro, High Thinking)
// ============================================================================

export class Economist {
  private genAI: GoogleGenerativeAI;
  private cache: SemanticCache;
  private tenantId: string;
  
  constructor(apiKey: string, tenantId: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.cache = new SemanticCache(apiKey);
    this.tenantId = tenantId;
  }

  /**
   * Run a full forensic audit with autonomous optimization execution
   * This is the "Marathon Agent" - runs autonomously, executes actions without human supervision
   */
  async runForensicAudit(
    ledgerData: LedgerEntry[],
    options: {
      executeActions?: boolean;
      maxActions?: number;
      budgetConstraint?: number;
    } = {}
  ): Promise<AuditResult> {
    const { executeActions = true, maxActions = 10, budgetConstraint } = options;
    
    // Generate a semantic query for cache lookup
    const cacheQuery = this.generateCacheQuery(ledgerData);
    
    // Check semantic cache first (Shield Layer)
    const cached = await this.cache.lookup(cacheQuery, this.tenantId);
    if (cached.found && cached.response) {
      return {
        ...cached.response,
        audit_id: `audit_cached_${Date.now()}`,
        // Mark as cached hit
        thinking_trace: [`[CACHE HIT] Similarity: ${(cached.similarity! * 100).toFixed(1)}%`, ...cached.response.thinking_trace]
      };
    }
    
    // Initialize Pro model with high thinking level for deep analysis
    const model = this.genAI.getGenerativeModel({
      model: MODELS.PRO,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 64000,
        // @ts-expect-error - Gemini 3 parameter
        thinking_level: 'high' // Deep reasoning for forensic analysis
      },
      tools: [{ functionDeclarations: ECONOMIST_TOOLS }]
    });

    // Construct the forensic audit prompt
    const systemPrompt = `You are the P402 Protocol Economist, an autonomous AI agent responsible for optimizing AI infrastructure costs. You have been granted authority to analyze spending patterns and execute optimizations without human approval.

YOUR MANDATE:
1. Identify cost inefficiencies, waste, and optimization opportunities
2. Use the available tools to execute corrective actions
3. Create alerts to prevent future issues
4. Provide a clear reasoning trace for all decisions

CONSTRAINTS:
- Maximum ${maxActions} actions per audit
${budgetConstraint ? `- Do not execute actions that could increase costs above $${budgetConstraint}/day` : ''}
- Prioritize high-impact, low-risk optimizations
- Always explain your reasoning before executing actions

AVAILABLE TOOLS:
- get_cost_metrics: Retrieve historical spending data
- enable_semantic_cache: Reduce redundant API calls
- adjust_rate_limit: Prevent budget overruns
- configure_model_routing: Route simple requests to cheaper models
- create_budget_alert: Set up proactive monitoring
- execute_batch_optimization: Improve throughput efficiency`;

    const userPrompt = `PROTOCOL LEDGER (Last 7 Days - ${ledgerData.length} entries, ~${Math.round(JSON.stringify(ledgerData).length / 4)} tokens):

${JSON.stringify(ledgerData, null, 2)}

TASK:
Perform a comprehensive forensic cost audit. For each finding:
1. State your reasoning clearly
2. Quantify the potential savings
3. Execute the appropriate optimization tool
4. Verify the action was successful

Begin your analysis now. Execute actions autonomously.`;

    // Start the agentic conversation
    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'I am the P402 Protocol Economist. I will analyze the ledger data and execute optimizations autonomously. Please provide the protocol ledger.' }] }
      ]
    });

    const thinkingTrace: string[] = [];
    const findings: Finding[] = [];
    const executedActions: Action[] = [];
    let totalSavings = 0;

    // Send the ledger data and start the agentic loop
    let response = await chat.sendMessage(userPrompt);
    
    // Process the agentic loop - handle function calls until complete
    while (true) {
      const functionCalls = response.response.functionCalls();
      
      // Extract thinking from the response text
      const responseText = response.response.text();
      if (responseText) {
        // Parse reasoning steps from the response
        const reasoningSteps = this.extractReasoningSteps(responseText);
        thinkingTrace.push(...reasoningSteps);
        
        // Parse any findings mentioned
        const parsedFindings = this.parseFindings(responseText);
        findings.push(...parsedFindings);
      }
      
      // If no more function calls, we're done
      if (!functionCalls || functionCalls.length === 0) {
        break;
      }
      
      // Check action limit
      if (executedActions.length >= maxActions) {
        thinkingTrace.push(`[LIMIT REACHED] Maximum ${maxActions} actions executed. Stopping.`);
        break;
      }
      
      // Execute function calls if enabled
      const functionResponses = [];
      for (const call of functionCalls) {
        const action: Action = {
          id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          tool: call.name,
          args: call.args as Record<string, unknown>,
          status: 'pending'
        };
        
        if (executeActions) {
          try {
            const result = await this.executeToolCall(call.name, call.args as Record<string, unknown>);
            action.status = 'executed';
            action.result = result;
            action.executed_at = new Date().toISOString();
            
            // Track savings if applicable
            if (result && typeof result === 'object' && 'estimated_savings_usd' in result) {
              totalSavings += (result as { estimated_savings_usd: number }).estimated_savings_usd;
            }
            
            functionResponses.push({
              functionResponse: {
                name: call.name,
                response: result
              }
            });
            
            thinkingTrace.push(`[EXECUTED] ${call.name}: ${JSON.stringify(call.args)}`);
          } catch (error) {
            action.status = 'failed';
            action.result = { error: String(error) };
            
            functionResponses.push({
              functionResponse: {
                name: call.name,
                response: { error: String(error) }
              }
            });
            
            thinkingTrace.push(`[FAILED] ${call.name}: ${error}`);
          }
        } else {
          action.status = 'pending';
          functionResponses.push({
            functionResponse: {
              name: call.name,
              response: { status: 'dry_run', message: 'Action not executed (dry run mode)' }
            }
          });
          thinkingTrace.push(`[DRY RUN] Would execute ${call.name}: ${JSON.stringify(call.args)}`);
        }
        
        executedActions.push(action);
      }
      
      // Continue the conversation with function results
      response = await chat.sendMessage(functionResponses);
    }

    // Build the final audit result
    const auditResult: AuditResult = {
      audit_id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenant_id: this.tenantId,
      thinking_trace: thinkingTrace,
      findings,
      recommendations: executedActions.filter(a => a.status === 'pending'),
      executed_actions: executedActions.filter(a => a.status === 'executed'),
      total_savings_usd: totalSavings,
      created_at: new Date().toISOString(),
      model_used: MODELS.PRO,
      thinking_level: 'high',
      context_tokens_used: Math.round(JSON.stringify(ledgerData).length / 4)
    };

    // Store in semantic cache for future similar queries
    await this.cache.store(cacheQuery, auditResult, this.tenantId, MODELS.PRO);

    return auditResult;
  }

  /**
   * Generate a semantic query representation of the ledger data
   * This captures the "meaning" of the data for cache matching
   */
  private generateCacheQuery(ledgerData: LedgerEntry[]): string {
    // Extract key characteristics that define the "semantics" of this audit
    const totalCost = ledgerData.reduce((sum, e) => sum + e.cost_usd, 0);
    const uniqueModels = [...new Set(ledgerData.map(e => e.model))];
    const uniqueProviders = [...new Set(ledgerData.map(e => e.provider))];
    const avgLatency = ledgerData.reduce((sum, e) => sum + e.latency_ms, 0) / ledgerData.length;
    const cacheHitRate = ledgerData.filter(e => e.cache_hit).length / ledgerData.length;
    const timeRange = {
      start: ledgerData[ledgerData.length - 1]?.created_at,
      end: ledgerData[0]?.created_at
    };
    
    // Build a semantic description that embeddings can match against
    return `Cost audit for tenant ${this.tenantId}: 
      Total spend $${totalCost.toFixed(2)} across ${ledgerData.length} requests.
      Models: ${uniqueModels.join(', ')}.
      Providers: ${uniqueProviders.join(', ')}.
      Average latency: ${avgLatency.toFixed(0)}ms.
      Cache hit rate: ${(cacheHitRate * 100).toFixed(1)}%.
      Time range: ${timeRange.start} to ${timeRange.end}.`;
  }

  /**
   * Extract reasoning steps from model response
   */
  private extractReasoningSteps(text: string): string[] {
    const steps: string[] = [];
    
    // Look for numbered steps, bullet points, or "I" statements indicating reasoning
    const patterns = [
      /(?:^|\n)\d+\.\s*(.+)/g,
      /(?:^|\n)[•\-\*]\s*(.+)/g,
      /(?:^|\n)I (?:notice|observe|see|found|identified|recommend|will|am|have)(.+?)(?:\n|$)/gi
    ];
    
    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const step = match[1]?.trim();
        if (step && step.length > 10) {
          steps.push(step);
        }
      }
    }
    
    // If no structured steps found, take the first few sentences
    if (steps.length === 0) {
      const sentences = text.split(/[.!?]+/).slice(0, 5);
      steps.push(...sentences.filter(s => s.trim().length > 20).map(s => s.trim()));
    }
    
    return steps;
  }

  /**
   * Parse findings from model response
   */
  private parseFindings(text: string): Finding[] {
    const findings: Finding[] = [];
    
    // Look for cost/savings mentions
    const savingsPattern = /(?:save|saving|waste|inefficien|cost|spend)[^.]*\$?([\d,]+(?:\.\d{2})?)/gi;
    const matches = text.matchAll(savingsPattern);
    
    for (const match of matches) {
      const amount = parseFloat(match[1].replace(',', ''));
      if (!isNaN(amount) && amount > 0) {
        // Extract context around the match
        const start = Math.max(0, match.index! - 100);
        const end = Math.min(text.length, match.index! + match[0].length + 100);
        const context = text.slice(start, end);
        
        findings.push({
          id: `finding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          category: context.toLowerCase().includes('waste') ? 'waste' : 
                   context.toLowerCase().includes('risk') ? 'risk' : 
                   context.toLowerCase().includes('opportunit') ? 'opportunity' : 'inefficiency',
          title: `Cost ${context.toLowerCase().includes('waste') ? 'Waste' : 'Inefficiency'} Detected`,
          description: context.trim(),
          impact_usd: amount,
          confidence: 0.8
        });
      }
    }
    
    return findings;
  }

  /**
   * Execute a tool call against P402 infrastructure
   * In production, these would call actual P402 APIs
   */
  private async executeToolCall(
    toolName: string, 
    args: Record<string, unknown>
  ): Promise<unknown> {
    // Simulate tool execution with realistic responses
    // In production, these would call actual P402 backend APIs
    
    switch (toolName) {
      case 'get_cost_metrics':
        return {
          status: 'success',
          metrics: {
            total_cost: Math.random() * 1000,
            request_count: Math.floor(Math.random() * 10000),
            avg_latency: Math.floor(Math.random() * 500),
            cache_hit_rate: Math.random() * 0.5
          }
        };
        
      case 'enable_semantic_cache':
        return {
          status: 'success',
          message: `Semantic cache enabled for ${args.target}`,
          estimated_savings_usd: Math.random() * 100,
          config: {
            similarity_threshold: args.similarity_threshold,
            ttl_seconds: args.ttl_seconds || 3600
          }
        };
        
      case 'adjust_rate_limit':
        return {
          status: 'success',
          message: `Rate limit adjusted for ${args.target}`,
          previous_config: { requests_per_minute: 1000 },
          new_config: {
            requests_per_minute: args.requests_per_minute,
            tokens_per_minute: args.tokens_per_minute,
            cost_per_hour_usd: args.cost_per_hour_usd
          }
        };
        
      case 'configure_model_routing':
        return {
          status: 'success',
          message: `Model routing configured: ${args.primary_model} -> ${args.fallback_model}`,
          estimated_savings_usd: Math.random() * 200,
          config: {
            complexity_threshold: args.complexity_threshold,
            enabled: args.enabled
          }
        };
        
      case 'create_budget_alert':
        return {
          status: 'success',
          alert_id: `alert_${Date.now()}`,
          message: `Budget alert created: ${args.alert_type} at ${args.threshold_value}`,
          config: {
            alert_type: args.alert_type,
            threshold_value: args.threshold_value,
            time_window: args.time_window,
            auto_action: args.auto_action
          }
        };
        
      case 'execute_batch_optimization':
        return {
          status: 'success',
          message: `Batching enabled for ${args.target_endpoint}`,
          estimated_savings_usd: Math.random() * 50,
          config: {
            batch_size: args.batch_size,
            batch_window_ms: args.batch_window_ms
          }
        };
        
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
}

// ============================================================================
// MAIN OPTIMIZER CLASS (PUBLIC API)
// ============================================================================

export class GeminiOptimizer {
  private sentinel: Sentinel;
  private economist: Economist;
  private cache: SemanticCache;
  
  constructor(
    apiKey: string,
    tenantId: string
  ) {
    this.sentinel = new Sentinel(apiKey);
    this.economist = new Economist(apiKey, tenantId);
    this.cache = new SemanticCache(apiKey);
  }

  /**
   * Real-time anomaly detection (Flash, low thinking)
   * Use for continuous monitoring with <500ms latency
   */
  async detectAnomaly(metric: CostMetric, baseline: { mean: number; stdDev: number }) {
    return this.sentinel.detectAnomaly(metric, baseline);
  }

  /**
   * Full forensic audit with autonomous execution (Pro, high thinking)
   * Use for periodic deep analysis (hourly/daily)
   */
  async runForensicAudit(ledgerData: LedgerEntry[], options?: {
    executeActions?: boolean;
    maxActions?: number;
    budgetConstraint?: number;
  }) {
    return this.economist.runForensicAudit(ledgerData, options);
  }

  /**
   * Stream-based continuous monitoring
   * Use for Marathon Agent pattern
   */
  async *monitorContinuously(
    metricsStream: AsyncIterable<CostMetric>,
    baseline: { mean: number; stdDev: number },
    onCriticalAnomaly: (anomaly: AnomalyResult, metric: CostMetric) => Promise<void>
  ) {
    yield* this.sentinel.monitorStream(metricsStream, baseline, onCriticalAnomaly);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { MODELS, ECONOMIST_TOOLS };
export type { 
  LedgerEntry, 
  CostMetric, 
  AnomalyResult, 
  Finding, 
  Action, 
  AuditResult,
  CacheResult 
};
