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

describe('GetAccessPage — intent rendering (3AY-4)', () => {
    it('intent=developer renders Developer copy and the upcoming-billing notice', () => {
        renderWithIntent('developer');
        expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Developer/i);
        expect(screen.getByText(/3AY-8R/)).toBeTruthy();
    });

    it('intent=developer does not mention Stripe Checkout or paid self-serve checkout', () => {
        renderWithIntent('developer');
        const body = document.body.textContent ?? '';
        expect(body).not.toMatch(/Stripe Checkout/i);
        expect(body).not.toMatch(/paid self-serve checkout exists/i);
        expect(body).not.toMatch(/Start paid plan/i);
    });

    it('intent=business renders Business copy', () => {
        renderWithIntent('business');
        expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Business/i);
    });

    it('intent=scale renders Scale copy', () => {
        renderWithIntent('scale');
        expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Scale/i);
    });

    it('intent=enterprise renders Enterprise copy with from-$60,000 ARR sourced from rate card', () => {
        renderWithIntent('enterprise');
        expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Enterprise/i);
        expect(document.body.textContent ?? '').toMatch(/\$60,000\s*ARR/);
    });

    it('intent=proof-sprint renders Proof Sprint, $15,000, 14 days, and 100% credit', () => {
        renderWithIntent('proof-sprint');
        const body = document.body.textContent ?? '';
        expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Proof Sprint/i);
        expect(body).toContain('$15,000');
        expect(body).toMatch(/14[- ]day/);
        expect(body).toMatch(/100%/);
    });

    it('intent=paid-pilot renders Paid Pilot, $35,000, and 50% credit', () => {
        renderWithIntent('paid-pilot');
        const body = document.body.textContent ?? '';
        expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Paid Pilot/i);
        expect(body).toContain('$35,000');
        expect(body).toMatch(/50%/);
    });

    it('intent=regulated-pilot renders Regulated Pilot, $50,000+, 90 days, and BAA qualification', () => {
        renderWithIntent('regulated-pilot');
        const body = document.body.textContent ?? '';
        expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Regulated Pilot/i);
        expect(body).toContain('$50,000');
        expect(body).toMatch(/90[- ]day/);
        expect(body).toMatch(/BAA path available after security and contracting review/);
    });

    it('intent=scoping-call renders general scoping copy with no-card language', () => {
        renderWithIntent('scoping-call');
        const body = document.body.textContent ?? '';
        expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/scoping call/i);
        expect(body).toMatch(/No card required/i);
    });

    it('unknown intent renders the generic access request page', () => {
        renderWithIntent('totally-not-a-real-intent');
        expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Request access to P402/i);
    });

    it('no intent param renders the generic access request page', () => {
        renderWithIntent(null);
        expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Request access to P402/i);
    });

    it('emits analytics-friendly data attributes on the form card', () => {
        renderWithIntent('proof-sprint');
        const card = document.querySelector('[data-pricing-intent]') as HTMLElement | null;
        expect(card).not.toBeNull();
        expect(card!.getAttribute('data-pricing-intent')).toBe('proof-sprint');
        expect(card!.getAttribute('data-offer-id')).toBe('proof_sprint');
        expect(card!.getAttribute('data-plan-id')).toBe('');
    });

    it('emits data-plan-id for plan intents', () => {
        renderWithIntent('enterprise');
        const card = document.querySelector('[data-pricing-intent]') as HTMLElement | null;
        expect(card?.getAttribute('data-plan-id')).toBe('enterprise');
        expect(card?.getAttribute('data-offer-id')).toBe('');
    });

    it('hidden intent input is present in the form', () => {
        renderWithIntent('paid-pilot');
        const hidden = screen.getByTestId('hidden-intent') as HTMLInputElement;
        expect(hidden.value).toBe('paid-pilot');
        expect(hidden.type).toBe('hidden');
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
        expect(withoutImports).not.toMatch(/\$15,000/);
        expect(withoutImports).not.toMatch(/\$35,000/);
        expect(withoutImports).not.toMatch(/\$60,000/);
        expect(withoutImports).not.toMatch(/\$249/);
        expect(withoutImports).not.toMatch(/\$2,500/);
    });
});
