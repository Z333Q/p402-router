import { Route, Policy, Facilitator, EventTrace, BazaarResource } from './types';

export const KPI_DATA = [
  { label: 'Payments attempted', value: '1.2M', delta: '+12%', deltaType: 'positive' },
  { label: 'Verified', value: '1.18M', delta: '+12%', deltaType: 'positive' },
  { label: 'Settled', value: '1.15M', delta: '+11%', deltaType: 'positive' },
  { label: 'Denied', value: '42k', delta: '-5%', deltaType: 'positive' }, // Less denied is good
  { label: 'p95 verify latency', value: '48ms', delta: '-2ms', deltaType: 'positive' },
  { label: 'Facilitator Health', value: '100%', delta: 'All Systems Go', deltaType: 'neutral' },
];

export const MOCK_ROUTES: Route[] = [
  { id: 'r_1', method: 'POST', pathPattern: '/v1/chat/completions', priceModel: 'per_token', network: 'base', asset: 'USDC', status: 'active' },
  { id: 'r_2', method: 'GET', pathPattern: '/v1/market/data', priceModel: 'fixed', network: 'base', asset: 'USDC', status: 'active' },
  { id: 'r_3', method: 'POST', pathPattern: '/v2/image/generate', priceModel: 'tiered', network: 'solana', asset: 'USDC', status: 'active' },
  { id: 'r_4', method: 'POST', pathPattern: '/v1/search', priceModel: 'fixed', network: 'base', asset: 'ETH', status: 'inactive' },
];

export const MOCK_POLICIES: Policy[] = [
  { id: 'pol_1', name: 'Global Budget Cap', scope: 'Tenant', type: 'budget', status: 'active', lastUpdated: '2h ago' },
  { id: 'pol_2', name: 'Block Suspicious IPs', scope: 'Global', type: 'allowlist', status: 'active', lastUpdated: '1d ago' },
  { id: 'pol_3', name: 'Rate Limit Free Tier', scope: 'Service: Search', type: 'rate-limit', status: 'active', lastUpdated: '5d ago' },
];

export const MOCK_FACILITATORS: Facilitator[] = [
  { id: 'fac_cdp', name: 'Coinbase CDP', type: 'Settlement', supportedNetworks: ['Base', 'Ethereum', 'Polygon'], p95Latency: 45, successRate: 0.9999, status: 'healthy' },
  { id: 'fac_sphere', name: 'Sphere Pay', type: 'Settlement', supportedNetworks: ['Solana', 'Base'], p95Latency: 120, successRate: 0.9850, status: 'degraded' },
  { id: 'fac_stripe', name: 'Stripe Crypto', type: 'Settlement', supportedNetworks: ['Ethereum', 'Solana'], p95Latency: 200, successRate: 0.9995, status: 'healthy' },
];

export const MOCK_BAZAAR: BazaarResource[] = [
  { id: 'res_1', name: 'Llama 3 70B Inference', description: 'High speed inference endpoint', route: '/v1/chat', price: '0.0001 USDC / 1k', approvalRate: 0.99, lastSeen: 'Just now' },
  { id: 'res_2', name: 'Real-time Search', description: 'Web search with grounding', route: '/v1/search', price: '0.01 USDC / call', approvalRate: 0.98, lastSeen: '2m ago' },
  { id: 'res_3', name: 'Stable Diffusion XL', description: 'Image generation', route: '/v1/images', price: '0.04 USDC / img', approvalRate: 0.95, lastSeen: '5m ago' },
];

export const MOCK_EVENTS: EventTrace[] = [
  {
    eventId: 'evt_892374',
    timestamp: new Date().toISOString(),
    method: 'POST',
    path: '/v1/chat/completions',
    status: 'settled',
    latency: 142,
    facilitatorId: 'Coinbase CDP',
    amount: '0.0002',
    asset: 'USDC',
    network: 'Base',
    buyerIdHash: '0x7a...9f21',
    steps: [
      { name: 'Plan', status: 'success', detail: 'Route matched, policy allowed', timestamp: 'T+0ms' },
      { name: '402 Challenge', status: 'success', detail: 'Server returned PAYMENT-REQUIRED', timestamp: 'T+12ms' },
      { name: 'Verify', status: 'success', detail: 'Signature valid', timestamp: 'T+85ms' },
      { name: 'Settle', status: 'success', detail: 'Tx 0x82...12 confirmed', timestamp: 'T+142ms' },
    ]
  },
  {
    eventId: 'evt_892373',
    timestamp: new Date(Date.now() - 2000).toISOString(),
    method: 'GET',
    path: '/v1/market/data',
    status: 'verified',
    latency: 45,
    facilitatorId: 'Coinbase CDP',
    amount: '0.05',
    asset: 'USDC',
    network: 'Base',
    buyerIdHash: '0x3b...11aa',
    steps: [
      { name: 'Plan', status: 'success', detail: 'Route matched', timestamp: 'T+0ms' },
      { name: 'Verify', status: 'success', detail: 'Optimistic verify', timestamp: 'T+45ms' },
    ]
  },
  {
    eventId: 'evt_892372',
    timestamp: new Date(Date.now() - 5000).toISOString(),
    method: 'POST',
    path: '/v2/image/generate',
    status: 'denied',
    latency: 12,
    amount: '0.00',
    asset: 'USDC',
    network: 'Solana',
    buyerIdHash: '0x1c...88bb',
    denialReason: 'ROUTER_BUDGET_EXCEEDED',
    steps: [
      { name: 'Plan', status: 'success', detail: 'Route matched', timestamp: 'T+0ms' },
      { name: 'Policy Check', status: 'failure', detail: 'Daily budget cap reached for buyer', timestamp: 'T+12ms' },
    ]
  },
  {
    eventId: 'evt_892371',
    timestamp: new Date(Date.now() - 12000).toISOString(),
    method: 'POST',
    path: '/v1/chat/completions',
    status: 'settled',
    latency: 138,
    facilitatorId: 'Sphere Pay',
    amount: '0.0002',
    asset: 'USDC',
    network: 'Base',
    buyerIdHash: '0x7a...9f21',
    steps: []
  },
    {
    eventId: 'evt_892370',
    timestamp: new Date(Date.now() - 15000).toISOString(),
    method: 'GET',
    path: '/v1/search',
    status: 'failed',
    latency: 2000,
    facilitatorId: 'Stripe Crypto',
    amount: '0.01',
    asset: 'USDC',
    network: 'Ethereum',
    buyerIdHash: '0x99...aaaa',
    denialReason: 'FACILITATOR_UNAVAILABLE',
    steps: []
  },
];
