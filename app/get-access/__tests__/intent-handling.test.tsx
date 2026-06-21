import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen, cleanup } from '@testing-library/react';
import GetAccessPage from '../page';

const currentParams = new URLSearchParams();
vi.mock('next/navigation', async () => {
    const actual = await vi.importActual<typeof import('next/navigation')>('next/navigation');
    return {
        ...actual,
        useSearchParams: () => currentParams,
        useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    };
});

vi.mock('next/link', () => ({
    default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
        <a href={href} {...rest}>{children}</a>
    ),
}));

vi.mock('@/components/TopNav', () => ({ TopNav: () => <nav data-testid="top-nav" /> }));
vi.mock('@/components/Footer', () => ({ Footer: () => <footer data-testid="footer" /> }));

function renderWithIntent(intent: string | null) {
    currentParams.forEach((_, k) => currentParams.delete(k));
    if (intent !== null) currentParams.set('intent', intent);
    return render(<GetAccessPage />);
}

beforeEach(() => {
    cleanup();
    currentParams.forEach((_, k) => currentParams.delete(k));
});

describe('GetAccessPage — V5-led intent rendering', () => {
    it('intent=build renders Build copy and the upcoming-billing notice', () => {
        renderWithIntent('build');
        expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Build/i);
        expect(screen.getByText(/3AY-8R/)).toBeTruthy();
        expect(document.body.textContent ?? '').toContain('$49');
    });

    it('intent=growth renders Growth copy + $199 + upcoming-billing notice', () => {
        renderWithIntent('growth');
        const body = document.body.textContent ?? '';
        expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Growth/i);
        expect(body).toContain('$199');
        expect(body).toMatch(/3AY-8R/);
    });

    it('intent=scale renders Scale copy with $799 from rate card', () => {
        renderWithIntent('scale');
        const body = document.body.textContent ?? '';
        expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Scale/i);
        expect(body).toContain('$799');
    });

    it('intent=enterprise renders Enterprise copy with from-$60,000 ARR', () => {
        renderWithIntent('enterprise');
        expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Enterprise/i);
        expect(document.body.textContent ?? '').toMatch(/\$60,000\s*ARR/);
    });

    it('intent=ai-spend-audit renders AI Spend Audit, $1,500, one-time, 100% credit', () => {
        renderWithIntent('ai-spend-audit');
        const body = document.body.textContent ?? '';
        expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/AI Spend Audit/i);
        expect(body).toContain('$1,500');
        expect(body.toLowerCase()).toContain('one-time');
        expect(body).toMatch(/100%/);
    });

    it('intent=paid-pilot renders Paid Pilot + $35,000 + 50% credit', () => {
        renderWithIntent('paid-pilot');
        const body = document.body.textContent ?? '';
        expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Paid Pilot/i);
        expect(body).toContain('$35,000');
        expect(body).toMatch(/50%/);
    });

    it('intent=regulated-pilot renders Regulated Pilot + $50,000+ + 90 days + BAA qualification', () => {
        renderWithIntent('regulated-pilot');
        const body = document.body.textContent ?? '';
        expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Regulated Pilot/i);
        expect(body).toContain('$50,000');
        expect(body).toMatch(/90[- ]day/);
        expect(body).toMatch(/BAA path available after security and contracting review/);
    });

    it('intent=scoping-call renders general scoping copy + no-card language + V5 reference pricing', () => {
        renderWithIntent('scoping-call');
        const body = document.body.textContent ?? '';
        expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/scoping call/i);
        expect(body).toMatch(/No card required/i);
        expect(body).toContain('$49');   // Build reference price
        expect(body).toContain('$199');  // Growth reference price
        expect(body).toContain('$1,500'); // AI Spend Audit reference price
    });

    it('unknown intent renders the generic access request page', () => {
        renderWithIntent('totally-not-a-real-intent');
        expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Request access to P402/i);
    });

    it('no intent param renders the generic access request page', () => {
        renderWithIntent(null);
        expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Request access to P402/i);
    });
});

