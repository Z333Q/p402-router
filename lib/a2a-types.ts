export type A2ARole = 'user' | 'agent' | 'system';

export interface A2APart {
    type: 'text' | 'data';
    text?: string;
    data?: any;
}

export interface A2AMessage {
    role: A2ARole;
    parts: A2APart[];
}

export interface A2AConfiguration {
    mode?: 'cost' | 'quality' | 'speed' | 'balanced';
    maxCost?: number;
    provider?: string;
    model?: string;
}

export type A2ATaskState = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface A2ATaskArtifact {
    id: string;
    name: string;
    parts: A2APart[];
}

export interface A2ATaskStatus {
    state: A2ATaskState;
    message?: A2AMessage;
    timestamp: string; // ISO 8601
}

export interface A2ATask {
    id: string;
    contextId?: string;
    status: A2ATaskStatus;
    artifacts?: A2ATaskArtifact[];
}

// AP2 Mandates
export type MandateType = 'intent' | 'cart' | 'payment';

export interface MandateConstraints {
    max_amount_usd: number;
    allowed_categories?: string[];
    valid_until?: string; // ISO 8601
}

export interface AP2Mandate {
    id: string;
    type: MandateType;
    user_did: string;
    agent_did: string;
    constraints: MandateConstraints;
    signature?: string;
    public_key?: string;
    amount_spent_usd: number;
    status: 'active' | 'exhausted' | 'expired' | 'revoked';
}
