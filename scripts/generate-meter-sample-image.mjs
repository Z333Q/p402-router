/**
 * Generates public/meter/samples/demo-prior-auth-form.png
 *
 * Uses Playwright (already a project dependency) to render a realistic-looking
 * de-identified healthcare prior authorization form and screenshot it to PNG.
 *
 * Run once:
 *   node scripts/generate-meter-sample-image.mjs
 *
 * The output PNG is committed to the repo and served as a downloadable demo
 * asset for the P402 Meter multimodal intake demonstration.
 *
 * ALL DATA IS FICTIONAL — no PHI, no real patients, no real providers.
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, '../public/meter/samples/demo-prior-auth-form.png');

// ── Form HTML ─────────────────────────────────────────────────────────────────

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Prior Authorization Request — Demo</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Arial', 'Helvetica Neue', sans-serif;
    font-size: 11px;
    color: #1a1a2e;
    background: #fff;
    padding: 28px 32px 40px;
    width: 820px;
  }

  /* ── Watermark ────────────────────────────────────────────────── */
  body::before {
    content: 'DEMONSTRATION DOCUMENT — DE-IDENTIFIED';
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-35deg);
    font-size: 32px;
    font-weight: 900;
    color: rgba(220, 38, 38, 0.08);
    white-space: nowrap;
    pointer-events: none;
    z-index: 0;
    letter-spacing: 0.04em;
  }

  /* ── Header / letterhead ──────────────────────────────────────── */
  .letterhead {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 3px solid #1e3a5f;
    padding-bottom: 14px;
    margin-bottom: 16px;
  }
  .plan-name {
    font-size: 20px;
    font-weight: 900;
    color: #1e3a5f;
    letter-spacing: -0.5px;
    line-height: 1.1;
  }
  .plan-subtitle {
    font-size: 10px;
    color: #5a7a9a;
    margin-top: 3px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .form-meta {
    text-align: right;
    font-size: 10px;
    color: #555;
    line-height: 1.7;
  }
  .form-meta strong { color: #1e3a5f; }

  /* ── Form title bar ───────────────────────────────────────────── */
  .form-title {
    background: #1e3a5f;
    color: #fff;
    text-align: center;
    padding: 8px 12px;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-bottom: 14px;
  }

  /* ── Demo notice ──────────────────────────────────────────────── */
  .demo-notice {
    background: #fff7ed;
    border: 1.5px solid #f97316;
    padding: 7px 12px;
    font-size: 9.5px;
    color: #7c2d12;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }
  .demo-notice span { font-size: 14px; }

  /* ── Section layout ───────────────────────────────────────────── */
  .section {
    margin-bottom: 12px;
    border: 1px solid #c8d8e8;
  }
  .section-head {
    background: #e8f0f8;
    border-bottom: 1px solid #c8d8e8;
    padding: 5px 10px;
    font-weight: 700;
    font-size: 10.5px;
    color: #1e3a5f;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  .section-body {
    padding: 10px;
  }

  /* ── Field grid ───────────────────────────────────────────────── */
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px 12px; }
  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px 10px; }

  .field { display: flex; flex-direction: column; gap: 2px; }
  .field label {
    font-size: 9px;
    font-weight: 700;
    color: #5a7a9a;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .field .value {
    font-size: 11px;
    color: #1a1a2e;
    border-bottom: 1px solid #c8d8e8;
    padding-bottom: 2px;
    min-height: 16px;
    font-weight: 500;
  }
  .field .value.redacted {
    color: #888;
    font-style: italic;
  }
  .field .value.bold { font-weight: 700; color: #1e3a5f; }

  /* ── Urgency badge ────────────────────────────────────────────── */
  .urgency-row { display: flex; gap: 8px; margin-bottom: 8px; }
  .urgency-chip {
    padding: 3px 10px;
    border: 1.5px solid;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    cursor: pointer;
  }
  .chip-standard { border-color: #1e3a5f; color: #1e3a5f; background: #e8f0f8; }
  .chip-urgent { border-color: #888; color: #888; background: transparent; }
  .chip-emergent { border-color: #888; color: #888; background: transparent; }

  /* ── Criteria table ───────────────────────────────────────────── */
  .criteria-table { width: 100%; border-collapse: collapse; font-size: 10px; }
  .criteria-table th {
    background: #e8f0f8;
    border: 1px solid #c8d8e8;
    padding: 5px 8px;
    font-weight: 700;
    color: #1e3a5f;
    text-align: left;
    font-size: 9.5px;
    text-transform: uppercase;
  }
  .criteria-table td {
    border: 1px solid #c8d8e8;
    padding: 5px 8px;
    vertical-align: top;
  }
  .criteria-table tr:nth-child(even) td { background: #f7fafd; }
  .check { color: #1e3a5f; font-weight: 900; font-size: 13px; }

  /* ── Checkbox list ────────────────────────────────────────────── */
  .checklist { display: flex; flex-direction: column; gap: 5px; }
  .checklist-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 10px;
    line-height: 1.4;
  }
  .checkbox {
    width: 12px;
    height: 12px;
    border: 1.5px solid #1e3a5f;
    flex-shrink: 0;
    margin-top: 1px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #e8f0f8;
  }
  .checkbox.checked { background: #1e3a5f; }
  .checkbox.checked::after { content: '✓'; color: #fff; font-size: 9px; font-weight: 900; }

  /* ── Signature block ──────────────────────────────────────────── */
  .sig-row {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: 12px;
    margin-top: 10px;
  }
  .sig-field { display: flex; flex-direction: column; gap: 3px; }
  .sig-field label { font-size: 9px; color: #5a7a9a; font-weight: 700; text-transform: uppercase; }
  .sig-line {
    border-bottom: 1.5px solid #1a1a2e;
    height: 24px;
    position: relative;
  }
  .sig-redacted {
    position: absolute;
    bottom: 3px;
    left: 4px;
    font-size: 9px;
    color: #888;
    font-style: italic;
  }

  /* ── Footer ───────────────────────────────────────────────────── */
  .footer {
    margin-top: 14px;
    border-top: 1px solid #c8d8e8;
    padding-top: 8px;
    display: flex;
    justify-content: space-between;
    font-size: 8.5px;
    color: #888;
  }
  .footer strong { color: #1e3a5f; }

  /* ── P402 Meter badge ─────────────────────────────────────────── */
  .meter-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: #000;
    color: #B6FF2E;
    font-size: 8.5px;
    font-weight: 900;
    font-family: 'Courier New', monospace;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 3px 8px;
  }
</style>
</head>
<body>

  <!-- Letterhead -->
  <div class="letterhead">
    <div>
      <div class="plan-name">MERIDIAN HEALTH PLAN</div>
      <div class="plan-subtitle">Commercial Benefits · Utilization Management Division</div>
      <div style="margin-top:6px; font-size:9px; color:#888;">
        P.O. Box 00000 · [City, State removed] · UM Fax: [removed] · Member Services: [removed]
      </div>
    </div>
    <div class="form-meta">
      <strong>Form:</strong> MHP-UM-PA-2026<br>
      <strong>Case Ref:</strong> DEMO-2026-0001<br>
      <strong>Received:</strong> [date removed]<br>
      <strong>Due:</strong> Within 3 business days<br>
      <strong>Reviewer:</strong> Pending assignment
    </div>
  </div>

  <!-- Form title -->
  <div class="form-title">Prior Authorization Request — Outpatient Services</div>

  <!-- Demo notice -->
  <div class="demo-notice">
    <span>⚠</span>
    Demonstration Document — Synthetic &amp; De-Identified — No PHI — For P402 Meter Multimodal Demo Use Only
  </div>

  <!-- SECTION 1: Member Information -->
  <div class="section">
    <div class="section-head">1 · Member Information</div>
    <div class="section-body">
      <div class="grid-3" style="margin-bottom:8px;">
        <div class="field">
          <label>Member Name</label>
          <div class="value redacted">[Removed — De-identified]</div>
        </div>
        <div class="field">
          <label>Member ID</label>
          <div class="value">***-**-7842</div>
        </div>
        <div class="field">
          <label>Date of Birth</label>
          <div class="value redacted">[Removed]</div>
        </div>
      </div>
      <div class="grid-4">
        <div class="field">
          <label>Plan / Group</label>
          <div class="value">Commercial — Employer Group</div>
        </div>
        <div class="field">
          <label>Plan Type</label>
          <div class="value">PPO</div>
        </div>
        <div class="field">
          <label>Effective Date</label>
          <div class="value redacted">[Removed]</div>
        </div>
        <div class="field">
          <label>Benefit Year</label>
          <div class="value">2026</div>
        </div>
      </div>
    </div>
  </div>

  <!-- SECTION 2: Requesting Provider -->
  <div class="section">
    <div class="section-head">2 · Requesting Provider</div>
    <div class="section-body">
      <div class="grid-3" style="margin-bottom:8px;">
        <div class="field">
          <label>Provider / Practice Name</label>
          <div class="value bold">Northside Medical Group</div>
        </div>
        <div class="field">
          <label>Ordering Physician</label>
          <div class="value">Dr. [Name removed]</div>
        </div>
        <div class="field">
          <label>Specialty</label>
          <div class="value">Internal Medicine / Primary Care</div>
        </div>
      </div>
      <div class="grid-4">
        <div class="field">
          <label>NPI</label>
          <div class="value redacted">[Removed]</div>
        </div>
        <div class="field">
          <label>Tax ID</label>
          <div class="value redacted">[Removed]</div>
        </div>
        <div class="field">
          <label>Phone</label>
          <div class="value redacted">[Removed]</div>
        </div>
        <div class="field">
          <label>Fax</label>
          <div class="value redacted">[Removed]</div>
        </div>
      </div>
    </div>
  </div>

  <!-- SECTION 3: Requested Service -->
  <div class="section">
    <div class="section-head">3 · Requested Service &amp; Urgency</div>
    <div class="section-body">
      <div class="urgency-row">
        <div class="urgency-chip chip-standard">☑ Standard (≤3 business days)</div>
        <div class="urgency-chip chip-urgent">☐ Urgent (≤72 hours)</div>
        <div class="urgency-chip chip-emergent">☐ Emergent (≤24 hours)</div>
      </div>
      <div class="grid-2" style="margin-bottom:8px;">
        <div class="field">
          <label>Service Category</label>
          <div class="value bold">Outpatient Diagnostic Imaging</div>
        </div>
        <div class="field">
          <label>Procedure Description</label>
          <div class="value bold">Advanced Diagnostic Imaging — Outpatient Setting</div>
        </div>
      </div>
      <div class="grid-4">
        <div class="field">
          <label>CPT Code(s)</label>
          <div class="value redacted">[Removed]</div>
        </div>
        <div class="field">
          <label>ICD-10 Dx Code</label>
          <div class="value redacted">[Removed]</div>
        </div>
        <div class="field">
          <label>Requested Units</label>
          <div class="value bold">1</div>
        </div>
        <div class="field">
          <label>Service Facility</label>
          <div class="value">Outpatient Imaging Center — In-network</div>
        </div>
      </div>
      <div class="grid-2" style="margin-top:8px;">
        <div class="field">
          <label>Proposed Service Date Range</label>
          <div class="value">Within 30 days of authorization</div>
        </div>
        <div class="field">
          <label>Rendering Provider (if different)</label>
          <div class="value redacted">[Not applicable]</div>
        </div>
      </div>
    </div>
  </div>

  <!-- SECTION 4: Clinical Criteria Checklist -->
  <div class="section">
    <div class="section-head">4 · Medical Necessity Criteria — Administrative Checklist</div>
    <div class="section-body">
      <table class="criteria-table">
        <thead>
          <tr>
            <th style="width:60%;">Criterion</th>
            <th style="width:10%; text-align:center;">Met</th>
            <th style="width:30%;">Documentation Reference</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Prior authorization required per plan benefit schedule</td>
            <td style="text-align:center;"><span class="check">✓</span></td>
            <td>Plan benefit grid, page 14</td>
          </tr>
          <tr>
            <td>Ordering provider is a plan-participating provider</td>
            <td style="text-align:center;"><span class="check">✓</span></td>
            <td>Provider directory verification</td>
          </tr>
          <tr>
            <td>Member is eligible and benefit year is current</td>
            <td style="text-align:center;"><span class="check">✓</span></td>
            <td>Eligibility verified at submission</td>
          </tr>
          <tr>
            <td>Completed PA request form submitted</td>
            <td style="text-align:center;"><span class="check">✓</span></td>
            <td>This document</td>
          </tr>
          <tr>
            <td>Clinical summary documentation included</td>
            <td style="text-align:center;"><span class="check">✓</span></td>
            <td>Attachment A (de-identified)</td>
          </tr>
          <tr>
            <td>Applicable diagnosis codes consistent with service requested</td>
            <td style="text-align:center;"><span class="check">✓</span></td>
            <td>Attachment B (codes de-identified)</td>
          </tr>
          <tr>
            <td>Ordering provider attestation of medical necessity signed</td>
            <td style="text-align:center;"><span class="check">✓</span></td>
            <td>Attachment C (signature de-identified)</td>
          </tr>
          <tr>
            <td>No prior authorization for same service in past 12 months</td>
            <td style="text-align:center;"><span class="check">✓</span></td>
            <td>Claims history: none on file</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- SECTION 5: Supporting Documentation -->
  <div class="section">
    <div class="section-head">5 · Supporting Documentation Submitted</div>
    <div class="section-body">
      <div class="checklist">
        <div class="checklist-item">
          <div class="checkbox checked"></div>
          <span>Completed MHP PA request form (this document)</span>
        </div>
        <div class="checklist-item">
          <div class="checkbox checked"></div>
          <span>Clinical summary / office notes — de-identified, dates and identifiers removed (Attachment A)</span>
        </div>
        <div class="checklist-item">
          <div class="checkbox checked"></div>
          <span>Diagnosis code documentation consistent with requested procedure (Attachment B)</span>
        </div>
        <div class="checklist-item">
          <div class="checkbox checked"></div>
          <span>Ordering physician attestation of medical necessity (Attachment C)</span>
        </div>
        <div class="checklist-item">
          <div class="checkbox"></div>
          <span>Prior treatment history (not required — first-time request)</span>
        </div>
        <div class="checklist-item">
          <div class="checkbox"></div>
          <span>Specialist referral letter (not required — ordering provider is PCP)</span>
        </div>
      </div>
      <div style="margin-top:8px; padding:6px 10px; background:#f0fdf4; border:1px solid #86efac; font-size:9.5px; color:#14532d;">
        <strong>Documentation Review:</strong> All required documents appear complete per standard submission checklist.
        No additional documentation requested at this time. Case ready for UM nurse review.
      </div>
    </div>
  </div>

  <!-- SECTION 6: Certification -->
  <div class="section">
    <div class="section-head">6 · Provider Certification</div>
    <div class="section-body">
      <div style="font-size:9.5px; color:#444; line-height:1.5; margin-bottom:10px;">
        I certify that the information submitted is accurate and complete to the best of my knowledge.
        I understand that prior authorization does not guarantee payment and is subject to member eligibility,
        benefit limits, and coordination of benefits at the time of service. Submission of inaccurate
        information may result in denial and/or referral to the Special Investigations Unit.
      </div>
      <div class="sig-row">
        <div class="sig-field">
          <label>Authorized Signature (Provider or Authorized Representative)</label>
          <div class="sig-line">
            <div class="sig-redacted">[Signature — de-identified for demo]</div>
          </div>
        </div>
        <div class="sig-field">
          <label>Date Signed</label>
          <div class="sig-line">
            <div class="sig-redacted">[Removed]</div>
          </div>
        </div>
        <div class="sig-field">
          <label>Provider NPI / License #</label>
          <div class="sig-line">
            <div class="sig-redacted">[Removed]</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div>
      <strong>Meridian Health Plan</strong> · UM Division · Form MHP-UM-PA-2026 ·
      Questions: UM Fax [removed] · Electronic submission preferred
    </div>
    <div style="text-align:right;">
      <div class="meter-badge">P402 METER · DEMO ASSET · GEMINI MULTIMODAL</div>
    </div>
  </div>

</body>
</html>`;

// ── Render and screenshot ─────────────────────────────────────────────────────

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.setViewportSize({ width: 820, height: 1100 });
await page.setContent(HTML, { waitUntil: 'domcontentloaded' });

// Let fonts and layout settle
await page.waitForTimeout(300);

await page.screenshot({
  path: OUT_PATH,
  fullPage: true,
  type: 'png',
});

await browser.close();

console.log(`✓ Generated: ${OUT_PATH}`);
console.log(`  Use this PNG via the "Image / PDF" tab in the P402 Meter Document Intake section.`);
console.log(`  Gemini multimodal will extract the structured fields from the rendered form.`);
