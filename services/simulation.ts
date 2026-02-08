// DEPRECATED: This file is no longer used in production.
// Dashboard now uses real database queries via lib/db/queries.ts
// Kept for reference during migration.

console.warn('⚠️ Simulation service is deprecated. Use lib/db/queries.ts for real data.');

import { Route, Policy, EventTrace, Facilitator, Metric, EventStep } from '../types';
import { MOCK_ROUTES, MOCK_POLICIES, MOCK_FACILITATORS, MOCK_EVENTS } from '../constants';

// --- Database Simulation (LocalStorage) ---
const STORAGE_KEYS = {
  ROUTES: 'p402_routes',
  POLICIES: 'p402_policies',
  EVENTS: 'p402_events',
  FACILITATORS: 'p402_facilitators',
};

class SimulatedBackend {
  private listeners: ((event: EventTrace) => void)[] = [];
  private trafficInterval: any = null;
  private isGenerating = false; // DISABLED

  constructor() {
    // DEPRECATED: Don't initialize mock data in production
    console.warn('SimulatedBackend is deprecated. Use real database queries.');
  }

  // --- Initialization ---
  private initializeData() {
    if (!localStorage.getItem(STORAGE_KEYS.ROUTES)) {
      localStorage.setItem(STORAGE_KEYS.ROUTES, JSON.stringify(MOCK_ROUTES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.POLICIES)) {
      localStorage.setItem(STORAGE_KEYS.POLICIES, JSON.stringify(MOCK_POLICIES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.FACILITATORS)) {
      localStorage.setItem(STORAGE_KEYS.FACILITATORS, JSON.stringify(MOCK_FACILITATORS));
    }
    // We don't persist events forever, just keep the mock ones initially
    if (!localStorage.getItem(STORAGE_KEYS.EVENTS)) {
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(MOCK_EVENTS));
    }
  }

  // --- API: Routes ---
  getRoutes(): Route[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.ROUTES) || '[]');
  }

  addRoute(route: Route) {
    const routes = this.getRoutes();
    routes.push(route);
    localStorage.setItem(STORAGE_KEYS.ROUTES, JSON.stringify(routes));
  }

  deleteRoute(id: string) {
    const routes = this.getRoutes().filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.ROUTES, JSON.stringify(routes));
  }

  // --- API: Policies ---
  getPolicies(): Policy[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.POLICIES) || '[]');
  }

  addPolicy(policy: Policy) {
    const policies = this.getPolicies();
    policies.push(policy);
    localStorage.setItem(STORAGE_KEYS.POLICIES, JSON.stringify(policies));
  }

  deletePolicy(id: string) {
    const policies = this.getPolicies().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.POLICIES, JSON.stringify(policies));
  }

  // --- API: Facilitators ---
  getFacilitators(): Facilitator[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.FACILITATORS) || '[]');
  }

  updateFacilitator(facilitator: Facilitator) {
    const facilitators = this.getFacilitators();
    const index = facilitators.findIndex(f => f.id === facilitator.id);
    if (index !== -1) {
      facilitators[index] = facilitator;
      localStorage.setItem(STORAGE_KEYS.FACILITATORS, JSON.stringify(facilitators));
    }
  }

  // --- API: Events/Analytics ---
  getEvents(): EventTrace[] {
    // Return last 100 events
    const all = JSON.parse(localStorage.getItem(STORAGE_KEYS.EVENTS) || '[]');
    return all.slice(0, 100);
  }

  subscribeToEvents(callback: (event: EventTrace) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  toggleTraffic(active: boolean) {
    this.isGenerating = active;
  }

  // --- x402 Protocol Simulation Engine ---
  private startTrafficGenerator() {
    if (this.trafficInterval) clearInterval(this.trafficInterval);

    // Generate a new request every 800ms - 2500ms
    const loop = () => {
      if (this.isGenerating) {
        this.processSimulatedRequest();
      }
      const delay = Math.random() * 1500 + 500;
      this.trafficInterval = setTimeout(loop, delay);
    };
    loop();
  }

  private processSimulatedRequest() {
    const routes = this.getRoutes();
    const policies = this.getPolicies();
    const facilitators = this.getFacilitators();

    if (routes.length === 0) return; // No traffic if no routes

    // 1. Pick a random route
    const route = routes[Math.floor(Math.random() * routes.length)];
    if (!route || route.status === 'inactive') return;

    // 2. Simulate Request Context
    const eventId = `evt_${Math.floor(Math.random() * 1000000)}`;
    const timestamp = new Date().toISOString();
    const buyerHash = `0x${Math.floor(Math.random() * 16777215).toString(16)}...${Math.floor(Math.random() * 1000).toString(16)}`;

    // 3. Plan & Policy Check
    let status: EventTrace['status'] = 'verified';
    let denialReason = undefined;

    // Simple mock policy logic: 10% chance of denial if "budget" policy exists
    const hasBudgetPolicy = policies.some(p => p.type === 'budget' && p.status === 'active');
    if (hasBudgetPolicy && Math.random() > 0.9) {
      status = 'denied';
      denialReason = 'ROUTER_BUDGET_EXCEEDED';
    }

    // 4. Routing Engine: Facilitator Selection & Scoring
    let selectedFacilitator: Facilitator | undefined;
    let routingDetail = 'Route matched';

    if (status !== 'denied') {
      // Filter candidates by network compatibility
      const candidates = facilitators.filter(f =>
        f.supportedNetworks.some(n => n.toLowerCase() === route.network.toLowerCase())
      );

      if (candidates.length === 0) {
        status = 'failed';
        denialReason = 'NO_ROUTE_TO_NETWORK';
        routingDetail = `No facilitator supports ${route.network}`;
      } else {
        // Score candidates: Healthy > Degraded > Down. Then SuccessRate. Then Latency.
        candidates.sort((a, b) => {
          const statusScore: Record<string, number> = { 'healthy': 3, 'degraded': 2, 'down': 1 };
          const scoreA = statusScore[a.status] || 0;
          const scoreB = statusScore[b.status] || 0;

          // Priority 1: Health Status
          if (scoreA !== scoreB) return scoreB - scoreA;

          // Priority 2: Success Rate (Higher is better)
          if (a.successRate !== b.successRate) return b.successRate - a.successRate;

          // Priority 3: Latency (Lower is better)
          return a.p95Latency - b.p95Latency;
        });

        const winner = candidates[0];
        if (winner) {
          selectedFacilitator = winner;
          routingDetail = `Routed to ${selectedFacilitator.name} (Success: ${(selectedFacilitator.successRate * 100).toFixed(1)}%, p95: ${selectedFacilitator.p95Latency}ms)`;
        } else {
          status = 'failed';
          denialReason = 'NO_CANDIDATE_SELECTED';
        }
      }
    }

    // 5. Simulate Outcome
    let latency = 0;
    const steps: EventStep[] = [
      { name: 'Plan', status: 'success', detail: routingDetail, timestamp: 'T+0ms' },
    ];

    if (status === 'denied') {
      steps.push({ name: 'Policy Check', status: 'failure', detail: denialReason || 'Denied', timestamp: `T+12ms` });
      latency = 15;
    } else if (status === 'failed' && denialReason === 'NO_ROUTE_TO_NETWORK') {
      steps.push({ name: 'Routing', status: 'failure', detail: 'No available facilitator', timestamp: 'T+5ms' });
      latency = 5;
    } else if (selectedFacilitator) {
      // Base latency on real facilitator stats with randomized jitter (-20% to +40%)
      const baseP95 = selectedFacilitator.p95Latency;
      const actualLatency = Math.floor(baseP95 * (0.8 + Math.random() * 0.6));
      latency = Math.max(10, actualLatency);

      // Simulate steps
      steps.push({ name: '402 Challenge', status: 'success', detail: 'Payment Required', timestamp: `T+12ms` });

      const verifyTime = Math.floor(latency * 0.3);
      const settleTime = latency;

      steps.push({ name: 'Verify', status: 'success', detail: 'Signature Valid', timestamp: `T+${verifyTime}ms` });

      // Determine failure based on real facilitator success rate
      let isFailure = false;
      if (selectedFacilitator.status === 'down') {
        isFailure = true;
      } else {
        // Roll dice against success rate
        isFailure = Math.random() > selectedFacilitator.successRate;
      }

      if (isFailure) {
        status = 'failed';
        denialReason = 'FACILITATOR_ERROR'; // Upstream error
        steps.push({ name: 'Settle', status: 'failure', detail: `Upstream error: ${selectedFacilitator.name}`, timestamp: `T+${settleTime}ms` });
      } else {
        status = 'settled';
        steps.push({ name: 'Settle', status: 'success', detail: 'Confirmed', timestamp: `T+${settleTime}ms` });
      }
    }

    const newEvent: EventTrace = {
      eventId,
      timestamp,
      method: route.method,
      path: route.pathPattern,
      status,
      latency,
      facilitatorId: selectedFacilitator?.name,
      amount: '0.0002', // Mock amount
      asset: route.asset,
      network: route.network,
      buyerIdHash: buyerHash,
      denialReason,
      steps
    };

    // 6. Persist & Emit
    const currentEvents = this.getEvents();
    const updatedEvents = [newEvent, ...currentEvents].slice(0, 100); // Keep last 100
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(updatedEvents));

    this.listeners.forEach(cb => cb(newEvent));
  }
}

export const simulation = new SimulatedBackend();