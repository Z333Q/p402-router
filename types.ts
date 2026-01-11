export interface Metric {
  label: string;
  value: string;
  delta?: string;
  deltaType?: 'positive' | 'negative' | 'neutral';
}

export interface Route {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  pathPattern: string;
  priceModel: string;
  network: string;
  asset: string;
  status: 'active' | 'inactive';
}

export interface Policy {
  id: string;
  name: string;
  scope: string;
  type: 'budget' | 'allowlist' | 'rate-limit';
  status: 'active' | 'paused';
  lastUpdated: string;
}

export interface Facilitator {
  id: string;
  name: string;
  type: string;
  supportedNetworks: string[];
  p95Latency: number;
  successRate: number;
  status: 'healthy' | 'degraded' | 'down';
}

export interface EventTrace {
  eventId: string;
  timestamp: string;
  method: string;
  path: string;
  status: 'verified' | 'settled' | 'denied' | 'failed' | 'planned';
  latency: number;
  facilitatorId?: string;
  amount?: string;
  asset?: string;
  network?: string;
  buyerIdHash?: string;
  denialReason?: string;
  steps: EventStep[];
}

export interface EventStep {
  name: string;
  status: 'success' | 'failure' | 'pending';
  detail: string;
  timestamp: string;
}

export interface BazaarResource {
  id: string;
  name: string;
  description: string;
  route: string;
  price: string;
  approvalRate: number;
  lastSeen: string;
}
