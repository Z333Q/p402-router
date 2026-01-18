/**
 * P402 A2A Multi-Agent Orchestration Endpoint
 * ============================================
 * Orchestrate complex workflows across multiple agents.
 * 
 * POST /api/a2a/orchestrate - Execute multi-agent workflow
 * GET /api/a2a/orchestrate/:workflowId - Get workflow status
 * 
 * Features:
 * - Sequential and parallel task execution
 * - Automatic agent selection based on capabilities
 * - Budget allocation across agents
 * - Aggregated cost tracking
 * - Error handling with fallbacks
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import pool from '@/lib/db';
import { findMatchingAgents, delegateTask } from '@/lib/a2a-orchestration';
import { A2AMessage, TaskState } from '@/lib/a2a-types';

// =============================================================================
// TYPES
// =============================================================================

interface WorkflowStep {
    id: string;
    name: string;
    type: 'delegate' | 'transform' | 'aggregate' | 'conditional';
    config: {
        // For delegate
        targetAgent?: string;
        targetCapabilities?: string[];
        message?: A2AMessage | string; // Can reference previous step output
        maxCostUsd?: number;

        // For transform
        transform?: string; // JSONPath or template

        // For conditional
        condition?: string;
        thenStep?: string;
        elseStep?: string;

        // For aggregate
        aggregateFrom?: string[]; // Step IDs to aggregate
        aggregateStrategy?: 'concat' | 'merge' | 'best';
    };
    dependsOn?: string[]; // Step IDs that must complete first
}

interface Workflow {
    id: string;
    name: string;
    description?: string;
    steps: WorkflowStep[];
    budgetUsd?: number;
    timeoutMs?: number;
}

interface WorkflowExecution {
    id: string;
    workflowId: string;
    tenantId: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'canceled';
    stepResults: Record<string, StepResult>;
    totalCostUsd: number;
    startedAt: string;
    completedAt?: string;
    error?: string;
}

interface StepResult {
    stepId: string;
    status: TaskState;
    output?: any;
    costUsd: number;
    latencyMs: number;
    delegatedTo?: string;
    error?: string;
}

// =============================================================================
// WORKFLOW EXECUTION ENGINE
// =============================================================================

async function executeWorkflow(
    workflow: Workflow,
    input: A2AMessage,
    tenantId: string
): Promise<WorkflowExecution> {
    const executionId = `wf_${uuidv4()}`;
    const startTime = Date.now();

    // Create execution record
    await pool.query(`
        INSERT INTO a2a_workflow_executions (
            id, workflow_id, tenant_id, status, 
            input_message, step_results, started_at
        ) VALUES ($1, $2, $3, 'running', $4, '{}', NOW())
    `, [executionId, workflow.id, tenantId, JSON.stringify(input)]);

    const execution: WorkflowExecution = {
        id: executionId,
        workflowId: workflow.id,
        tenantId,
        status: 'running',
        stepResults: {},
        totalCostUsd: 0,
        startedAt: new Date().toISOString()
    };

    try {
        // Build dependency graph
        const dependencyMap = new Map<string, Set<string>>();
        const stepMap = new Map<string, WorkflowStep>();

        for (const step of workflow.steps) {
            stepMap.set(step.id, step);
            dependencyMap.set(step.id, new Set(step.dependsOn || []));
        }

        // Execute steps respecting dependencies
        const completed = new Set<string>();
        const stepOutputs = new Map<string, any>();
        stepOutputs.set('input', input);

        while (completed.size < workflow.steps.length) {
            // Find steps ready to execute
            const readySteps = workflow.steps.filter(step => {
                if (completed.has(step.id)) return false;
                const deps = dependencyMap.get(step.id) || new Set();
                return Array.from(deps).every(d => completed.has(d));
            });

            if (readySteps.length === 0) {
                throw new Error('Workflow has circular dependencies or unreachable steps');
            }

            // Execute ready steps in parallel
            const results = await Promise.all(
                readySteps.map(step => executeStep(
                    step,
                    stepOutputs,
                    tenantId,
                    workflow.budgetUsd ? workflow.budgetUsd - execution.totalCostUsd : undefined
                ))
            );

            // Process results
            for (let i = 0; i < readySteps.length; i++) {
                const step = readySteps[i]!;
                const result = results[i]!;

                execution.stepResults[step.id] = result;
                execution.totalCostUsd += result.costUsd;
                stepOutputs.set(step.id, result.output);
                completed.add(step.id);

                // Check budget
                if (workflow.budgetUsd && execution.totalCostUsd > workflow.budgetUsd) {
                    throw new Error(`Budget exceeded: ${execution.totalCostUsd} > ${workflow.budgetUsd}`);
                }

                // Check for step failure
                if (result.status === 'failed') {
                    // Continue for now, could add retry logic
                    console.warn(`[Workflow] Step ${step.id} failed: ${result.error}`);
                }
            }

            // Update execution record
            await pool.query(`
                UPDATE a2a_workflow_executions
                SET step_results = $2, total_cost_usd = $3
                WHERE id = $1
            `, [executionId, JSON.stringify(execution.stepResults), execution.totalCostUsd]);
        }

        // Mark completed
        execution.status = 'completed';
        execution.completedAt = new Date().toISOString();

        await pool.query(`
            UPDATE a2a_workflow_executions
            SET status = 'completed', completed_at = NOW(), total_cost_usd = $2
            WHERE id = $1
        `, [executionId, execution.totalCostUsd]);

        return execution;

    } catch (error: any) {
        execution.status = 'failed';
        execution.error = error.message;
        execution.completedAt = new Date().toISOString();

        await pool.query(`
            UPDATE a2a_workflow_executions
            SET status = 'failed', error_message = $2, completed_at = NOW()
            WHERE id = $1
        `, [executionId, error.message]);

        return execution;
    }
}

async function executeStep(
    step: WorkflowStep,
    stepOutputs: Map<string, any>,
    tenantId: string,
    remainingBudget?: number
): Promise<StepResult> {
    const startTime = Date.now();

    try {
        switch (step.type) {
            case 'delegate': {
                // Build message from config
                let message: A2AMessage;
                if (typeof step.config.message === 'string') {
                    // Reference to previous step
                    const ref = step.config.message.replace('$', '');
                    message = stepOutputs.get(ref);
                } else if (step.config.message) {
                    message = step.config.message;
                } else {
                    message = stepOutputs.get('input');
                }

                // Find target agent
                let agentId = step.config.targetAgent;
                if (!agentId && step.config.targetCapabilities) {
                    const matches = await findMatchingAgents(
                        tenantId,
                        step.config.targetCapabilities,
                        1
                    );
                    if (matches.length === 0) {
                        throw new Error(`No agent found with capabilities: ${step.config.targetCapabilities.join(', ')}`);
                    }
                    agentId = matches[0]!.agentId;
                }

                if (!agentId) {
                    throw new Error('No target agent specified and no capabilities to match');
                }

                // Delegate
                const result = await delegateTask(tenantId, agentId, message, {
                    maxCostUsd: Math.min(
                        step.config.maxCostUsd || Infinity,
                        remainingBudget || Infinity
                    )
                });

                return {
                    stepId: step.id,
                    status: result.status,
                    output: result.response,
                    costUsd: result.costUsd,
                    latencyMs: result.latencyMs,
                    delegatedTo: result.delegatedTo
                };
            }

            case 'transform': {
                // Apply transformation to previous output
                const deps = step.dependsOn || [];
                const inputs = deps.map(d => stepOutputs.get(d));

                // Simple concatenation for now
                const output = {
                    role: 'agent' as const,
                    parts: inputs.flatMap((i: any) => i?.parts || [])
                };

                return {
                    stepId: step.id,
                    status: 'completed',
                    output,
                    costUsd: 0,
                    latencyMs: Date.now() - startTime
                };
            }

            case 'aggregate': {
                const stepIds = step.config.aggregateFrom || step.dependsOn || [];
                const outputs = stepIds.map(id => stepOutputs.get(id));

                let output;
                switch (step.config.aggregateStrategy) {
                    case 'concat':
                        output = {
                            role: 'agent' as const,
                            parts: outputs.flatMap((o: any) => o?.parts || [])
                        };
                        break;
                    case 'best':
                        // Pick the first successful one
                        output = outputs.find((o: any) => o?.parts?.length > 0);
                        break;
                    case 'merge':
                    default:
                        output = { aggregated: outputs };
                }

                return {
                    stepId: step.id,
                    status: 'completed',
                    output,
                    costUsd: 0,
                    latencyMs: Date.now() - startTime
                };
            }

            default:
                throw new Error(`Unknown step type: ${step.type}`);
        }

    } catch (error: any) {
        return {
            stepId: step.id,
            status: 'failed',
            costUsd: 0,
            latencyMs: Date.now() - startTime,
            error: error.message
        };
    }
}

// =============================================================================
// API ROUTES
// =============================================================================

export async function POST(req: NextRequest) {
    const tenantId = req.headers.get('x-p402-tenant') || 'default';

    try {
        const body = await req.json();
        const { workflow, input } = body;

        if (!workflow || !workflow.steps || workflow.steps.length === 0) {
            return NextResponse.json({
                error: {
                    type: 'invalid_request',
                    message: 'Workflow with steps is required'
                }
            }, { status: 400 });
        }

        if (!input || !input.parts) {
            return NextResponse.json({
                error: {
                    type: 'invalid_request',
                    message: 'Input message with parts is required'
                }
            }, { status: 400 });
        }

        // Generate workflow ID if not provided
        workflow.id = workflow.id || `wdef_${uuidv4()}`;

        // Execute workflow
        const execution = await executeWorkflow(workflow, input, tenantId);

        // Get final output
        const lastStep = workflow.steps[workflow.steps.length - 1]!;
        const finalOutput = execution.stepResults[lastStep.id]?.output;

        return NextResponse.json({
            object: 'workflow_execution',
            id: execution.id,
            workflow_id: workflow.id,
            status: execution.status,
            output: finalOutput,
            step_results: execution.stepResults,
            total_cost_usd: execution.totalCostUsd,
            started_at: execution.startedAt,
            completed_at: execution.completedAt,
            error: execution.error
        });

    } catch (error: any) {
        console.error('[Orchestrate] Error:', error);
        return NextResponse.json({
            error: { type: 'internal_error', message: error.message }
        }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const tenantId = req.headers.get('x-p402-tenant') || 'default';
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    try {
        let query = `SELECT * FROM a2a_workflow_executions WHERE tenant_id = $1`;
        const values: any[] = [tenantId];
        let paramIndex = 2;

        if (status) {
            query += ` AND status = $${paramIndex++}`;
            values.push(status);
        }

        query += ` ORDER BY started_at DESC LIMIT $${paramIndex}`;
        values.push(limit);

        const result = await pool.query(query, values);

        const executions = result.rows.map(row => ({
            id: row.id,
            workflow_id: row.workflow_id,
            status: row.status,
            total_cost_usd: parseFloat(row.total_cost_usd) || 0,
            step_count: Object.keys(row.step_results || {}).length,
            started_at: row.started_at?.toISOString(),
            completed_at: row.completed_at?.toISOString(),
            error: row.error_message
        }));

        return NextResponse.json({
            object: 'list',
            data: executions
        });

    } catch (error: any) {
        console.error('[Orchestrate] List error:', error);
        return NextResponse.json({
            error: { type: 'internal_error', message: error.message }
        }, { status: 500 });
    }
}

// =============================================================================
// OPTIONS (CORS)
// =============================================================================

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-P402-Tenant',
            'Access-Control-Max-Age': '86400'
        }
    });
}
