/* eslint-disable no-console */
/**
 * 3AO: Enterprise Auth QA Sweep.
 *
 * Operator-run, authenticated, read-only QA harness for the admin surface,
 * internal Optimize candidate review, tenant route gates, and public buyer
 * pages.
 *
 * Run:
 *   BASE_URL="http://localhost:3000" npm run qa:enterprise-auth-sweep
 *   BASE_URL="https://www.p402.io"   npm run qa:enterprise-auth-sweep
 *
 * Required env (operator shell — never read from disk, never logged):
 *   P402_QA_ADMIN_EMAIL
 *   P402_QA_ADMIN_PASSWORD
 *
 * Output: a single safe JSON summary on stdout. No screenshots. No cookie
 * persistence. No persistent auth state. No PATCH/PUT/DELETE. No POST except the
 * admin login.
 */

import { chromium, type Browser, type BrowserContext, type Page, type Response } from '@playwright/test';

type Findings = string[];
type Map<T> = Record<string, T>;

interface PageResult {
    url: string;
    status: number | null;
    final_url: string | null;
    title: string | null;
    redirected_to_login: boolean;
    nav_timed_out: boolean;
    console_errors: Findings;
    network_errors: Findings;
}

interface Summary {
    base_url: string;
    login_success: boolean;
    unauthenticated_gates: Map<PageResult | { status: number | null; body_safe: boolean }>;
    admin_pages: Map<PageResult>;
    optional_missing: Findings;
    optimize_candidates: {
        fixture: {
            total: number;
            by_type: Map<number>;
            status_internal_candidate: boolean;
            disclaimer_visible: boolean;
            forbidden_actions_visible: Findings;
        };
        production: {
            loaded: Map<number>;
            total: number;
            empty_state_visible: boolean;
            errors: Findings;
        };
    };
    admin_api_gets: Map<{ status: number; body_safe: boolean; notes: Findings }>;
    tenant_route_gates: Map<PageResult>;
    public_pages: Map<PageResult>;
    secret_leak_findings: Findings;
    content_leak_findings: Findings;
    forbidden_claim_findings: Findings;
    console_errors: Findings;
    network_errors: Findings;
    visual_blockers: Findings;
    copy_blockers: Findings;
    credentials_printed: boolean;
    credentials_stored: boolean;
    screenshots_saved: boolean;
    recommendation: 'pass' | 'small_patch' | 'stop';
}

const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const EMAIL = process.env.P402_QA_ADMIN_EMAIL;
const PASSWORD = process.env.P402_QA_ADMIN_PASSWORD;

const PILOT_TENANT = '4f689ea1-7340-476a-878e-9f0b930e5fd4';

const ADMIN_PAGES_REQUIRED = [
    '/admin/overview',
    '/admin/optimize-candidates',
    '/admin/safety',
    '/admin/audit',
    '/admin/analytics',
    '/admin/health',
    '/admin/bazaar',
    '/admin/users',
    '/admin/admins',
];

const ADMIN_PAGES_OPTIONAL = [
    '/admin/facilitators',
    '/admin/routing',
];

const TENANT_PAGES = [
    '/dashboard',
    '/dashboard/control',
    '/dashboard/monitor',
    '/dashboard/prove',
    '/dashboard/prove/outcomes',
    '/dashboard/optimize',
    '/dashboard/settle',
    '/dashboard/publish',
];

const PUBLIC_PAGES_REQUIRED = ['/', '/meter', '/trust', '/pricing', '/developers/quickstart'];
const PUBLIC_PAGES_OPTIONAL = ['/docs', '/developers'];

const NAV_TIMEOUT_MS = 60_000;

