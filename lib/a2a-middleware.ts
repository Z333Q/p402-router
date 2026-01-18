import { v4 as uuidv4 } from 'uuid';
import pool from './db';
import { A2AMessage, A2ATask, TaskState } from './a2a-types';
import { pushNotificationService } from './push-service';

export interface A2ATaskInput {
    message: A2AMessage;
    contextId?: string;
    configuration?: any;
    tenantId: string;
}

export interface A2ATaskRecord extends A2ATask {
    tenantId: string;
}

export interface CompletionResult {
    message: A2AMessage;
    metadata?: any;
}

/**
 * A2A Middleware
 * Simplifies task lifecycle management and A2A integration
 */
export class A2AMiddleware {
    private tenantId: string;

    constructor(tenantId: string) {
        this.tenantId = tenantId;
    }

    /**
     * Create a new A2A task
     */
    async createTask(input: A2ATaskInput): Promise<A2ATaskRecord> {
        const taskId = `task_${uuidv4()}`;
        const contextId = input.contextId || `ctx_${uuidv4()}`;

        // Ensure context exists
        await pool.query(
            `INSERT INTO a2a_contexts (id, tenant_id) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
            [contextId, input.tenantId]
        );

        // Insert task
        await pool.query(
            `INSERT INTO a2a_tasks (
                id, tenant_id, context_id, request_message, configuration, state, created_at
            ) VALUES ($1, $2, $3, $4, $5, 'pending', NOW())`,
            [
                taskId,
                input.tenantId,
                contextId,
                JSON.stringify(input.message),
                JSON.stringify(input.configuration || {}),
            ]
        );

        return {
            id: taskId,
            contextId,
            tenantId: input.tenantId,
            status: {
                state: 'pending',
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Complete a task with a result message
     */
    async completeTask(taskId: string, result: CompletionResult): Promise<void> {
        await pool.query(
            `UPDATE a2a_tasks 
             SET state = 'completed', 
                 result_message = $2, 
                 metadata = $3,
                 completed_at = NOW() 
             WHERE id = $1`,
            [taskId, JSON.stringify(result.message), JSON.stringify(result.metadata || {})]
        );

        // Get context id for notification
        const taskRes = await pool.query('SELECT context_id, tenant_id FROM a2a_tasks WHERE id = $1', [taskId]);
        if (taskRes.rows.length > 0) {
            pushNotificationService.notifyTaskStateChange({
                task_id: taskId,
                context_id: taskRes.rows[0].context_id,
                tenant_id: taskRes.rows[0].tenant_id,
                state: 'completed'
            }).catch(err => console.error('Push Notification Error:', err));
        }
    }

    /**
     * Fail a task with an error
     */
    async failTask(taskId: string, error: string): Promise<void> {
        await pool.query(
            `UPDATE a2a_tasks 
             SET state = 'failed', 
                 metadata = metadata || jsonb_build_object('error', $2),
                 completed_at = NOW() 
             WHERE id = $1`,
            [taskId, error]
        );
    }
}

/**
 * Higher-order function for tracking A2A tasks
 */
export async function withA2ATracking<T>(
    input: A2ATaskInput,
    handler: (task: A2ATaskRecord) => Promise<T>
): Promise<T> {
    const middleware = new A2AMiddleware(input.tenantId);
    const task = await middleware.createTask(input);

    try {
        const result = await handler(task);
        // If the handler returns a CompletionResult, we can auto-complete
        if (result && typeof result === 'object' && 'message' in result) {
            await middleware.completeTask(task.id, result as unknown as CompletionResult);
        }
        return result;
    } catch (error: any) {
        await middleware.failTask(task.id, error.message);
        throw error;
    }
}
