/**
 * E2E tests for the P402 Meter healthcare demo application.
 *
 * Pages covered:
 *   /meter       — main demo: document intake, work-order, ledger, approval
 *   /meter/about — hackathon submission overview
 *
 * Strategy:
 *   - Both pages are public (no auth required).
 *   - All /api/meter/* routes are mocked so tests never hit Gemini, Circle, or Arc.
 *   - Safe mode activates automatically when the work-order API returns an error;
 *     we mock success responses to exercise the happy path UI states.
 *   - No database or blockchain state is touched.
 */

import { test, expect, type Page } from '@playwright/test';
import { collectConsoleErrors } from './helpers/mock-session';

// ── Mock helpers ──────────────────────────────────────────────────────────────

const MOCK_PACKET_RESPONSE = {
  id: 'pkt_e2e_001',
  tenantId: 'demo',
  packetType: 'prior_auth_packet',
  assetType: 'text',
  sourceLabel: 'operator-submission',
  deidentified: true,
  previewText: 'Demo packet content',
  createdAt: new Date().toISOString(),
};

const MOCK_WORK_ORDER = {
  id: 'wo_e2e_001',
  tenantId: 'demo',
  sessionId: 'sess_e2e_001',
  requestId: 'req_e2e_001',
  workflowType: 'prior_auth_review',
  packetFormat: 'text',
  packetSummary: 'Prior authorization for outpatient diagnostic imaging.',
  policySummary: 'Standard utilization management criteria for outpatient diagnostic services.',
  budgetCapUsd: 0.5,
  approvalRequired: true,
  deidentified: true,
  reviewMode: 'safe',
  executionMode: 'safe',
  toolTrace: ['parsePriorAuthDocument', 'createReviewSession', 'addLedgerEstimate'],
  status: 'session_open',
  geminiModel: 'gemini-2.0-flash',
  healthcareExtract: {
    requestId: 'req_e2e_001',
    payerName: 'Demo Payer Organization',
    memberIdMasked: '***-**-7842',
    providerName: 'Demo Medical Group',
    procedureRequested: 'Outpatient Advanced Diagnostic Imaging',
    diagnosisSummary: 'Outpatient diagnostic imaging — standard prior auth category',
    urgencyLevel: 'routine',
    caseType: 'prior_auth',
    extractedConfidence: 0.94,
    attachmentCount: 4,
    requiresSpecialistReview: false,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const MOCK_SESSION_RESPONSE = {
  sessionId: 'sess_e2e_001',
  budgetCapUsd: 0.5,
  status: 'open',
};

async function mockMeterApis(page: Page) {
  await page.route('**/api/meter/packet**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_PACKET_RESPONSE),
    })
  );
  await page.route('**/api/meter/work-order**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ workOrder: MOCK_WORK_ORDER, degraded: false }),
    })
  );
  await page.route('**/api/meter/sessions**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_SESSION_RESPONSE),
    })
  );
  await page.route('**/api/meter/fund**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    })
  );
  // SSE chat stream — return an empty stream so the ledger doesn't hang
  await page.route('**/api/meter/chat**', (route) =>
    route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      body: 'data: {"type":"done"}\n\n',
    })
  );
  await page.route('**/api/meter/audit**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        summary: 'Total cost: $0.0042. Arc settlement: 55 events at $0.006/tx.',
        costBreakdown: { geminiUsd: 0.0012, arcUsd: 0.0030 },
        narrative: 'Demo audit summary.',
      }),
    })
  );
  await page.route('**/api/meter/trust**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ agentId: 'did:p402:agent:demo', reputationScore: 0.95, registered: true }),
    })
  );
  await page.route('**/api/meter/escrow**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ jobId: 'job_e2e_001', status: 'created', amountUsd: 0.05 }),
    })
  );
}

function isRealError(msg: string): boolean {
  const noise = [
    'favicon',
    'Failed to load resource',
    'net::ERR_',
    'ERR_BLOCKED',
    'Extension',
    'chrome-extension',
    '__NEXT_DATA__',
    'Warning:',
    '%c%s%c',
  ];
  return !noise.some((n) => msg.includes(n));
}

// ─────────────────────────────────────────────────────────────────────────────
// /meter — main page
// ─────────────────────────────────────────────────────────────────────────────