const SECRET_PATTERNS: { name: string; re: RegExp }[] = [
    { name: 'p402_live_', re: /\bp402_live_[A-Za-z0-9_-]{8,}/ },
    { name: 'openai_sk_', re: /\bsk-[A-Za-z0-9_-]{20,}/ },
    { name: 'bearer_token', re: /\bBearer\s+[A-Za-z0-9_\-\.]{20,}/ },
    { name: 'REDIS_URL', re: /\bREDIS_URL\b/ },
    { name: 'DATABASE_URL', re: /\bDATABASE_URL\b/ },
    { name: 'postgres_url', re: /postgres(?:ql)?:\/\/[^\s"'<>]+/ },
    { name: 'rediss_url', re: /\brediss:\/\/[^\s"'<>]+/ },
    { name: 'UPSTASH_REDIS_REST_TOKEN', re: /\bUPSTASH_REDIS_REST_TOKEN\b/ },
    { name: 'github_pat', re: /\bgithub_pat_[A-Za-z0-9_]{20,}/ },
    { name: 'github_ghp', re: /\bghp_[A-Za-z0-9_]{20,}/ },
    { name: 'OPENAI_API_KEY', re: /\bOPENAI_API_KEY\b/ },
    { name: 'ANTHROPIC_API_KEY', re: /\bANTHROPIC_API_KEY\b/ },
    { name: 'GOOGLE_AI_API_KEY', re: /\bGOOGLE_AI_API_KEY\b/ },
];

const CONTENT_LEAK_FIELDS = [
    'prompt_content', 'response_content', 'raw_trace', 'stored_content',
    'completion_text', 'request_body', 'response_body', 'message_content',
];

const FORBIDDEN_CLAIMS: { name: string; re: RegExp }[] = [
    { name: 'verified savings', re: /\bverified\s+savings\b/i },
    { name: 'guaranteed savings', re: /\bguaranteed\s+savings\b/i },
    { name: 'auto-apply', re: /\bauto[\s-]?apply\b/i },
    { name: 'policy auto-apply', re: /\bpolicy\s+auto[\s-]?apply\b/i },
    { name: 'recommendations active', re: /\brecommendations\s+active\b/i },
    { name: 'runtime enforcement active', re: /\bruntime\s+enforcement\s+active\b/i },
    { name: 'settlement executed', re: /\bsettlement\s+executed\b/i },
    { name: 'production settlement live', re: /\bproduction\s+settlement\s+live\b/i },
];

const CLAIM_ALLOWLIST = [
    /no\s+savings\s+are\s+claimed/i,
    /recommendations\s+remain\s+blocked/i,
    /runtime\s+enforcement\s+is\s+blocked/i,
    /no\s+verified\s+savings/i,
];

function fail(msg: string): never {
    console.error(JSON.stringify({ error: msg }));
    process.exit(1);
}

function scanSecrets(haystack: string): Findings {
    const out: Findings = [];
    for (const { name, re } of SECRET_PATTERNS) {
        if (re.test(haystack)) out.push(name);
    }
    return out;
}

function scanContent(haystack: string): Findings {
    const out: Findings = [];
    for (const f of CONTENT_LEAK_FIELDS) {
        if (new RegExp(`\\b${f}\\b`).test(haystack)) out.push(f);
    }
    return out;
}

function scanClaims(haystack: string): Findings {
    const out: Findings = [];
    for (const { name, re } of FORBIDDEN_CLAIMS) {
        const matches = haystack.match(re);
        if (!matches) continue;
        const allowed = CLAIM_ALLOWLIST.some((a) => a.test(haystack));
        if (!allowed) out.push(name);
    }
    return out;
}

function dedupe<T>(arr: T[]): T[] { return Array.from(new Set(arr)); }

async function visit(ctx: BrowserContext, path: string): Promise<PageResult> {
    const page = await ctx.newPage();
    const consoleErrors: Findings = [];
    const networkErrors: Findings = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
    page.on('response', (r) => {
        if (r.status() >= 400 && r.url() !== `${BASE_URL}${path}`) {
            networkErrors.push(`${r.status()} ${r.url().slice(0, 200)}`);
        }
    });
    let status: number | null = null;
    let title: string | null = null;
    let finalUrl: string | null = null;
    let redirectedToLogin = false;
    let navTimedOut = false;
    try {
        const resp = await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
        status = resp?.status() ?? null;
        finalUrl = page.url();
        redirectedToLogin = /\/admin\/login|\/login|\/signin|\/auth\//.test(finalUrl);
        title = await page.title().catch(() => null);
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'unknown';
        if (/Timeout|exceeded/i.test(msg)) navTimedOut = true;
        networkErrors.push(`nav_error: ${msg.slice(0, 120)}`);
    } finally {
        await page.close().catch(() => undefined);
    }
    return { url: path, status, final_url: finalUrl, title, redirected_to_login: redirectedToLogin, nav_timed_out: navTimedOut, console_errors: dedupe(consoleErrors), network_errors: dedupe(networkErrors) };
}

async function visitWithScan(ctx: BrowserContext, path: string, scans: { secrets: Findings; content: Findings; claims: Findings }): Promise<PageResult> {
    const page = await ctx.newPage();
    const consoleErrors: Findings = [];
    const networkErrors: Findings = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
    page.on('response', (r) => {
        if (r.status() >= 400 && r.url() !== `${BASE_URL}${path}`) networkErrors.push(`${r.status()} ${r.url().slice(0, 200)}`);
    });
    let status: number | null = null;
    let title: string | null = null;
    let finalUrl: string | null = null;
    let redirectedToLogin = false;
    let navTimedOut = false;
    try {
        const resp = await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
        status = resp?.status() ?? null;
        finalUrl = page.url();
        redirectedToLogin = /\/admin\/login|\/login|\/signin|\/auth\//.test(finalUrl);
        title = await page.title().catch(() => null);
        const body = await page.content();
        for (const s of scanSecrets(body)) scans.secrets.push(`${path}:${s}`);
        for (const s of scanContent(body)) scans.content.push(`${path}:${s}`);
        for (const s of scanClaims(body)) scans.claims.push(`${path}:${s}`);
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'unknown';
        if (/Timeout|exceeded/i.test(msg)) navTimedOut = true;
        networkErrors.push(`nav_error: ${msg.slice(0, 120)}`);
    } finally {
        await page.close().catch(() => undefined);
    }
    return { url: path, status, final_url: finalUrl, title, redirected_to_login: redirectedToLogin, nav_timed_out: navTimedOut, console_errors: dedupe(consoleErrors), network_errors: dedupe(networkErrors) };
}

async function apiGet(ctx: BrowserContext, path: string, scans: { secrets: Findings; content: Findings; claims: Findings }): Promise<{ status: number; body_safe: boolean; notes: Findings; body?: unknown }> {
    const url = `${BASE_URL}${path}`;
    const resp = await ctx.request.get(url, { failOnStatusCode: false });
    const status = resp.status();
    const text = await resp.text().catch(() => '');
    const notes: Findings = [];
    const sec = scanSecrets(text); if (sec.length) { notes.push(...sec.map((s) => `secret:${s}`)); scans.secrets.push(...sec.map((s) => `${path}:${s}`)); }
    const cnt = scanContent(text); if (cnt.length) { notes.push(...cnt.map((s) => `content:${s}`)); scans.content.push(...cnt.map((s) => `${path}:${s}`)); }
    const cl  = scanClaims(text);  if (cl.length)  { notes.push(...cl.map((s) => `claim:${s}`));    scans.claims.push(...cl.map((s) => `${path}:${s}`)); }
    let body: unknown = undefined;
    try { body = JSON.parse(text); } catch { /* not JSON */ }
    return { status, body_safe: sec.length === 0 && cnt.length === 0 && cl.length === 0, notes, body };
}

async function adminLogin(ctx: BrowserContext): Promise<boolean> {
    const resp = await ctx.request.post(`${BASE_URL}/api/admin/auth`, {
        data: { email: EMAIL, password: PASSWORD },
        failOnStatusCode: false,
        headers: { 'content-type': 'application/json' },
    });
    if (resp.status() !== 200) return false;
    const j = await resp.json().catch(() => ({}));
    if (j?.requiresTOTP) return false;
    return true;
}

async function main() {
    if (!EMAIL || !PASSWORD) fail('P402_QA_ADMIN_EMAIL or P402_QA_ADMIN_PASSWORD is not set in the operator shell.');

    const result: Summary = {
        base_url: BASE_URL,
        login_success: false,
        unauthenticated_gates: {},
        admin_pages: {},
        optional_missing: [],
        optimize_candidates: {
            fixture: { total: 0, by_type: {}, status_internal_candidate: false, disclaimer_visible: false, forbidden_actions_visible: [] },
            production: { loaded: {}, total: 0, empty_state_visible: false, errors: [] },
        },
        admin_api_gets: {},
        tenant_route_gates: {},
        public_pages: {},
        secret_leak_findings: [],
        content_leak_findings: [],
        forbidden_claim_findings: [],
        console_errors: [],
        network_errors: [],
        visual_blockers: [],
        copy_blockers: [],
        credentials_printed: false,
        credentials_stored: false,
        screenshots_saved: false,
        recommendation: 'pass',
    };

    const scans = { secrets: [] as Findings, content: [] as Findings, claims: [] as Findings };

    let browser: Browser | null = null;
    try {
        browser = await chromium.launch({ headless: true });

        // Phase 1 — unauthenticated gates
        const unauthCtx = await browser.newContext();
        for (const p of ['/admin/overview', '/admin/optimize-candidates', '/admin/safety', '/admin/audit', '/admin/analytics', '/admin/health']) {
            result.unauthenticated_gates[p] = await visit(unauthCtx, p);
        }
        const unauthApi = await unauthCtx.request.get(`${BASE_URL}/api/admin/optimize/candidates?mode=fixture`, { failOnStatusCode: false });
        result.unauthenticated_gates['/api/admin/optimize/candidates?mode=fixture'] = { status: unauthApi.status(), body_safe: unauthApi.status() === 401 };
        await unauthCtx.close();

        // Phase 6 — tenant gates (also unauthenticated)
        const tenantCtx = await browser.newContext();
        for (const p of TENANT_PAGES) result.tenant_route_gates[p] = await visit(tenantCtx, p);
        await tenantCtx.close();

        // Phase 7 — public pages
        const pubCtx = await browser.newContext();
        for (const p of PUBLIC_PAGES_REQUIRED) {
            const r = await visitWithScan(pubCtx, p, scans);
            result.public_pages[p] = r;
            if (r.status === 404 || r.status === null) result.copy_blockers.push(`required_public_missing:${p}`);
        }
        for (const p of PUBLIC_PAGES_OPTIONAL) {
            const r = await visitWithScan(pubCtx, p, scans);
            result.public_pages[p] = r;
            if (r.status === 404 || r.status === null) result.optional_missing.push(p);
        }
        await pubCtx.close();

        // Phase 2 — admin login
        const adminCtx = await browser.newContext();
        result.login_success = await adminLogin(adminCtx);
        if (!result.login_success) {
            result.recommendation = 'stop';
            result.visual_blockers.push('admin_login_failed');
            await emit(result, scans);
            return;
        }

        // Phase 3 — admin surface smoke
        for (const p of ADMIN_PAGES_REQUIRED) {
            const r = await visitWithScan(adminCtx, p, scans);
            result.admin_pages[p] = r;
            if (r.status === 404) result.copy_blockers.push(`required_admin_404:${p}`);
            if (r.nav_timed_out) result.copy_blockers.push(`required_admin_timeout:${p}`);
        }
        for (const p of ADMIN_PAGES_OPTIONAL) {
            const r = await visitWithScan(adminCtx, p, scans);
            result.admin_pages[p] = r;
            if (r.status === 404 || r.status === null) result.optional_missing.push(p);
        }

        // Phase 4 — internal Optimize candidate review (page-level checks)
        const page = await adminCtx.newPage();
        try {
            await page.goto(`${BASE_URL}/admin/optimize-candidates`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
            await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
            const disclaimerPhrases = [
                /internal\s+candidate\s+review\s+only/i,
                /not\s+recommendations/i,
                /nothing\s+is\s+applied/i,
                /no\s+savings\s+are\s+claimed/i,
            ];
            await page.waitForFunction(
                (re) => new RegExp(re, 'i').test(document.body.innerText) || new RegExp(re, 'i').test(document.body.textContent ?? ''),
                disclaimerPhrases[0]!.source,
                { timeout: 15_000 },
            ).catch(() => undefined);
            const bodyText = await page.evaluate(() => `${document.body.innerText}\n${document.body.textContent ?? ''}`);
            result.optimize_candidates.fixture.disclaimer_visible = disclaimerPhrases.every((re) => re.test(bodyText));
            const forbidden: Findings = [];
            for (const re of [/\bapply\s+recommendation/i, /\bauto[-\s]?apply\b/i, /\bverified\s+savings\b/i, /\bguaranteed\s+savings\b/i]) {
                if (re.test(bodyText)) {
                    const allowed = CLAIM_ALLOWLIST.some((a) => a.test(bodyText));
                    if (!allowed) forbidden.push(re.source);
                }
            }
            result.optimize_candidates.fixture.forbidden_actions_visible = forbidden;
        } finally {
            await page.close().catch(() => undefined);
        }

        // Phase 5 — authenticated admin API GETs
        const fxApi = await apiGet(adminCtx, '/api/admin/optimize/candidates?mode=fixture', scans);
        result.admin_api_gets['/api/admin/optimize/candidates?mode=fixture'] = { status: fxApi.status, body_safe: fxApi.body_safe, notes: fxApi.notes };
        if (fxApi.body && typeof fxApi.body === 'object' && 'total' in fxApi.body) {
            const b = fxApi.body as { total: number; by_type: Map<number>; candidates: { status: string }[] };
            result.optimize_candidates.fixture.total = b.total;
            result.optimize_candidates.fixture.by_type = b.by_type;
            result.optimize_candidates.fixture.status_internal_candidate = Array.isArray(b.candidates) && b.candidates.every((c) => c.status === 'internal_candidate');
        }

        const prodApi = await apiGet(adminCtx, `/api/admin/optimize/candidates?mode=production&tenant=${PILOT_TENANT}&window_days=14`, scans);
        result.admin_api_gets[`/api/admin/optimize/candidates?mode=production&tenant=${PILOT_TENANT}&window_days=14`] = { status: prodApi.status, body_safe: prodApi.body_safe, notes: prodApi.notes };
        if (prodApi.body && typeof prodApi.body === 'object' && 'total' in prodApi.body) {
            const b = prodApi.body as { total: number; loaded: Map<number> };
            result.optimize_candidates.production.total = b.total;
            result.optimize_candidates.production.loaded = b.loaded;
            result.optimize_candidates.production.empty_state_visible = b.total === 0;
        }

        await adminCtx.close();
    } catch (e) {
        result.visual_blockers.push(`uncaught: ${e instanceof Error ? e.message.slice(0, 200) : 'unknown'}`);
        result.recommendation = 'stop';
    } finally {
        await browser?.close().catch(() => undefined);
    }

    await emit(result, scans);
}

async function emit(result: Summary, scans: { secrets: Findings; content: Findings; claims: Findings }) {
    result.secret_leak_findings = dedupe(scans.secrets);
    result.content_leak_findings = dedupe(scans.content);
    result.forbidden_claim_findings = dedupe(scans.claims);
    const allPages = [
        ...Object.values(result.admin_pages),
        ...Object.values(result.public_pages),
        ...Object.values(result.tenant_route_gates),
        ...Object.values(result.unauthenticated_gates).filter((g): g is PageResult => 'console_errors' in g),
    ];
    result.console_errors = dedupe(allPages.flatMap((r) => r.console_errors));
    result.network_errors = dedupe(allPages.flatMap((r) => r.network_errors));
    const has500 = allPages.some((r) => r.status !== null && r.status >= 500);
    const hasRequiredTimeout = allPages.some((r) => r.nav_timed_out);
    const fixtureExpectedTypes = ['missing_outcome_coverage', 'high_cost_workflow_review', 'model_allowlist_cleanup'];
    const fixtureTypesPresent = fixtureExpectedTypes.every((t) => (result.optimize_candidates.fixture.by_type[t] ?? 0) > 0);
    const disclaimerOk = result.optimize_candidates.fixture.disclaimer_visible;
    const stop =
        result.secret_leak_findings.length > 0 ||
        result.content_leak_findings.length > 0 ||
        !result.login_success ||
        has500;
    const smallPatch =
        !disclaimerOk ||
        result.optimize_candidates.fixture.total !== 3 ||
        !fixtureTypesPresent ||
        !result.optimize_candidates.fixture.status_internal_candidate ||
        result.optimize_candidates.fixture.forbidden_actions_visible.length > 0 ||
        result.forbidden_claim_findings.length > 0 ||
        result.copy_blockers.length > 0 ||
        hasRequiredTimeout;
    result.recommendation = stop ? 'stop' : smallPatch ? 'small_patch' : 'pass';
    console.log(JSON.stringify(result, null, 2));
    if (result.recommendation === 'stop') process.exit(2);
}

main().catch((err) => {
    console.error(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
    process.exit(1);
});
