import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
    BRIDGE_OFFERS,
    ENTERPRISE_FLOOR_ARR_USD,
    PLANS,
    PRICING_PAGE_SUPPORT_LINE,
} from '@/lib/pricing/rate-card';

const PRICING_DIR = join(__dirname, '..');
const PRICING_PAGE = join(PRICING_DIR, 'page.tsx');
const METRIC_PAGE = join(PRICING_DIR, 'metric-definition', 'page.tsx');

function walk(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
        if (entry === '__tests__') continue;
        const full = join(dir, entry);
        const st = statSync(full);
        if (st.isDirectory()) out.push(...walk(full));
        else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) out.push(full);
    }
    return out;
}

const ALL_PRICING_FILES = walk(PRICING_DIR);

describe('Pricing surface source-shape (3AY §16.1 forbidden phrases)', () => {
    it('contains no "verified savings" claim', () => {
        for (const f of ALL_PRICING_FILES) {
            expect(readFileSync(f, 'utf8'), f).not.toMatch(/verified[\s_-]+savings/i);
        }
    });

    it('contains no "policy auto-apply" claim', () => {
        for (const f of ALL_PRICING_FILES) {
            expect(readFileSync(f, 'utf8'), f).not.toMatch(/policy[_-]?auto[_-]?apply/i);
        }
    });

    it('contains no "automatically optimize" claim', () => {
        for (const f of ALL_PRICING_FILES) {
            expect(readFileSync(f, 'utf8'), f).not.toMatch(/automatically optimize/i);
            expect(readFileSync(f, 'utf8'), f).not.toMatch(/automatic optimization/i);
        }
    });

    it('contains no "runtime enforcement active/live/enabled" claim', () => {
        for (const f of ALL_PRICING_FILES) {
            expect(readFileSync(f, 'utf8'), f).not.toMatch(/runtime enforcement (active|live|enabled)/i);
        }
    });

    it('contains no specific "save N%" savings claim', () => {
        for (const f of ALL_PRICING_FILES) {
            expect(readFileSync(f, 'utf8'), f).not.toMatch(/save \d+\s*%/i);
            expect(readFileSync(f, 'utf8'), f).not.toMatch(/\d+\s*% savings/i);
        }
    });

    it('contains no unsupported certification claim (SOC 2 / HIPAA / ISO 27001 compliant)', () => {
        for (const f of ALL_PRICING_FILES) {
            const src = readFileSync(f, 'utf8');
            expect(src, f).not.toMatch(/\bSOC ?2 compliant\b/i);
            expect(src, f).not.toMatch(/\bHIPAA compliant\b/i);
            expect(src, f).not.toMatch(/\bISO ?27001 certified\b/i);
            expect(src, f).not.toMatch(/\bFedRAMP\b/i);
        }
    });

    it('contains no "guaranteed savings" or "ROI guarantee" claim', () => {
        for (const f of ALL_PRICING_FILES) {
            expect(readFileSync(f, 'utf8'), f).not.toMatch(/guaranteed savings/i);
            expect(readFileSync(f, 'utf8'), f).not.toMatch(/ROI guarantee/i);
        }
    });
});

