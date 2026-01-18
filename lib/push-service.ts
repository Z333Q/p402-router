/**
 * P402 A2A Push Notification Service
 * ===================================
 * Handles delivery of push notifications to configured webhooks.
 * 
 * Usage:
 * ```typescript
 * import { pushNotificationService } from '@/lib/push-service';
 * await pushNotificationService.notify('task.completed', { taskId: 'task_123' }, 'tenant_abc');
 * ```
 */

import pool from '@/lib/db';

// =============================================================================
// TYPES
// =============================================================================

export interface PushEvent {
    type: string;
    taskId?: string;
    contextId?: string;
    mandateId?: string;
    data: Record<string, any>;
    timestamp: string;
}

interface PushConfig {
    id: string;
    tenantId: string;
    webhookUrl: string;
    authType: 'bearer' | 'basic' | 'api_key' | 'none';
    authToken?: string;
    eventTypes: string[];
    contextFilter?: string;
    maxRetries: number;
    retryDelayMs: number;
    enabled: boolean;
}

interface DeliveryResult {
    configId: string;
    success: boolean;
    statusCode?: number;
    error?: string;
    retryCount: number;
}

// =============================================================================
// PUSH NOTIFICATION SERVICE
// =============================================================================

export class PushNotificationService {
    private maxRetries: number = 3;
    private baseRetryDelay: number = 1000;

    /**
     * Send notification to all matching configurations
     */
    async notify(
        eventType: string,
        data: Record<string, any>,
        tenantId: string,
        contextId?: string
    ): Promise<DeliveryResult[]> {
        // Get matching configurations
        const configs = await this.getMatchingConfigs(tenantId, eventType, contextId);

        if (configs.length === 0) {
            return [];
        }

        // Build event payload
        const event: PushEvent = {
            type: eventType,
            taskId: data.taskId || data.task_id,
            contextId: data.contextId || data.context_id || contextId,
            mandateId: data.mandateId || data.mandate_id,
            data,
            timestamp: new Date().toISOString()
        };

        // Deliver to all configs in parallel
        const results = await Promise.all(
            configs.map(config => this.deliver(config, event))
        );

        return results;
    }

    /**
     * Get configurations matching the event
     */
    private async getMatchingConfigs(
        tenantId: string,
        eventType: string,
        contextId?: string
    ): Promise<PushConfig[]> {
        let queryStr = `
            SELECT id, tenant_id, webhook_url, auth_type, auth_token,
                   event_types, context_filter, max_retries, retry_delay_ms, enabled
            FROM a2a_push_configs
            WHERE tenant_id = $1 
              AND enabled = true
              AND $2 = ANY(event_types)
        `;
        const values: any[] = [tenantId, eventType];

        if (contextId) {
            queryStr += ` AND (context_filter IS NULL OR context_filter = $3)`;
            values.push(contextId);
        } else {
            queryStr += ` AND context_filter IS NULL`;
        }

        const result = await pool.query(queryStr, values);

        return result.rows.map(row => ({
            id: row.id,
            tenantId: row.tenant_id,
            webhookUrl: row.webhook_url,
            authType: row.auth_type,
            authToken: row.auth_token,
            eventTypes: row.event_types,
            contextFilter: row.context_filter,
            maxRetries: row.max_retries || this.maxRetries,
            retryDelayMs: row.retry_delay_ms || this.baseRetryDelay,
            enabled: row.enabled
        }));
    }

    /**
     * Deliver notification to a specific configuration
     */
    private async deliver(
        config: PushConfig,
        event: PushEvent
    ): Promise<DeliveryResult> {
        let retryCount = 0;
        let lastError: string | undefined;

        while (retryCount <= config.maxRetries) {
            try {
                const response = await this.sendWebhook(config, event);

                if (response.ok) {
                    // Success - reset failure count
                    await this.recordSuccess(config.id);
                    return {
                        configId: config.id,
                        success: true,
                        statusCode: response.status,
                        retryCount
                    };
                }

                // Non-retryable status codes
                if (response.status >= 400 && response.status < 500 && response.status !== 429) {
                    lastError = `HTTP ${response.status}: ${response.statusText}`;
                    break;
                }

                lastError = `HTTP ${response.status}: ${response.statusText}`;
            } catch (error: any) {
                lastError = error.message;
            }

            retryCount++;

            if (retryCount <= config.maxRetries) {
                // Exponential backoff
                const delay = config.retryDelayMs * Math.pow(2, retryCount - 1);
                await this.sleep(delay);
            }
        }

        // All retries failed
        await this.recordFailure(config.id);

        return {
            configId: config.id,
            success: false,
            error: lastError,
            retryCount
        };
    }