test.describe('/meter', () => {
  test('page renders without crash', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await mockMeterApis(page);

    await page.goto('/meter');
    await page.waitForLoadState('networkidle');

    expect(errors.filter(isRealError)).toHaveLength(0);
  });

  test('hero heading is visible', async ({ page }) => {
    await mockMeterApis(page);
    await page.goto('/meter');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText(/AI billing|payer operations/i);
  });

  test('Safe Mode banner is visible by default', async ({ page }) => {
    await mockMeterApis(page);
    await page.goto('/meter');
    await page.waitForLoadState('networkidle');

    // SafeModeBanner should always be present in the DOM
    await expect(page.locator('text=Safe Mode').first()).toBeVisible({ timeout: 5000 });
  });

  test('Document Intake section is visible', async ({ page }) => {
    await mockMeterApis(page);
    await page.goto('/meter');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Document Intake').first()).toBeVisible();
  });

  test('Text mode is active by default and textarea is present', async ({ page }) => {
    await mockMeterApis(page);
    await page.goto('/meter');
    await page.waitForLoadState('networkidle');

    // The text mode textarea should be visible
    await expect(
      page.locator('textarea[placeholder*="prior authorization"]')
    ).toBeVisible();
  });

  test('mode tab switches to Image/PDF mode showing drop zone', async ({ page }) => {
    await mockMeterApis(page);
    await page.goto('/meter');
    await page.waitForLoadState('networkidle');

    // Click the Image/PDF tab
    await page.locator('button', { hasText: /Image.*PDF/i }).first().click();

    // Drop zone should now be visible
    await expect(page.locator('text=Drop or click to upload').first()).toBeVisible();
  });

  test('budget cap input is present with default value', async ({ page }) => {
    await mockMeterApis(page);
    await page.goto('/meter');
    await page.waitForLoadState('networkidle');

    const budgetInput = page.locator('input[type="number"]').first();
    await expect(budgetInput).toBeVisible();
    await expect(budgetInput).toHaveValue('0.50');
  });

  test('submit button is disabled when textarea is empty', async ({ page }) => {
    await mockMeterApis(page);
    await page.goto('/meter');
    await page.waitForLoadState('networkidle');

    const submitBtn = page.locator('button', { hasText: /Submit to Gemini/i }).first();
    await expect(submitBtn).toBeDisabled();
  });

  test('submit button enables after typing into textarea', async ({ page }) => {
    await mockMeterApis(page);
    await page.goto('/meter');
    await page.waitForLoadState('networkidle');

    const textarea = page.locator('textarea[placeholder*="prior authorization"]');
    await textarea.fill('PRIOR AUTHORIZATION — test packet content');

    const submitBtn = page.locator('button', { hasText: /Submit to Gemini/i }).first();
    await expect(submitBtn).toBeEnabled();
  });

  test('all 6 sample scenario rows are present', async ({ page }) => {
    await mockMeterApis(page);
    await page.goto('/meter');
    await page.waitForLoadState('networkidle');

    // The sample scenarios section heading
    await expect(page.locator('text=Sample Scenarios').first()).toBeVisible();

    // Each scenario label
    const scenarios = ['Prior Auth', 'Util Review', 'Specialty Drug', 'Surgical PA', 'Behavioral Health', 'Post-Acute'];
    for (const label of scenarios) {
      await expect(page.locator(`text=${label}`).first()).toBeVisible();
    }
  });

  test('loading a scenario populates the textarea', async ({ page }) => {
    await mockMeterApis(page);
    await page.goto('/meter');
    await page.waitForLoadState('networkidle');

    // Click "Prior Auth" scenario row (the load button, not the download button)
    const priorAuthBtn = page.locator('button', { hasText: /Prior Auth/i }).first();
    await priorAuthBtn.click();

    const textarea = page.locator('textarea[placeholder*="prior authorization"]');
    const value = await textarea.inputValue();
    expect(value.length).toBeGreaterThan(100);
    expect(value).toContain('PRIOR AUTHORIZATION');
  });

  test('loading Specialty Drug scenario populates correct content', async ({ page }) => {
    await mockMeterApis(page);
    await page.goto('/meter');
    await page.waitForLoadState('networkidle');

    const specialtyBtn = page.locator('button', { hasText: /Specialty Drug/i }).first();
    await specialtyBtn.click();

    const textarea = page.locator('textarea[placeholder*="prior authorization"]');
    const value = await textarea.inputValue();
    expect(value).toContain('SPECIALTY PHARMACY');
    expect(value).toContain('Biologic');
  });

  test('loading Behavioral Health scenario populates correct content', async ({ page }) => {
    await mockMeterApis(page);
    await page.goto('/meter');
    await page.waitForLoadState('networkidle');

    const bhBtn = page.locator('button', { hasText: /Behavioral Health/i }).first();
    await bhBtn.click();

    const textarea = page.locator('textarea[placeholder*="prior authorization"]');
    const value = await textarea.inputValue();
    expect(value).toContain('BEHAVIORAL HEALTH');
    expect(value).toContain('Acute Psychiatric');
  });

  test('loading Post-Acute scenario populates correct content', async ({ page }) => {
    await mockMeterApis(page);
    await page.goto('/meter');
    await page.waitForLoadState('networkidle');

    const pacBtn = page.locator('button', { hasText: /Post-Acute/i }).first();
    await pacBtn.click();

    const textarea = page.locator('textarea[placeholder*="prior authorization"]');
    const value = await textarea.inputValue();
    expect(value).toContain('POST-ACUTE');
    expect(value).toContain('Skilled Nursing Facility');
  });

  test('download button triggers file download', async ({ page }) => {
    await mockMeterApis(page);
    await page.goto('/meter');
    await page.waitForLoadState('networkidle');

    // Listen for the download event
    const downloadPromise = page.waitForEvent('download');

    // Click the first download arrow (↓) — next to Prior Auth scenario
    const downloadBtns = page.locator('button[aria-label*="Download"]');
    await downloadBtns.first().click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.txt$/);
  });

  test('de-identification notice is visible in intake card', async ({ page }) => {
    await mockMeterApis(page);
    await page.goto('/meter');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=De-identified').first()).toBeVisible();
  });

  test('compliance boundary banner is visible', async ({ page }) => {
    await mockMeterApis(page);
    await page.goto('/meter');
    await page.waitForLoadState('networkidle');

    // ComplianceBoundaryBanner should be present
    await expect(page.locator('text=De-identified').first()).toBeVisible();
  });

  test('Reset button clears the page state', async ({ page }) => {
    await mockMeterApis(page);
    await page.goto('/meter');
    await page.waitForLoadState('networkidle');

    // Load a scenario first
    const priorAuthBtn = page.locator('button', { hasText: /Prior Auth/i }).first();
    await priorAuthBtn.click();

    // Click Reset
    await page.locator('button', { hasText: /Reset/i }).first().click();

    // Textarea should be empty again
    const textarea = page.locator('textarea[placeholder*="prior authorization"]');
    await expect(textarea).toHaveValue('');
  });

  test('light/dark mode toggle works', async ({ page }) => {
    await mockMeterApis(page);
    await page.goto('/meter');
    await page.waitForLoadState('networkidle');

    // Page starts in dark mode
    const toggleBtn = page.locator('button', { hasText: /Light/i }).first();
    await expect(toggleBtn).toBeVisible();

    // Click to enable light mode
    await toggleBtn.click();

    // Button should now say "Dark"
    await expect(page.locator('button', { hasText: /Dark/i }).first()).toBeVisible();
  });

  test('About link navigates to /meter/about', async ({ page }) => {
    await mockMeterApis(page);
    await page.goto('/meter');
    await page.waitForLoadState('networkidle');

    await page.locator('a[href="/meter/about"]').first().click();
    await expect(page).toHaveURL(/\/meter\/about/);
  });

  test('Demo Packets section instruction text is visible', async ({ page }) => {
    await mockMeterApis(page);
    await page.goto('/meter');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=load it into the text area').first()).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// /meter/about — submission overview
// ─────────────────────────────────────────────────────────────────────────────

test.describe('/meter/about', () => {
  test('page renders without crash', async ({ page }) => {
    const errors = collectConsoleErrors(page);

    await page.goto('/meter/about');
    await page.waitForLoadState('networkidle');

    expect(errors.filter(isRealError)).toHaveLength(0);
  });

  test('main hero heading is visible', async ({ page }) => {
    await page.goto('/meter/about');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1').first()).toContainText(/AI Thinking|Has a Price|Now It Settles/i);
  });

  test('Arc Hackathon badge is visible in top bar', async ({ page }) => {
    await page.goto('/meter/about');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Arc Hackathon 2026').first()).toBeVisible();
  });

  test('Back to Demo link navigates to /meter', async ({ page }) => {
    await page.goto('/meter/about');
    await page.waitForLoadState('networkidle');

    await page.locator('a[href="/meter"]').first().click();
    await expect(page).toHaveURL(/\/meter$/);
  });

  test('section 01 — The Problem is visible', async ({ page }) => {
    await page.goto('/meter/about');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=The Problem').first()).toBeVisible();
    // Problem stat cards
    await expect(page.locator('text=$31B').first()).toBeVisible();
    await expect(page.locator('text=$0.30').first()).toBeVisible();
  });

  test('section 02 — The Solution is visible', async ({ page }) => {
    await page.goto('/meter/about');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=The Solution').first()).toBeVisible();
    await expect(page.locator('text=55+').first()).toBeVisible();
  });

  test('section 03 — Technology stack is visible with all three badges', async ({ page }) => {
    await page.goto('/meter/about');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Technology').first()).toBeVisible();
    await expect(page.locator('text=Arc').first()).toBeVisible();
    await expect(page.locator('text=Circle').first()).toBeVisible();
    await expect(page.locator('text=Gemini').first()).toBeVisible();
  });

  test('section 04 — Why Healthcare is visible', async ({ page }) => {
    await page.goto('/meter/about');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Why Healthcare').first()).toBeVisible();
    await expect(page.locator('text=Governance is mandatory').first()).toBeVisible();
    await expect(page.locator('text=Specialist delegation is natural').first()).toBeVisible();
  });

  test('section 05 — Prize Alignment is visible', async ({ page }) => {
    await page.goto('/meter/about');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Prize Alignment').first()).toBeVisible();
    await expect(page.locator('text=Arc Grand Prize').first()).toBeVisible();
    await expect(page.locator('text=Gemini Sponsor Prize').first()).toBeVisible();
  });

  test('section 06 — Architecture API routes are listed', async ({ page }) => {
    await page.goto('/meter/about');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Architecture').first()).toBeVisible();
    await expect(page.locator('text=/api/meter/packet').first()).toBeVisible();
    await expect(page.locator('text=/api/meter/work-order').first()).toBeVisible();
    await expect(page.locator('text=/api/meter/chat').first()).toBeVisible();
  });

  test('Live Demo CTA link points to /meter', async ({ page }) => {
    await page.goto('/meter/about');
    await page.waitForLoadState('networkidle');

    const ctaLink = page.locator('a[href="/meter"]').last();
    await expect(ctaLink).toBeVisible();
    await expect(ctaLink).toContainText(/Demo/i);
  });

  test('ArcScan external link is present', async ({ page }) => {
    await page.goto('/meter/about');
    await page.waitForLoadState('networkidle');

    const arcScanLinks = page.locator('a[href*="arcscan"]');
    await expect(arcScanLinks.first()).toBeVisible();
  });

  test('footer is visible with correct attribution', async ({ page }) => {
    await page.goto('/meter/about');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=P402 Meter · Arc Hackathon 2026').first()).toBeVisible();
    await expect(page.locator('text=Arc × Circle × Gemini').first()).toBeVisible();
  });

  test('workflow summary sentence is visible', async ({ page }) => {
    await page.goto('/meter/about');
    await page.waitForLoadState('networkidle');

    // The key "workflow in one sentence" block
    await expect(page.locator('text=The workflow in one sentence').first()).toBeVisible();
    await expect(page.locator('text=Upload a prior-auth document').first()).toBeVisible();
  });

  test('problem stat cards have correct counts', async ({ page }) => {
    await page.goto('/meter/about');
    await page.waitForLoadState('networkidle');

    // Four problem cards
    await expect(page.locator('text=$31B').first()).toBeVisible();
    await expect(page.locator('text=$0.30').first()).toBeVisible();
    await expect(page.locator('text=~$2.85').first()).toBeVisible();
    await expect(page.locator('text=0').first()).toBeVisible();
  });

  test('metric cards show correct values', async ({ page }) => {
    await page.goto('/meter/about');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=55+').first()).toBeVisible();
    await expect(page.locator('text=>99.7%').first()).toBeVisible();
  });
});