describe('Legacy intent compatibility on /get-access', () => {
    it('legacy intent=developer renders Build copy (resolved via LEGACY_INTENT_MAP)', () => {
        renderWithIntent('developer');
        expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Build/i);
        expect(document.body.textContent ?? '').toContain('$49');
    });

    it('legacy intent=business renders Scale copy (resolved via LEGACY_INTENT_MAP)', () => {
        renderWithIntent('business');
        expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Scale/i);
        expect(document.body.textContent ?? '').toContain('$799');
    });

    it('legacy intent=proof-sprint renders AI Spend Audit copy (resolved via LEGACY_INTENT_MAP)', () => {
        renderWithIntent('proof-sprint');
        expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/AI Spend Audit/i);
        expect(document.body.textContent ?? '').toContain('$1,500');
    });
});

describe('GetAccessPage — analytics + hidden intent input', () => {
    it('emits data attributes for new V5 intents', () => {
        renderWithIntent('ai-spend-audit');
        const card = document.querySelector('[data-pricing-intent]') as HTMLElement | null;
        expect(card).not.toBeNull();
        expect(card!.getAttribute('data-pricing-intent')).toBe('ai-spend-audit');
        expect(card!.getAttribute('data-offer-id')).toBe('ai_spend_audit');
        expect(card!.getAttribute('data-plan-id')).toBe('');
    });

    it('emits data-plan-id for plan intents', () => {
        renderWithIntent('build');
        const card = document.querySelector('[data-pricing-intent]') as HTMLElement | null;
        expect(card?.getAttribute('data-plan-id')).toBe('build');
        expect(card?.getAttribute('data-offer-id')).toBe('');
    });

    it('hidden intent input is present in the form', () => {
        renderWithIntent('paid-pilot');
        const hidden = screen.getByTestId('hidden-intent') as HTMLInputElement;
        expect(hidden.value).toBe('paid-pilot');
        expect(hidden.type).toBe('hidden');
    });

    it('legacy intent flows through hidden input as the canonical (resolved) value', () => {
        // The form's hidden intent reflects what the user sees, which for legacy
        // values is the resolved intent (e.g. proof-sprint → ai-spend-audit).
        renderWithIntent('proof-sprint');
        const hidden = screen.getByTestId('hidden-intent') as HTMLInputElement;
        expect(hidden.value).toBe('ai-spend-audit');
    });
});

describe('GetAccessPage — source-shape (no forbidden phrases anywhere)', () => {
    const PAGE_DIR = join(__dirname, '..');
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

    const FILES = walk(PAGE_DIR);

    it('contains no Stripe Checkout / Metronome checkout / billing host', () => {
        for (const f of FILES) {
            const src = readFileSync(f, 'utf8');
            expect(src, f).not.toMatch(/checkout\.stripe\.com/i);
            expect(src, f).not.toMatch(/billing\.stripe\.com/i);
            expect(src, f).not.toMatch(/metronome\.com\/checkout/i);
            expect(src, f).not.toMatch(/Stripe Checkout/i);
        }
    });

    it('contains no forbidden claims', () => {
        for (const f of FILES) {
            const src = readFileSync(f, 'utf8');
            expect(src, f).not.toMatch(/verified[\s_-]+savings/i);
            expect(src, f).not.toMatch(/guaranteed savings/i);
            expect(src, f).not.toMatch(/save \d+\s*%/i);
            expect(src, f).not.toMatch(/auto[\s_-]?apply/i);
            expect(src, f).not.toMatch(/SOC ?2 compliant/i);
            expect(src, f).not.toMatch(/HIPAA compliant/i);
            expect(src, f).not.toMatch(/ISO ?\d+ certified/i);
        }
    });

    it('uses lib/pricing/intent for copy (no hardcoded prices in app/get-access/page.tsx)', () => {
        const src = readFileSync(join(PAGE_DIR, 'page.tsx'), 'utf8');
        expect(src).toMatch(/from\s+['"]@\/lib\/pricing\/intent['"]/);
        const withoutImports = src.replace(/import[^;]+;/g, '');
        expect(withoutImports).not.toMatch(/\$49(?![0-9])/);
        expect(withoutImports).not.toMatch(/\$199(?![0-9])/);
        expect(withoutImports).not.toMatch(/\$799(?![0-9])/);
        expect(withoutImports).not.toMatch(/\$1,500/);
        expect(withoutImports).not.toMatch(/\$35,000/);
        expect(withoutImports).not.toMatch(/\$60,000/);
    });
});
