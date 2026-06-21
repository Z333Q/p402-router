import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
    BRIDGE_OFFERS,
    ENTERPRISE_FLOOR_ARR_USD,
    PLANS,
    PRICING_PAGE_SUPPORT_LINE,
    PUBLIC_BRIDGE_OFFER_IDS,
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

describe('Pricing surface source-shape — forbidden phrases', () => {
    it('contains no "verified savings" claim (whitespace-tolerant)', () => {
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

    it('contains no specific "save N%" or "N% savings" claim', () => {
        for (const f of ALL_PRICING_FILES) {
            expect(readFileSync(f, 'utf8'), f).not.toMatch(/save \d+\s*%/i);
            expect(readFileSync(f, 'utf8'), f).not.toMatch(/\d+\s*% savings/i);
        }
    });

    it('contains no unsupported certification claim', () => {
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

describe('Pricing page — V5-led hybrid ladder visible', () => {
    const src = readFileSync(PRICING_PAGE, 'utf8');

    it('renders Sandbox, Build, Growth, Scale, Enterprise', () => {
        expect(src).toMatch(/<PlanCard plan=\{PLANS\.sandbox\}/);
        expect(src).toMatch(/<PlanCard plan=\{PLANS\.build\}/);
        expect(src).toMatch(/<PlanCard plan=\{PLANS\.growth\}/);
        expect(src).toMatch(/<PlanCard plan=\{PLANS\.scale\}/);
        expect(src).toMatch(/<PlanCard plan=\{PLANS\.enterprise\}/);
    });

    it('does NOT render Developer or Business plan cards', () => {
        expect(src).not.toMatch(/<PlanCard plan=\{PLANS\.developer\}/);
        expect(src).not.toMatch(/<PlanCard plan=\{PLANS\.business\}/);
    });

    it('highlights Growth as the production developer anchor', () => {
        expect(src).toMatch(/<PlanCard plan=\{PLANS\.growth\} highlight/);
    });

    it('bridge offers are rendered via PUBLIC_BRIDGE_OFFER_IDS (Proof Sprint hidden)', () => {
        expect(src).toMatch(/PUBLIC_BRIDGE_OFFER_IDS/);
        // No direct reference to proof_sprint in the rendered grid
        expect(src).not.toMatch(/<BridgeOfferCard offer=\{BRIDGE_OFFERS\.proof_sprint\}/);
    });
});

describe('Pricing page canonical assertions', () => {
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

    it('imports PLANS, BRIDGE_OFFERS, PUBLIC_BRIDGE_OFFER_IDS from the rate card', () => {
        expect(src).toContain('PLANS');
        expect(src).toContain('BRIDGE_OFFERS');
        expect(src).toContain('PUBLIC_BRIDGE_OFFER_IDS');
    });

    it('mentions Enterprise floor only via the rate-card constant', () => {
        expect(src).toMatch(/ENTERPRISE_FLOOR_ARR_USD/);
        const withoutImports = src.replace(/import[^;]+;\s*/g, '');
        expect(withoutImports).not.toMatch(/['"]\$60,000\s*ARR['"]/);
        expect(withoutImports).not.toMatch(/['"]\$60k\s*ARR['"]/);
    });

    it('canonical URL points at apex', () => {
        expect(src).toMatch(/https:\/\/p402\.io\/pricing/);
        expect(src).not.toMatch(/https:\/\/www\.p402\.io/);
    });
});

describe('Pricing page legacy-purge', () => {
    const src = readFileSync(PRICING_PAGE, 'utf8');

    it('does not show "Developer $249" or "Pro $499" wording', () => {
        expect(src).not.toMatch(/Developer\s+\$249/);
        expect(src).not.toMatch(/Pro\s+\$499/);
    });

    it('does not show "1% platform fee" / "0.75% platform fee" wording', () => {
        expect(src).not.toMatch(/1\.00%\s*platform fee/i);
        expect(src).not.toMatch(/0\.75%\s*platform fee/i);
    });

    it('does not publicly show Proof Sprint as a current offering', () => {
        // Proof Sprint may exist as a string elsewhere in the codebase as a
        // legacy reference, but it must not appear as a rendered BridgeOfferCard
        // on the /pricing page.
        expect(src).not.toMatch(/BRIDGE_OFFERS\.proof_sprint/);
        // The "Proof Sprint" buyer-facing copy must not appear on the page.
        expect(src).not.toMatch(/Proof Sprint/);
    });
});

describe('Bridge offers wired into the page (V5-led)', () => {
    const src = readFileSync(PRICING_PAGE, 'utf8');

    it('rate card bridge prices match V5-led hybrid plan', () => {
        expect(BRIDGE_OFFERS.ai_spend_audit.priceUsd).toBe(1_500);
        expect(BRIDGE_OFFERS.paid_pilot.priceUsd).toBe(35_000);
        expect(BRIDGE_OFFERS.regulated_pilot.priceUsd).toBe(50_000);
        expect(BRIDGE_OFFERS.proof_sprint.visibility).toBe('internal');
    });

    it('PUBLIC_BRIDGE_OFFER_IDS is exactly the 3 public offers', () => {
        expect([...PUBLIC_BRIDGE_OFFER_IDS]).toEqual([
            'ai_spend_audit',
            'paid_pilot',
            'regulated_pilot',
        ]);
    });

    it('section header reflects the V5 framing', () => {
        expect(src).toMatch(/Need executive evidence first/i);
        expect(src).toMatch(/\$1,500 audit/);
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

describe('3AY-Pricing-Realign CTA integrity', () => {
    const pageSrc = readFileSync(PRICING_PAGE, 'utf8');

    it('contains no href to /contact (which 404s on production)', () => {
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

    it('contains no Stripe Checkout, billing host, or "Start paid plan" copy', () => {
        expect(pageSrc).not.toMatch(/checkout\.stripe\.com/i);
        expect(pageSrc).not.toMatch(/billing\.stripe\.com/i);
        expect(pageSrc).not.toMatch(/metronome\.com\/checkout/i);
        expect(pageSrc).not.toMatch(/Start paid plan/i);
        expect(pageSrc).not.toMatch(/Stripe Checkout/i);
    });

    it('intent params are meaningful and on the V5 set + Enterprise/scoping', () => {
        const intents = [...pageSrc.matchAll(/\?intent=([a-z][a-z0-9-]*)/g)].map((m) => m[1]);
        const meaningful = new Set([
            'build',
            'growth',
            'scale',
            'enterprise',
            'ai-spend-audit',
            'paid-pilot',
            'regulated-pilot',
            'scoping-call',
        ]);
        for (const intent of intents) {
            expect(meaningful.has(intent!), `intent=${intent} is not on the V5 intent set`).toBe(true);
        }
        expect(intents.length).toBeGreaterThan(0);
    });

    it('does not link to legacy intent values from the page', () => {
        // Legacy intents (developer, business, proof-sprint) keep working via
        // LEGACY_INTENT_MAP for inbound bookmarks, but the page itself must
        // not emit them.
        expect(pageSrc).not.toMatch(/intent=developer\b/);
        expect(pageSrc).not.toMatch(/intent=business\b/);
        expect(pageSrc).not.toMatch(/intent=proof-sprint\b/);
    });
});

describe('Buyer-path tabs reflect V5 grouping', () => {
    const tabsSrc = readFileSync(join(PRICING_DIR, '_components', 'BuyerPathTabs.tsx'), 'utf8');
    it('renders the three buyer-path tabs', () => {
        expect(tabsSrc).toMatch(/Build AI software/);
        expect(tabsSrc).toMatch(/Govern enterprise AI spend/);
        expect(tabsSrc).toMatch(/Launch a pilot/);
    });
});
