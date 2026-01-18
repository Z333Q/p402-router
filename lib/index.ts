/**
 * P402 A2A Protocol Integration
 * ==============================
 * 
 * Complete A2A protocol support for P402 payment infrastructure.
 * 
 * Quick Start:
 * ```typescript
 * import { P402A2AClient, A2AMiddleware } from '@p402/a2a';
 * 
 * // Client usage
 * const client = new P402A2AClient({ baseUrl: 'https://p402.io' });
 * const result = await client.sendMessage({ message: {...} });
 * 
 * // Middleware usage
 * const middleware = new A2AMiddleware(tenantId);
 * const task = await middleware.createTask({ message: {...}, tenantId });
 * ```
 */

// =============================================================================
// CLIENT
// =============================================================================

export { P402A2AClient, type P402A2AClientConfig } from './a2a-client';
export { default as A2AClient } from './a2a-client';

// =============================================================================
// TYPES
// =============================================================================

export type {
    A2AMessage,
    A2ATask,
    TaskState,
    AgentCard,
    Skill,
    Extension,

    // A2A x402 Extension Types
    X402PaymentScheme,
    X402SchemeDetails,
    X402PaymentRequired,
    X402PaymentSubmitted,
    X402SettlementDetails,
    X402Receipt,
    X402PaymentCompleted,
    X402MessageContent,
    X402Message,
    X402PaymentStatus,
    X402PaymentRecord
} from './a2a-types';

export { X402_EXTENSION_URI } from './a2a-types';

// =============================================================================
// MIDDLEWARE
// =============================================================================

export {
    A2AMiddleware,
    withA2ATracking,
    type A2ATaskInput,
    type A2ATaskRecord,
    type CompletionResult
} from './a2a-middleware';

// =============================================================================
// AP2 POLICY ENGINE
// =============================================================================

export {
    AP2PolicyEngine,
    type AP2PolicyContext,
    type AP2PolicyResult
} from './ap2-policy-engine';

// =============================================================================
// PUSH NOTIFICATIONS
// =============================================================================

export {
    pushNotificationService
} from './push-service';

// =============================================================================
// VERSION
// =============================================================================

export const VERSION = '1.0.0';
export const A2A_PROTOCOL_VERSION = '1.0';
export const AP2_PROTOCOL_VERSION = '1.0';
export const X402_EXTENSION_VERSION = '2.0';
