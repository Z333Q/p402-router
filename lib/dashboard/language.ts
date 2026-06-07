/**
 * Slice 3N — Shared product language constants.
 *
 * Single source of truth for the disclaimers, the canonical product
 * vocabulary, and the phrases the dashboard must NOT use. Importing
 * this file from a page (or referencing it from a phrase-scan test)
 * keeps the surface coherent across Meter, Monitor, Control, Prove,
 * Outcomes, and Accountability.
 *
 * Pure data — no React, no DB. Tests pin every list verbatim.
 */

// ─────────────────────────────────────────────────────────────────────────
// Canonical disclaimers
// ─────────────────────────────────────────────────────────────────────────

export const DISCLAIMER_METADATA_ONLY =
    'This page uses economic metadata only. It does not display prompt or response content.';

export const DISCLAIMER_READINESS_NOT_RECOMMENDATION =
    'This is readiness analysis, not an Optimize recommendation.';

export const DISCLAIMER_RUNTIME_FLIP_BLOCKED =
    'Runtime flip remains blocked until the observation window and reconciliation gates pass.';

export const DISCLAIMER_DENIED_EVENTS =
    'Denied events are requests stopped before provider execution.';

export const DISCLAIMER_OPTIMIZE_BLOCKED =
    'Optimize recommendations remain blocked. This surface never proposes a model switch or claims savings.';

export const DISCLAIMERS = {
    metadata_only:           DISCLAIMER_METADATA_ONLY,
    readiness:               DISCLAIMER_READINESS_NOT_RECOMMENDATION,
    runtime_flip_blocked:    DISCLAIMER_RUNTIME_FLIP_BLOCKED,
    denied_events:           DISCLAIMER_DENIED_EVENTS,
    optimize_blocked:        DISCLAIMER_OPTIMIZE_BLOCKED,
} as const;

// ─────────────────────────────────────────────────────────────────────────
// Canonical product vocabulary — what we DO say
// ─────────────────────────────────────────────────────────────────────────

export const PRODUCT_VOCABULARY = [
    'AI spend accountability',
    'economic events',
    'denied events',
    'outcome coverage',
    'evidence coverage',
    'attribution completeness',
    'runtime flip readiness',
    'Optimize readiness analysis',
] as const;

// ─────────────────────────────────────────────────────────────────────────
// Forbidden phrases — what we MUST NOT say
//
// Lowercase. The phrase-scan test compares the lowercased TSX source of
// the page files against this list. Anything that hints at a
// recommendation, a savings claim, a model switch, or a punitive label
// for a user belongs here.
//
// Important: these are PROSE phrases, not bare tokens. We avoid words
// like "recommend" alone because the disclaimers say "Optimize
// recommendations remain blocked" (legitimately uses the word in the
// negative).
// ─────────────────────────────────────────────────────────────────────────

export const FORBIDDEN_PHRASES = [
    // Action-directing prose that would imply a recommendation.
    'we recommend',
    'we suggest',
    'you should switch',
    'switch to ',          // trailing space avoids matching "switch toggled" / similar
    'use instead',
    'route to instead',
    'optimize now',
    // Savings claims (negative-context disclaimers like "not a savings claim"
    // and "no savings claim" are allowed; affirmative savings amounts are not).
    'projected savings',
    'savings of $',
    'estimated savings',
    'savings opportunity',
    // Comparative model-bashing.
    'cheaper than',
    'cheaper model',
    // Punitive labels for people.
    'low performer',
    'worst user',
    'bad employee',
] as const;

// ─────────────────────────────────────────────────────────────────────────
// Sidebar IA — primary accountability path
// ─────────────────────────────────────────────────────────────────────────

export const PRIMARY_IA = [
    { id: 'mission-control', name: 'Mission Control', href: '/dashboard'                  },
    { id: 'meter',           name: 'Meter',           href: '/dashboard/meter'            },
    { id: 'monitor',         name: 'Monitor',         href: '/dashboard/monitor'          },
    { id: 'control',         name: 'Control',         href: '/dashboard/control'          },
    { id: 'prove',           name: 'Prove',           href: '/dashboard/prove'            },
    { id: 'outcomes',        name: 'Outcomes',        href: '/dashboard/prove/outcomes'   },
    { id: 'accountability',  name: 'Accountability',  href: '/dashboard/accountability'   },
] as const;

export type PrimaryIaItem = (typeof PRIMARY_IA)[number];
