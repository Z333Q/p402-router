/**
 * Source-shape tests for the /ai-cost-management-reddit SEO landing.
 *
 * Pins:
 *   - Slug (filesystem path), title metadata, and H1 anchor "AI Cost
 *     Management on Reddit" or the canonical title string.
 *   - Required topical mentions for broad-query coverage: AI cost control,
 *     AI spend tracking, token usage, metadata-only mode.
 *   - Required internal-link surface.
 *   - First-party-analysis posture: no Reddit endorsement, no copied/
 *     scraped Reddit content claim, no Reddit logo/brand styling reference.
 *   - Copy guard for unsupported savings, unsupported compliance posture,
 *     legacy pricing strings, and live-checkout claims.
 *   - schema.org JSON-LD coverage.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const PAGE_PATH = resolve(ROOT, 'app', 'ai-cost-management-reddit', 'page.tsx');
const LAYOUT_PATH = resolve(ROOT, 'app', 'ai-cost-management-reddit', 'layout.tsx');
const SITEMAP_PATH = resolve(ROOT, 'app', 'sitemap.ts');

const PAGE_SRC = readFileSync(PAGE_PATH, 'utf8');
const LAYOUT_SRC = readFileSync(LAYOUT_PATH, 'utf8');
const SITEMAP_SRC = readFileSync(SITEMAP_PATH, 'utf8');

describe('/ai-cost-management-reddit — route, slug, title, H1', () => {
    it('slug exists at /ai-cost-management-reddit', () => {
        expect(existsSync(PAGE_PATH)).toBe(true);
        expect(existsSync(LAYOUT_PATH)).toBe(true);
    });

    it('page title metadata equals "AI Cost Management on Reddit | P402"', () => {
        const titleConst = LAYOUT_SRC.match(/const\s+TITLE\s*=\s*['"`]([^'"`]+)['"`]/);
        expect(titleConst).not.toBeNull();
        expect(titleConst![1]).toBe('AI Cost Management on Reddit | P402');
        expect(LAYOUT_SRC).toMatch(/title:\s*TITLE/);
    });

    it('H1 renders the canonical headline string', () => {
        const h1Match = PAGE_SRC.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
        expect(h1Match).not.toBeNull();
        const inner = h1Match![1];
        expect(inner).toMatch(/AI Cost Management on/);
        expect(inner).toMatch(/Reddit/);
        expect(inner).toMatch(/What Teams Are Asking About AI Spend/);
    });

    it('canonical URL points at https://p402.io/ai-cost-management-reddit', () => {
        expect(LAYOUT_SRC).toContain("'https://p402.io/ai-cost-management-reddit'");
    });

    it('appears in sitemap.ts', () => {
        expect(SITEMAP_SRC).toContain('/ai-cost-management-reddit');
        expect(SITEMAP_SRC).not.toContain('/ai-cost-tracking-reddit');
    });

    it('meta description matches the locked phrasing', () => {
        expect(LAYOUT_SRC).toMatch(/Teams are asking how to track AI costs/);
        expect(LAYOUT_SRC).toMatch(/turns AI usage into accountable spend/);
    });
});

describe('/ai-cost-management-reddit — broad-query topical coverage', () => {
    const REQUIRED_MENTIONS = [
        'AI cost management',
        'AI cost control',
        'AI spend tracking',
        'token usage',
        'AI cost optimization',
        'AI COGS',
        'metadata-only',
        'OpenAI',
        'OpenRouter',
        'Anthropic',
        'workflow_id',
        'customer_id',
        'feature_id',
    ];

    for (const phrase of REQUIRED_MENTIONS) {
        it(`page mentions "${phrase}"`, () => {
            expect(PAGE_SRC.toLowerCase()).toContain(phrase.toLowerCase());
        });
    }
});

describe('/ai-cost-management-reddit — internal link surface', () => {
    const REQUIRED_LINKS = [
        '/developers',
        '/developers/quickstart',
        '/ai-spend-audit',
        '/trust',
        '/pricing',
        '/get-access?intent=build',
        '/get-access?intent=ai-spend-audit',
    ];

    for (const href of REQUIRED_LINKS) {
        it(`links to ${href}`, () => {
            const escaped = href.replace(/[/?=]/g, (c) => `\\${c}`);
            expect(PAGE_SRC).toMatch(new RegExp(`href=['"]${escaped}['"]`));
        });
    }
});

describe('/ai-cost-management-reddit — schema.org JSON-LD', () => {
    it('includes WebPage, Article, FAQPage, BreadcrumbList, Organization, SoftwareApplication', () => {
        for (const schemaType of ['WebPage', 'Article', 'FAQPage', 'BreadcrumbList', 'Organization', 'SoftwareApplication']) {
            expect(PAGE_SRC, `missing schema.org type "${schemaType}"`).toMatch(new RegExp(`['"]@type['"]:\\s*['"]${schemaType}['"]`));
        }
    });

    it('FAQPage carries mainEntity from FAQ_ENTRIES', () => {
        expect(PAGE_SRC).toMatch(/mainEntity:\s*FAQ_ENTRIES\.map/);
    });

    it('JSON-LD is injected via application/ld+json script', () => {
        expect(PAGE_SRC).toContain('application/ld+json');
        expect(PAGE_SRC).toContain('dangerouslySetInnerHTML');
    });
});

describe('/ai-cost-management-reddit — OpenGraph, Twitter, robots', () => {
    it('declares openGraph block with article type', () => {
        expect(LAYOUT_SRC).toContain('openGraph:');
        expect(LAYOUT_SRC).toMatch(/type:\s*['"]article['"]/);
    });

    it('declares twitter card metadata', () => {
        expect(LAYOUT_SRC).toContain('twitter:');
        expect(LAYOUT_SRC).toMatch(/card:\s*['"]summary_large_image['"]/);
    });

    it('declares robots block with index/follow true', () => {
        expect(LAYOUT_SRC).toContain('robots:');
        expect(LAYOUT_SRC).toMatch(/index:\s*true/);
        expect(LAYOUT_SRC).toMatch(/follow:\s*true/);
    });
});

describe('/ai-cost-management-reddit — first-party-analysis posture', () => {
    it('does not claim Reddit endorsement', () => {
        for (const phrase of [
            'Reddit endorses',
            'Reddit endorsed',
            'Reddit endorsement',
            'endorsed by Reddit',
            'P402 is on Reddit',
            'official Reddit',
        ]) {
            expect(PAGE_SRC).not.toContain(phrase);
            expect(LAYOUT_SRC).not.toContain(phrase);
        }
    });

    it('does not claim to use Reddit logo or brand styling', () => {
        for (const phrase of ['Reddit logo', 'Reddit brand', 'Reddit-styled', 'Reddit branding']) {
            expect(PAGE_SRC).not.toContain(phrase);
            expect(LAYOUT_SRC).not.toContain(phrase);
        }
    });

    it('does not claim to scrape or copy Reddit content', () => {
        for (const phrase of ['scraped Reddit', 'copied Reddit', 'Reddit comments', 'Reddit thread quote']) {
            expect(PAGE_SRC).not.toContain(phrase);
        }
    });

    it('discloses first-party-analysis posture in the footer', () => {
        expect(PAGE_SRC).toContain('First-party analysis');
        expect(PAGE_SRC).toContain('Not affiliated with Reddit');
    });
});

describe('/ai-cost-management-reddit — copy guard', () => {
    const FORBIDDEN_SUBSTRINGS = [
        'verified savings',
        'guaranteed savings',
        'auto-apply',
        'SOC 2 compliant',
        'HIPAA compliant',
        'ISO certified',
        'GDPR compliant',
        'FedRAMP',
        'Developer $249',
        'Business $2,500',
        'Proof Sprint',
        'Stripe Checkout',
        'Buy now',
        'Start paid plan',
        'p402_live_',
    ];

    for (const phrase of FORBIDDEN_SUBSTRINGS) {
        it(`does not contain "${phrase}"`, () => {
            expect(PAGE_SRC).not.toContain(phrase);
            expect(LAYOUT_SRC).not.toContain(phrase);
        });
    }

    it('does not match the save-N% pattern', () => {
        expect(PAGE_SRC).not.toMatch(/save\s*\d+%/i);
        expect(LAYOUT_SRC).not.toMatch(/save\s*\d+%/i);
    });

    it('does not contain em dashes or decorative arrow glyphs', () => {
        expect(PAGE_SRC).not.toMatch(/—/);
        expect(LAYOUT_SRC).not.toMatch(/—/);
        expect(PAGE_SRC).not.toMatch(/→|⇒/);
    });

    it('does not claim checkout is live', () => {
        expect(PAGE_SRC).not.toMatch(/checkout is live/i);
        expect(PAGE_SRC).not.toMatch(/Start checkout/i);
    });

    it('explicitly does not guarantee savings in the FAQ', () => {
        expect(PAGE_SRC).toMatch(/Does P402 guarantee savings\?/);
        expect(PAGE_SRC).toMatch(/No\. P402 helps teams identify spend patterns/);
    });

    it('explicitly states settlement is optional', () => {
        expect(PAGE_SRC).toMatch(/Settlement is optional/);
    });

    it('explicitly states no prompt storage is required', () => {
        expect(PAGE_SRC).toMatch(/Prompts and responses are not (?:retained|required)/i);
    });
});

describe('/ai-cost-management-reddit — content depth', () => {
    it('declares FAQ with at least 8 entries', () => {
        const matches = PAGE_SRC.match(/q:\s*['"]/g) ?? [];
        expect(matches.length).toBeGreaterThanOrEqual(8);
    });

    it('declares at least 8 common questions in the discussion frame', () => {
        // Use the COMMON_QUESTIONS constant name and entry count check.
        expect(PAGE_SRC).toContain('COMMON_QUESTIONS');
        const matches = PAGE_SRC.match(/'\?'|"\?"|\?',|\?",/g) ?? [];
        expect(matches.length).toBeGreaterThanOrEqual(8);
    });

    it('declares the four-category comparison block', () => {
        for (const cat of ['Provider invoice', 'LLM observability', 'Gateway logs', 'P402']) {
            expect(PAGE_SRC).toContain(cat);
        }
    });

    it('declares the five product pillars: Meter, Monitor, Control, Prove, Optimize', () => {
        expect(PAGE_SRC).toMatch(/Meter AI usage/);
        expect(PAGE_SRC).toMatch(/Monitor spend/);
        expect(PAGE_SRC).toMatch(/Control budgets/);
        expect(PAGE_SRC).toMatch(/Prove with receipts/);
        expect(PAGE_SRC).toMatch(/Optimize on evidence/);
    });

    it('declares last-modified date', () => {
        expect(PAGE_SRC).toMatch(/PAGE_LAST_MODIFIED\s*=\s*['"]\d{4}-\d{2}-\d{2}['"]/);
    });
});
