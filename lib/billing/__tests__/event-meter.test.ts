/**
 * Phase 1A: unit tests for the event-meter snapshot builder.
 *
 * Pure-logic tests against buildSnapshot. The data layer (db.query) is
 * exercised indirectly via the API route; these tests pin the snapshot
 * shape and the threshold math for Sandbox / Build / Growth / Scale /
 * Enterprise plans.
 */

import { describe, expect, it } from 'vitest';
import { buildSnapshot, NEXT_UPGRADE_REASON, UPGRADE_NOTICE } from '@/lib/billing/event-meter';
import { PLANS } from '@/lib/pricing/rate-card';

describe('event-meter buildSnapshot', () => {
    it('Sandbox empty state: hasAnyEvent=false, percentUsed=0', () => {
        const snap = buildSnapshot({
            planId: 'sandbox',
            planName: PLANS.sandbox.name,
            includedEvents: PLANS.sandbox.includedEventsPerMonth,
            retentionDays: PLANS.sandbox.retentionDays,
            monthEventsUsed: 0,
            firstEventAt: null,
            lastEventAt: null,
            hasAnyEvent: false,
        });
        expect(snap.planId).toBe('sandbox');
        expect(snap.includedEvents).toBe(25_000);
        expect(snap.retentionDays).toBe(14);
        expect(snap.monthEventsUsed).toBe(0);
        expect(snap.percentUsed).toBe(0);
        expect(snap.hasAnyEvent).toBe(false);
        expect(snap.firstEventAt).toBeNull();
        expect(snap.lastEventAt).toBeNull();
        expect(snap.upgradeNotice).toBe(UPGRADE_NOTICE);
        expect(snap.nextUpgradeReason).toBe(NEXT_UPGRADE_REASON.sandbox);
    });

    it('Build plan threshold: 200,000 of 250,000 = 80%', () => {
        const snap = buildSnapshot({
            planId: 'build',
            planName: PLANS.build.name,
            includedEvents: PLANS.build.includedEventsPerMonth,
            retentionDays: PLANS.build.retentionDays,
            monthEventsUsed: 200_000,
            firstEventAt: '2026-06-01T00:00:00.000Z',
            lastEventAt: '2026-06-28T00:00:00.000Z',
            hasAnyEvent: true,
        });
        expect(snap.includedEvents).toBe(250_000);
        expect(snap.percentUsed).toBe(80);
        expect(snap.retentionDays).toBe(30);
        expect(snap.hasAnyEvent).toBe(true);
        expect(snap.nextUpgradeReason).toBe(NEXT_UPGRADE_REASON.build);
    });

    it('Growth plan threshold: 1,000,000 of 2,000,000 = 50%', () => {
        const snap = buildSnapshot({
            planId: 'growth',
            planName: PLANS.growth.name,
            includedEvents: PLANS.growth.includedEventsPerMonth,
            retentionDays: PLANS.growth.retentionDays,
            monthEventsUsed: 1_000_000,
            firstEventAt: null,
            lastEventAt: null,
            hasAnyEvent: true,
        });
        expect(snap.includedEvents).toBe(2_000_000);
        expect(snap.percentUsed).toBe(50);
        expect(snap.retentionDays).toBe(90);
        expect(snap.nextUpgradeReason).toBe(NEXT_UPGRADE_REASON.growth);
    });

    it('percent is capped at 100 when usage exceeds inclusion', () => {
        const snap = buildSnapshot({
            planId: 'build',
            planName: PLANS.build.name,
            includedEvents: PLANS.build.includedEventsPerMonth,
            retentionDays: PLANS.build.retentionDays,
            monthEventsUsed: 5_000_000,
            firstEventAt: null,
            lastEventAt: null,
            hasAnyEvent: true,
        });
        expect(snap.percentUsed).toBe(100);
    });

    it('Enterprise (null inclusion) returns percentUsed null', () => {
        const snap = buildSnapshot({
            planId: 'enterprise',
            planName: PLANS.enterprise.name,
            includedEvents: null,
            retentionDays: null,
            monthEventsUsed: 7_500_000,
            firstEventAt: null,
            lastEventAt: null,
            hasAnyEvent: true,
        });
        expect(snap.includedEvents).toBeNull();
        expect(snap.percentUsed).toBeNull();
        expect(snap.retentionDays).toBeNull();
        expect(snap.nextUpgradeReason).toBe(NEXT_UPGRADE_REASON.enterprise);
    });

    it('upgradeNotice copy is locked to the billing-rollout phrasing', () => {
        const snap = buildSnapshot({
            planId: 'sandbox',
            planName: PLANS.sandbox.name,
            includedEvents: PLANS.sandbox.includedEventsPerMonth,
            retentionDays: PLANS.sandbox.retentionDays,
            monthEventsUsed: 0,
            firstEventAt: null,
            lastEventAt: null,
            hasAnyEvent: false,
        });
        expect(snap.upgradeNotice).toBe('Upgrade path is controlled by the billing rollout.');
    });
});