describe('Pricing page canonical-phrase assertions (3AY §16.2)', () => {
    const src = readFileSync(PRICING_PAGE, 'utf8');

    it('renders the locked pricing-page support line', () => {
        expect(src).toMatch(/PRICING_PAGE_SUPPORT_LINE/);
        expect(PRICING_PAGE_SUPPORT_LINE).toBe(
            'Start free. Upgrade when usage and governance needs grow.'
        );
    });

    it('references the rate-card module as the source of truth', () => {
        expect(src).toMatch(/from\s+['"]@\/lib\/pricing\/rate-card['"]/);
    });

    it('imports PLANS and BRIDGE_OFFERS from the rate card', () => {
        expect(src).toContain('PLANS');
        expect(src).toContain('BRIDGE_OFFERS');
    });

    it('mentions Enterprise floor only via the rate-card constant', () => {
        expect(src).toMatch(/ENTERPRISE_FLOOR_ARR_USD/);
        // Do not allow a hardcoded "$60,000" or "$60k" literal in the page body
        // that bypasses the rate-card module.
        const withoutImports = src.replace(/import[^;]+;\s*/g, '');
        expect(withoutImports).not.toMatch(/['"]\$60,000\s*ARR['"]/);
        expect(withoutImports).not.toMatch(/['"]\$60k\s*ARR['"]/);
    });

    it('canonical URL points at apex', () => {
        expect(src).toMatch(/https:\/\/p402\.io\/pricing/);
        expect(src).not.toMatch(/https:\/\/www\.p402\.io/);
    });

    it('JSON-LD Product schema emits all five plans', () => {
        for (const id of ['sandbox', 'developer', 'business', 'scale', 'enterprise'] as const) {
            expect(src).toMatch(new RegExp(PLANS[id].name));
        }
    });
});

describe('Pricing page must NOT use the legacy 1% / Pro $499 wording', () => {
    const src = readFileSync(PRICING_PAGE, 'utf8');

    it('does not show "1% fee" or "0.75% fee" wording', () => {
        expect(src).not.toMatch(/1\.00%\s*platform fee/i);
        expect(src).not.toMatch(/0\.75%\s*platform fee/i);
    });

    it('does not show the legacy "Pro $499/mo" plan name', () => {
        expect(src).not.toMatch(/Pro \$499/);
        expect(src).not.toMatch(/Pro\s+\$499\/mo/);
    });
});

describe('Bridge offers wired into the page', () => {
    const src = readFileSync(PRICING_PAGE, 'utf8');

    it('renders Proof Sprint, Paid Pilot, and Regulated Pilot cards', () => {
        expect(src).toMatch(/proof_sprint/);
        expect(src).toMatch(/paid_pilot/);
        expect(src).toMatch(/regulated_pilot/);
    });

    it('rate card bridge prices match 3AX §4.2', () => {
        expect(BRIDGE_OFFERS.proof_sprint.priceUsd).toBe(15_000);
        expect(BRIDGE_OFFERS.paid_pilot.priceUsd).toBe(35_000);
        expect(BRIDGE_OFFERS.regulated_pilot.priceUsd).toBe(50_000);
    });
});

describe('Metric definition page', () => {
    const src = readFileSync(METRIC_PAGE, 'utf8');

    it('renders the v1 metric definition headline', () => {
        expect(src).toMatch(/Metered AI event definition/i);
        expect(src).toMatch(/Rate card v1/i);
    });

    it('contains the canonical "What counts" / "What does not count" sections', () => {
        expect(src).toMatch(/What counts as a metered AI event/i);
        expect(src).toMatch(/What does not count/i);
    });

    it('canonical URL points at apex /pricing/metric-definition', () => {
        expect(src).toMatch(/https:\/\/p402\.io\/pricing\/metric-definition/);
        expect(src).not.toMatch(/https:\/\/www\.p402\.io/);
    });

    it('contains no forbidden phrases', () => {
        expect(src).not.toMatch(/verified[\s_-]+savings/i);
        expect(src).not.toMatch(/policy[_-]?auto[_-]?apply/i);
        expect(src).not.toMatch(/automatically optimize/i);
        expect(src).not.toMatch(/save \d+\s*%/i);
    });
});

describe('3AY-1 blocker fixes (tabs, add-ons, settlement, BAA, Developer CTA)', () => {
    const pageSrc = readFileSync(PRICING_PAGE, 'utf8');

    it('renders the three buyer-path tabs (Build / Govern / Pilot)', () => {
        const tabsSrc = readFileSync(join(PRICING_DIR, '_components', 'BuyerPathTabs.tsx'), 'utf8');
        expect(tabsSrc).toMatch(/Build AI software/);
        expect(tabsSrc).toMatch(/Govern enterprise AI spend/);
        expect(tabsSrc).toMatch(/Launch a pilot/);
        expect(pageSrc).toMatch(/<BuyerPathTabs/);
    });

    it('renders the add-ons section with all 3AX §29.1 add-ons', () => {
        expect(pageSrc).toMatch(/<AddOnsList/);
        const addonsSrc = readFileSync(join(PRICING_DIR, '_components', 'AddOnsList.tsx'), 'utf8');
        expect(addonsSrc).toMatch(/Settlement \(Base, Tempo\)/);
        expect(addonsSrc).toMatch(/Advanced audit retention/);
        expect(addonsSrc).toMatch(/Data warehouse export/);
        expect(addonsSrc).toMatch(/Private deployment design/);
        expect(addonsSrc).toMatch(/Procurement pack/);
        expect(addonsSrc).toMatch(/Dedicated support/);
        expect(addonsSrc).toMatch(/Regulated evidence pack/);
        expect(addonsSrc).toMatch(/Optimize Readiness review/);
    });

    it('Settlement pricing transition section is present and links to facilitator docs', () => {
        expect(pageSrc).toMatch(/Settlement pricing/i);
        expect(pageSrc).toMatch(/Settlement is optional/);
        expect(pageSrc).toMatch(/\/docs\/facilitator/);
        expect(pageSrc).toMatch(/\/docs\/router/);
    });

    it('BAA copy uses the "after security and contracting review" qualifier', () => {
        expect(pageSrc).toMatch(/BAA path available for regulated pilots after security and contracting review/);
        expect(pageSrc).not.toMatch(/BAA is available for healthcare use cases/);
    });

    it('Developer CTA does not imply paid self-serve checkout exists yet', () => {
        expect(pageSrc).not.toMatch(/Stripe Checkout/i);
        expect(pageSrc).not.toMatch(/paid self-serve/i);
    });

    it('uses "cost-savings" framing instead of "verified savings"', () => {
        expect(pageSrc).not.toMatch(/verified[\s_-]+savings/i);
        expect(pageSrc).toMatch(/does not claim cost savings/i);
    });
});

describe('3AY-3 CTA integrity (no broken /contact links, no false checkout copy)', () => {
    const pageSrc = readFileSync(PRICING_PAGE, 'utf8');

    it('contains no href to /contact (which 404s on production)', () => {
        // Extract every href attribute and assert none start with "/contact".
        const hrefs = [...pageSrc.matchAll(/href="(\/[^"]+)"/g)].map((m) => m[1]);
        for (const h of hrefs) {
            expect(h, `href ${h} would 404 on production`).not.toMatch(/^\/contact($|\?|\/)/);
        }
    });

    it('every pricing CTA points at /dashboard, /get-access, /docs, or /pricing/*', () => {
        const hrefs = [...pageSrc.matchAll(/href="(\/[^"]+)"/g)].map((m) => m[1]);
        const allowed = /^\/(dashboard|get-access(\?.*)?|docs\/.*|pricing(\/.+)?)$/;
        for (const h of hrefs) {
            expect(h, `href ${h} is not on the approved destination list`).toMatch(allowed);
        }
    });

    it('contains no Stripe Checkout or external billing host', () => {
        expect(pageSrc).not.toMatch(/checkout\.stripe\.com/i);
        expect(pageSrc).not.toMatch(/billing\.stripe\.com/i);
        expect(pageSrc).not.toMatch(/metronome\.com\/checkout/i);
        expect(pageSrc).not.toMatch(/Start paid plan/i);
    });

    it('intent params remain meaningful and stable', () => {
        const intents = [...pageSrc.matchAll(/\?intent=([a-z][a-z0-9-]*)/g)].map((m) => m[1]);
        const meaningful = new Set([
            'developer', 'business', 'scale', 'enterprise',
            'proof-sprint', 'paid-pilot', 'regulated-pilot',
            'scoping-call', 'procurement', 'finance',
        ]);
        for (const intent of intents) {
            expect(meaningful.has(intent!), `intent=${intent} is not on the approved intent list`).toBe(true);
        }
        expect(intents.length).toBeGreaterThan(0);
    });
});

describe('Plan card invariants', () => {
    const src = readFileSync(join(PRICING_DIR, '_components', 'PlanCard.tsx'), 'utf8');

    it('reads price + retention + overage from the PlanDefinition prop', () => {
        expect(src).toMatch(/plan\.monthlyPriceAnnualUsd/);
        expect(src).toMatch(/plan\.retentionDays/);
        expect(src).toMatch(/plan\.overageUsdPer1kEvents/);
    });

    it('uses formatUsd and formatEventAllowance helpers', () => {
        expect(src).toMatch(/formatUsd/);
        expect(src).toMatch(/formatEventAllowance/);
    });
});

describe('Enterprise floor value flows from rate-card constant', () => {
    it('rate card publishes the $60k floor', () => {
        expect(ENTERPRISE_FLOOR_ARR_USD).toBe(60_000);
    });
});
