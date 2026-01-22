/**
 * ThinkingTrace Component
 * 
 * Displays Gemini 3's reasoning chain in real-time with neo-brutalist styling.
 * This is a key differentiator for the hackathon - surfacing the model's "thought process".
 * 
 * Design: P402 Neo-Brutalist (thick borders, high contrast, monospace)
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface ThinkingStep {
  id: string;
  type: 'reasoning' | 'tool_call' | 'tool_result' | 'conclusion' | 'cache_hit';
  content: string;
  timestamp: number;
  metadata?: {
    tool?: string;
    args?: Record<string, unknown>;
    status?: 'pending' | 'executing' | 'success' | 'failed';
    savings?: number;
  };
}

interface ThinkingTraceProps {
  steps: ThinkingStep[];
  isStreaming?: boolean;
  modelInfo?: {
    model: string;
    thinkingLevel: 'low' | 'high';
    contextTokens?: number;
  };
  onStepClick?: (step: ThinkingStep) => void;
  className?: string;
}

// ============================================================================
// STEP TYPE CONFIGS
// ============================================================================

const STEP_CONFIGS: Record<ThinkingStep['type'], {
  icon: string;
  label: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}> = {
  reasoning: {
    icon: '🧠',
    label: 'REASONING',
    bgColor: 'bg-neutral-100',
    borderColor: 'border-neutral-900',
    textColor: 'text-neutral-900'
  },
  tool_call: {
    icon: '⚡',
    label: 'TOOL CALL',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-600',
    textColor: 'text-cyan-900'
  },
  tool_result: {
    icon: '✓',
    label: 'EXECUTED',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-600',
    textColor: 'text-green-900'
  },
  conclusion: {
    icon: '📊',
    label: 'CONCLUSION',
    bgColor: 'bg-primary-light',
    borderColor: 'border-neutral-900',
    textColor: 'text-neutral-900'
  },
  cache_hit: {
    icon: '💾',
    label: 'CACHE HIT',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-600',
    textColor: 'text-amber-900'
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ThinkingTrace({
  steps,
  isStreaming = false,
  modelInfo,
  onStepClick,
  className
}: ThinkingTraceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  // Auto-scroll to bottom when new steps arrive
  useEffect(() => {
    if (isStreaming && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [steps, isStreaming]);

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  return (
    <div 
      className={cn(
        'border-2 border-neutral-900 bg-white',
        className
      )}
    >
      {/* Header */}
      <div className="border-b-2 border-neutral-900 bg-neutral-900 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-primary font-mono text-sm font-bold">
            THINKING TRACE
          </span>
          {isStreaming && (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-neutral-400 text-xs font-mono">STREAMING</span>
            </span>
          )}
        </div>
        
        {modelInfo && (
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="text-neutral-400">
              MODEL: <span className="text-white">{modelInfo.model}</span>
            </span>
            <span className="text-neutral-400">
              THINKING: <span className={cn(
                modelInfo.thinkingLevel === 'high' ? 'text-amber-400' : 'text-cyan-400'
              )}>
                {modelInfo.thinkingLevel.toUpperCase()}
              </span>
            </span>
            {modelInfo.contextTokens && (
              <span className="text-neutral-400">
                CONTEXT: <span className="text-white">{modelInfo.contextTokens.toLocaleString()} tokens</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Steps Container */}
      <div 
        ref={containerRef}
        className="max-h-[500px] overflow-y-auto p-4 space-y-3 bg-neutral-50"
      >
        {steps.length === 0 ? (
          <div className="text-center py-12 text-neutral-500 font-mono text-sm">
            Waiting for model reasoning...
          </div>
        ) : (
          steps.map((step, index) => (
            <ThinkingStepCard
              key={step.id}
              step={step}
              index={index}
              isExpanded={expandedSteps.has(step.id)}
              onToggle={() => toggleStep(step.id)}
              onClick={() => onStepClick?.(step)}
              isLatest={index === steps.length - 1 && isStreaming}
            />
          ))
        )}
      </div>

      {/* Footer Stats */}
      {steps.length > 0 && (
        <div className="border-t-2 border-neutral-900 bg-neutral-100 px-4 py-2 flex items-center justify-between text-xs font-mono">
          <span className="text-neutral-600">
            {steps.length} steps • {steps.filter(s => s.type === 'tool_call').length} tool calls
          </span>
          {steps.some(s => s.metadata?.savings) && (
            <span className="text-green-700 font-bold">
              SAVINGS: ${steps.reduce((sum, s) => sum + (s.metadata?.savings || 0), 0).toFixed(2)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STEP CARD COMPONENT
// ============================================================================

interface ThinkingStepCardProps {
  step: ThinkingStep;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onClick?: () => void;
  isLatest?: boolean;
}

function ThinkingStepCard({
  step,
  index,
  isExpanded,
  onToggle,
  onClick,
  isLatest
}: ThinkingStepCardProps) {
  const config = STEP_CONFIGS[step.type];
  
  return (
    <div 
      className={cn(
        'border-2 transition-all duration-150',
        config.borderColor,
        config.bgColor,
        isLatest && 'ring-2 ring-primary ring-offset-2',
        onClick && 'cursor-pointer hover:-translate-y-0.5'
      )}
      onClick={onClick}
    >
      {/* Step Header */}
      <div 
        className="flex items-center justify-between px-3 py-2 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.icon}</span>
          <span className={cn(
            'text-xs font-bold font-mono uppercase',
            config.textColor
          )}>
            {config.label}
          </span>
          <span className="text-neutral-400 text-xs font-mono">
            #{index + 1}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {step.metadata?.status && (
            <StatusBadge status={step.metadata.status} />
          )}
          {step.metadata?.savings && (
            <span className="text-xs font-mono text-green-700 font-bold">
              +${step.metadata.savings.toFixed(2)}
            </span>
          )}
          <span className="text-neutral-400 text-xs font-mono">
            {formatTimestamp(step.timestamp)}
          </span>
          <span className={cn(
            'text-neutral-500 transition-transform',
            isExpanded && 'rotate-180'
          )}>
            ▼
          </span>
        </div>
      </div>

      {/* Step Content */}
      <div className={cn(
        'border-t-2 overflow-hidden transition-all duration-200',
        config.borderColor,
        isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
      )}>
        <div className="p-3">
          {/* Main Content */}
          <pre className={cn(
            'font-mono text-sm whitespace-pre-wrap',
            config.textColor
          )}>
            {step.content}
          </pre>
          
          {/* Tool Args (if tool call) */}
          {step.metadata?.tool && step.metadata?.args && (
            <div className="mt-3 p-2 bg-neutral-900 border-2 border-neutral-700">
              <div className="text-xs text-neutral-400 font-mono mb-1">
                {step.metadata.tool}()
              </div>
              <pre className="text-xs text-cyan-400 font-mono overflow-x-auto">
                {JSON.stringify(step.metadata.args, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Collapsed Preview */}
      {!isExpanded && (
        <div className="px-3 pb-2">
          <p className={cn(
            'font-mono text-sm truncate',
            config.textColor
          )}>
            {step.content.slice(0, 100)}{step.content.length > 100 ? '...' : ''}
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function StatusBadge({ status }: { status: 'pending' | 'executing' | 'success' | 'failed' }) {
  const configs = {
    pending: { bg: 'bg-neutral-200', text: 'text-neutral-600', label: 'PENDING' },
    executing: { bg: 'bg-cyan-200', text: 'text-cyan-800', label: 'EXECUTING' },
    success: { bg: 'bg-green-200', text: 'text-green-800', label: 'SUCCESS' },
    failed: { bg: 'bg-red-200', text: 'text-red-800', label: 'FAILED' }
  };
  
  const config = configs[status];
  
  return (
    <span className={cn(
      'px-2 py-0.5 text-xs font-bold font-mono border border-current',
      config.bg,
      config.text
    )}>
      {config.label}
    </span>
  );
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
}

// ============================================================================
// DEMO/EXAMPLE USAGE
// ============================================================================

export function ThinkingTraceDemo() {
  const [steps, setSteps] = useState<ThinkingStep[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const simulateAudit = async () => {
    setSteps([]);
    setIsStreaming(true);

    const demoSteps: Omit<ThinkingStep, 'id' | 'timestamp'>[] = [
      {
        type: 'reasoning',
        content: 'Analyzing 7-day transaction history. I notice model gpt-4-turbo has a 42% cache miss rate, significantly higher than the baseline 15%.'
      },
      {
        type: 'tool_call',
        content: 'Enabling semantic caching for gpt-4-turbo with 0.92 similarity threshold',
        metadata: {
          tool: 'enable_semantic_cache',
          args: { target: 'gpt-4-turbo', similarity_threshold: 0.92, ttl_seconds: 3600 },
          status: 'executing'
        }
      },
      {
        type: 'tool_result',
        content: 'Semantic cache enabled successfully. Estimated monthly savings: $127.50',
        metadata: {
          status: 'success',
          savings: 127.50
        }
      },
      {
        type: 'reasoning',
        content: 'I observe spending rate has increased 340% in the last 6 hours. This exceeds normal variance by 4.2 standard deviations. Creating budget alert.'
      },
      {
        type: 'tool_call',
        content: 'Creating anomaly detection alert with automatic rate limiting',
        metadata: {
          tool: 'create_budget_alert',
          args: { 
            alert_type: 'anomaly_detection', 
            threshold_value: 2.5,
            time_window: 'hourly',
            auto_action: 'reduce_rate_limit'
          },
          status: 'executing'
        }
      },
      {
        type: 'tool_result',
        content: 'Budget alert created. Auto-action: reduce_rate_limit will trigger on anomaly detection.',
        metadata: { status: 'success' }
      },
      {
        type: 'conclusion',
        content: 'Audit complete. Executed 2 optimizations. Total estimated savings: $127.50/month. Created 1 preventive alert.',
        metadata: { savings: 127.50 }
      }
    ];

    for (const step of demoSteps) {
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
      setSteps(prev => [...prev, {
        ...step,
        id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now()
      }]);
    }

    setIsStreaming(false);
  };

  return (
    <div className="space-y-4">
      <button
        onClick={simulateAudit}
        disabled={isStreaming}
        className={cn(
          'px-4 py-2 border-2 border-neutral-900 font-mono font-bold uppercase text-sm',
          'transition-transform duration-75',
          isStreaming 
            ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
            : 'bg-primary text-neutral-900 hover:-translate-y-0.5 active:translate-y-0'
        )}
      >
        {isStreaming ? 'ANALYZING...' : 'RUN FORENSIC AUDIT'}
      </button>

      <ThinkingTrace
        steps={steps}
        isStreaming={isStreaming}
        modelInfo={{
          model: 'gemini-3-pro-preview',
          thinkingLevel: 'high',
          contextTokens: 487293
        }}
      />
    </div>
  );
}

export default ThinkingTrace;
