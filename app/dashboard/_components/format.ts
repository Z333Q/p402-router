/**
 * Display formatting utilities for the P402 dashboard.
 * Reduces decimal noise — adapts precision to magnitude.
 */

/**
 * Format a USD cost value with adaptive precision.
 * - Free (0): returns "Free"
 * - ≥ $1.00 : 2 decimal places  →  $3.24
 * - ≥ $0.01 : 4 decimal places  →  $0.0034
 * - < $0.01 : 6 decimal places  →  $0.000042
 * @param full — always return 6 decimals (for hover / detail views)
 */
export function formatCost(usd: number, full = false): string {
    if (usd === 0) return 'Free'
    if (full)      return `$${usd.toFixed(6)}`
    if (usd >= 1)  return `$${usd.toFixed(2)}`
    if (usd >= 0.01) return `$${usd.toFixed(4)}`
    return `$${usd.toFixed(6)}`
}

/**
 * Format a savings amount with the same adaptive scale.
 * Returns "$0.0000" rather than "Free" for zero savings.
 */
export function formatSavings(usd: number, full = false): string {
    if (usd === 0) return '$0.00'
    return formatCost(usd, full)
}

/**
 * Format a latency value:
 * - < 1 000 ms  → "342 ms"
 * - ≥ 1 000 ms  → "3.24 s"
 */
export function formatLatency(ms: number): string {
    if (ms < 1000) return `${ms.toLocaleString()} ms`
    return `${(ms / 1000).toFixed(2)} s`
}
