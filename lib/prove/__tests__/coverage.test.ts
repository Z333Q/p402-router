/**
 * Slice 3K — Coverage / readiness pure logic tests.
 *
 * Pins the readiness state machine and the thresholds that govern when
 * cost-per-accepted-output is reported vs withheld as "insufficient data".
 */

import { describe, expect, it } from 'vitest';
import {
    DEFAULT_COVERAGE_THRESHOLDS,
    assessTopLevelReadiness,
    resolveCoverageThresholds,
    type CoverageTotals,
} from '@/lib/prove/coverage';

function totals(over: Partial<CoverageTotals> = {}): CoverageTotals {
    return {
        total_events: 1000,
        events_with_outcome: 500,
        events_without_outcome: 500,
        coverage_pct: 50,
        status: { accepted: 300, rejected: 100, revised: 30, escalated: 20, failed: 30, pending_review: 10, unknown: 10 },
        total_spend_usd: 200,
        accepted_spend_usd: 120,
        cost_per_accepted_output_usd: 0.4,
        cost_per_accepted_insufficient_data: false,
        window_days: 30,
        most_recent_outcome_at: '2026-06-05T10:00:00Z',
        outcome_freshness_seconds: 3600,
        ...over,
    };
}

describe('assessTopLevelReadiness — state machine', () => {
    const T = DEFAULT_COVERAGE_THRESHOLDS;

    it('blocked when there are no events at all', () => {
        const v = assessTopLevelReadiness(totals({ total_events: 0, events_with_outcome: 0, coverage_pct: 0 }), T);
        expect(v.status).toBe('blocked');
        expect(v.reason).toBe('no_events');
    });

    it('blocked when there are events but no outcomes recorded', () => {
        const v = assessTopLevelReadiness(totals({ events_with_outcome: 0, coverage_pct: 0, status: { accepted: 0, rejected: 0, revised: 0, escalated: 0, failed: 0, pending_review: 0, unknown: 0 } }), T);
        expect(v.status).toBe('blocked');
        expect(v.reason).toBe('no_outcomes_recorded');
    });

    it('not_ready when coverage is below the min threshold', () => {
        const v = assessTopLevelReadiness(totals({ coverage_pct: 10 }), T);
        expect(v.status).toBe('not_ready');
        expect(v.reason).toContain('coverage_below_threshold');
    });

    it('not_ready when accepted count is below the min threshold', () => {
        const v = assessTopLevelReadiness(totals({
            coverage_pct: 50, status: { ...totals().status, accepted: 5 },
        }), T);
        expect(v.status).toBe('not_ready');
        expect(v.reason).toContain('accepted_below_threshold');
    });

    it('observing when coverage + accepted are met but window is too short', () => {
        const v = assessTopLevelReadiness(totals({ window_days: 7 }), T);
        expect(v.status).toBe('observing');
        expect(v.reason).toContain('window_below_baseline');
    });

    it('ready_for_optimize_analysis when ALL thresholds are met', () => {
        const v = assessTopLevelReadiness(totals(), T);
        expect(v.status).toBe('ready_for_optimize_analysis');
        expect(v.explainer.toLowerCase()).toContain('analysis');
    });

    it('explainer never claims savings or directs an action', () => {
        // The ready-state explainer DOES use the word "recommendations" — in
        // the negative-context disclaimer "recommendations remain blocked".
        // We assert on action-directing phrases, not raw substrings.
        for (const totalsArg of [
            totals(),
            totals({ coverage_pct: 10 }),
            totals({ window_days: 5 }),
            totals({ total_events: 0, events_with_outcome: 0 }),
        ]) {
            const v = assessTopLevelReadiness(totalsArg, T);
            const e = v.explainer.toLowerCase();
            for (const forbidden of [
                'savings',
                'we recommend', 'we suggest',
                'you should switch', 'switch to ', 'use instead',
                'cheaper than', 'projected savings',
            ]) {
                expect(e, `phrase '${forbidden}' must not appear`).not.toContain(forbidden);
            }
        }
    });
});

describe('resolveCoverageThresholds — env overrides', () => {
    it('falls back to defaults when env not set', () => {
        delete process.env.OUTCOME_MIN_COVERAGE_PCT;
        delete process.env.OUTCOME_MIN_ACCEPTED_COUNT;
        delete process.env.OUTCOME_MIN_BASELINE_DAYS;
        expect(resolveCoverageThresholds()).toEqual(DEFAULT_COVERAGE_THRESHOLDS);
    });

    it('honors env overrides', () => {
        process.env.OUTCOME_MIN_COVERAGE_PCT = '50';
        process.env.OUTCOME_MIN_ACCEPTED_COUNT = '200';
        process.env.OUTCOME_MIN_BASELINE_DAYS = '90';
        try {
            expect(resolveCoverageThresholds()).toEqual({
                min_coverage_pct: 50,
                min_accepted_count: 200,
                min_baseline_days: 90,
            });
        } finally {
            delete process.env.OUTCOME_MIN_COVERAGE_PCT;
            delete process.env.OUTCOME_MIN_ACCEPTED_COUNT;
            delete process.env.OUTCOME_MIN_BASELINE_DAYS;
        }
    });
});