    /**
     * Send the actual webhook request
     */
    private async sendWebhook(
        config: PushConfig,
        event: PushEvent
    ): Promise<Response> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'User-Agent': 'P402-A2A-Push/1.0',
            'X-P402-Event': event.type,
            'X-P402-Delivery-ID': `del_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        };

        // Add authentication
        switch (config.authType) {
            case 'bearer':
                headers['Authorization'] = `Bearer ${config.authToken}`;
                break;
            case 'basic':
                headers['Authorization'] = `Basic ${config.authToken}`;
                break;
            case 'api_key':
                headers['X-API-Key'] = config.authToken!;
                break;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        try {
            return await fetch(config.webhookUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify(event),
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeout);
        }
    }

    /**
     * Record successful delivery
     */
    private async recordSuccess(configId: string): Promise<void> {
        await pool.query(`
            UPDATE a2a_push_configs
            SET last_delivery_at = NOW(),
                consecutive_failures = 0,
                updated_at = NOW()
            WHERE id = $1
        `, [configId]);
    }

    /**
     * Record failed delivery
     */
    private async recordFailure(configId: string): Promise<void> {
        await pool.query(`
            UPDATE a2a_push_configs
            SET consecutive_failures = consecutive_failures + 1,
                updated_at = NOW()
            WHERE id = $1
        `, [configId]);

        // Disable if too many failures
        await pool.query(`
            UPDATE a2a_push_configs
            SET enabled = false
            WHERE id = $1 AND consecutive_failures >= 10
        `, [configId]);
    }

    /**
     * Sleep helper
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // =========================================================================
    // EVENT HELPERS
    // =========================================================================

    /**
     * Notify task state change
     */
    async notifyTaskStateChange(
        task: {
            task_id: string;
            context_id: string;
            tenant_id: string;
            state: string;
            cost_usd?: number;
            latency_ms?: number;
            provider_id?: string;
            model_id?: string;
            error_message?: string;
        }
    ): Promise<void> {
        const eventType = `task.${task.state}`;

        await this.notify(
            eventType,
            {
                taskId: task.task_id,
                contextId: task.context_id,
                state: task.state,
                cost_usd: task.cost_usd,
                latency_ms: task.latency_ms,
                provider: task.provider_id,
                model: task.model_id,
                error: task.error_message
            },
            task.tenant_id,
            task.context_id
        );
    }

    /**
     * Notify context budget exhausted
     */
    async notifyBudgetExhausted(
        context: {
            context_id: string;
            tenant_id: string;
            budget_total_usd: number;
            budget_used_usd: number;
        }
    ): Promise<void> {
        await this.notify(
            'context.budget_exhausted',
            {
                contextId: context.context_id,
                budget_total_usd: context.budget_total_usd,
                budget_used_usd: context.budget_used_usd
            },
            context.tenant_id,
            context.context_id
        );
    }

    /**
     * Notify mandate usage
     */
    async notifyMandateUsed(
        mandate: {
            mandate_id: string;
            tenant_id: string;
            amount_used: number;
            remaining: number;
            task_id?: string;
        }
    ): Promise<void> {
        await this.notify(
            'mandate.used',
            {
                mandateId: mandate.mandate_id,
                taskId: mandate.task_id,
                amount_used_usd: mandate.amount_used,
                remaining_usd: mandate.remaining
            },
            mandate.tenant_id
        );
    }

    /**
     * Notify mandate expired
     */
    async notifyMandateExpired(
        mandate: {
            mandate_id: string;
            tenant_id: string;
            user_did: string;
        }
    ): Promise<void> {
        await this.notify(
            'mandate.expired',
            {
                mandateId: mandate.mandate_id,
                user_did: mandate.user_did
            },
            mandate.tenant_id
        );
    }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
