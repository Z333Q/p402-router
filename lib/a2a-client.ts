import {
    A2AMessage,
    A2ATask,
    X402_EXTENSION_URI,
    X402PaymentRequired,
    X402PaymentSubmitted,
    X402PaymentCompleted
} from './a2a-types';

export interface P402A2AClientConfig {
    baseUrl: string;
    tenantId?: string;
    apiKey?: string;
}

/**
 * P402 A2A Client
 * Implements Google A2A Protocol with x402 Extension
 */
export class P402A2AClient {
    private baseUrl: string;
    private tenantId?: string;
    private apiKey?: string;

    constructor(config: P402A2AClientConfig) {
        this.baseUrl = config.baseUrl.replace(/\/$/, '');
        this.tenantId = config.tenantId;
        this.apiKey = config.apiKey;
    }

    /**
     * Send a message to the A2A endpoint
     */
    async sendMessage(params: {
        message: A2AMessage;
        contextId?: string;
        configuration?: any;
    }): Promise<{ task: A2ATask }> {
        const response = await fetch(`${this.baseUrl}/api/a2a`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'message/send',
                params,
                id: Math.random().toString(36).substring(7)
            })
        });

        const result = await response.json();
        if (result.error) {
            throw new Error(result.error.message);
        }

        return result.result;
    }

    /**
     * Submit a payment for a task
     */
    async submitPayment(payment: X402PaymentSubmitted): Promise<X402PaymentCompleted> {
        const response = await fetch(`${this.baseUrl}/api/a2a`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'x402/payment-submitted',
                params: payment,
                id: Math.random().toString(36).substring(7)
            })
        });

        const result = await response.json();
        if (result.error) {
            throw new Error(result.error.message);
        }

        return result.result;
    }

    private getHeaders() {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };
        if (this.tenantId) headers['X-P402-Tenant'] = this.tenantId;
        if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;
        return headers;
    }
}

export default P402A2AClient;
