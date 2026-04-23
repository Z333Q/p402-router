// app/meter/_demo/packets/healthcare-scenarios.ts
// Additional de-identified healthcare demo packets for document intake scenarios.
// All data is fictional and synthetic, no PHI. Administrative use only.

// ── Scenario 3: Specialty Biologic Drug PA ────────────────────────────────────

export const DEMO_SPECIALTY_DRUG = `PRIOR AUTHORIZATION REQUEST, SPECIALTY PHARMACY
Administrative Review Document, De-Identified
Review Category: High-Cost Biologic / Specialty Drug

================================
REQUEST INFORMATION
================================
Request Type: Prior Authorization, Specialty Pharmacy
Line of Business: Commercial, Employer-Sponsored Plan
Case Reference: DEMO-2026-0003 (de-identified)
Submission Channel: Electronic, Specialty Pharmacy Hub
Urgency Classification: Standard (non-urgent)

================================
MEDICATION INFORMATION
================================
Drug Category: Biologic, TNF-alpha inhibitor class
Therapeutic Area: Gastroenterology
Indication: Moderate-to-severe inflammatory bowel disease (de-identified code)
Requested Duration: 12-month authorization with quarterly renewals
Units / Frequency: Per prescribing label (de-identified)
Dispensing Channel: Specialty pharmacy, cold chain required
Step Therapy Status: Documentation of step therapy included (see attached)

================================
STEP THERAPY & CLINICAL PATHWAY
================================
Step Therapy Stage: Step 3, advanced biologic
Prior Therapies Documented:
  Step 1: Conventional immunosuppressant, 6-month trial, inadequate response documented
  Step 2: Alternative biologic, 4-month trial, discontinued due to documented adverse event
  Current Request: Third-line agent per plan step therapy protocol
Clinical Documentation: Prescriber attestation with trial outcomes attached (de-identified)

================================
POLICY CRITERIA REFERENCE
================================
Applicable Guideline: Plan specialty drug management criteria, biologic step therapy
Coverage Class: Specialty tier, employer-sponsored commercial plan
Step Therapy Requirement: Three documented prior therapy steps required, all steps documented
Medical Necessity Threshold: Prescriber attestation + objective clinical criteria, submitted
Clinical Exception Basis: Step 2 adverse event constitutes exception basis per plan criteria

================================
DOCUMENTATION SUBMITTED
================================
- Completed specialty PA request form
- Prescriber letter of medical necessity (de-identified)
- Step therapy documentation with dates and outcomes
- Adverse event report for step 2 therapy
- Lab values supporting diagnosis (de-identified, reference ranges only)
- Pharmacy benefit verification (specialty hub)

================================
TARGET OUTPUT
================================
Required Output: Administrative review summary, specialty drug step therapy compliance
Review Standard: Administrative and process-oriented, non-clinical
Reviewer Action Required: Approve (step therapy complete), hold for clinical escalation, or request additional documentation
`;

export const DEMO_SPECIALTY_DRUG_METADATA = {
  packetType: 'prior_auth_packet' as const,
  format: 'text' as const,
  sourceLabel: 'demo-specialty-drug-biologic',
  deidentified: true,
  budgetHintUsd: 0.50,
};

// ── Scenario 4: Elective Orthopedic Surgery PA ────────────────────────────────

export const DEMO_SURGICAL_PA = `PRIOR AUTHORIZATION REQUEST, ELECTIVE SURGICAL PROCEDURE
Administrative Review Document, De-Identified
Review Category: Musculoskeletal / Elective Surgery

================================
REQUEST INFORMATION
================================
Request Type: Prior Authorization, Elective Inpatient Surgical Procedure
Line of Business: Commercial, PPO Plan
Case Reference: DEMO-2026-0004 (de-identified)
Submission Date: [date removed]
Urgency Classification: Elective (non-urgent, scheduled)

================================
PROCEDURE INFORMATION
================================
Procedure Category: Major joint replacement, lower extremity
Service Setting: Inpatient, acute care hospital
Estimated Length of Stay: 2 nights (standard protocol)
Anesthesia Type: General or regional (surgeon discretion)
Facility Type: In-network acute care facility
Post-Acute Disposition: Home with outpatient physical therapy (planned)

================================
CLINICAL PATHWAY DOCUMENTATION
================================
Conservative Treatment History:
  - Physical therapy: 12 weeks documented, functional improvement plateau
  - NSAID/analgesic trial: documented with duration and response
  - Corticosteroid injection: 2 administrations, temporary relief only
  - Activity modification: documented, functional limitation persists
Functional Assessment: Documented functional limitation per standardized scoring tool
Imaging: Radiographic documentation submitted (de-identified, findings summary only)
BMI / Risk Stratification: Within plan criteria for elective surgical authorization

================================
POLICY CRITERIA REFERENCE
================================
Applicable Guideline: Plan utilization management criteria, major joint replacement
Coverage Class: Elective inpatient surgical benefit, commercial PPO
Conservative Treatment Requirement: Minimum 6 weeks documented, requirement met
Pre-operative Requirements: Cardiac clearance, pre-anesthesia assessment, documented

================================
DOCUMENTATION SUBMITTED
================================
- Completed prior authorization request form
- Operative plan summary (de-identified)
- Conservative treatment documentation with dates
- Functional limitation assessment
- Imaging summary (de-identified, no identifiable markings)
- Referring provider notes (de-identified)
- Pre-operative clearance documentation

================================
TARGET OUTPUT
================================
Required Output: Administrative review summary, elective surgical authorization
Review Standard: Administrative and process-oriented, non-clinical
Reviewer Action Required: Approve for manual review, request peer-to-peer, or approve directly per criteria
`;

export const DEMO_SURGICAL_PA_METADATA = {
  packetType: 'prior_auth_packet' as const,
  format: 'text' as const,
  sourceLabel: 'demo-surgical-pa-orthopedic',
  deidentified: true,
  budgetHintUsd: 0.50,
};

// ── Scenario 5: Behavioral Health Inpatient Authorization ─────────────────────

export const DEMO_BEHAVIORAL_HEALTH = `BEHAVIORAL HEALTH INPATIENT AUTHORIZATION REQUEST
Administrative Review Document, De-Identified
Review Category: Behavioral Health / Acute Psychiatric Admission

================================
REQUEST INFORMATION
================================
Request Type: Prior Authorization, Acute Inpatient Behavioral Health
Line of Business: Government-sponsored plan, behavioral health carve-out
Case Reference: DEMO-2026-0005 (de-identified)
Urgency Classification: Urgent, same-day admission review
Review Level: Initial admission authorization (Day 1)

================================
ADMISSION CONTEXT
================================
Facility Type: Acute inpatient psychiatric unit, licensed facility
Admission Category: Voluntary, acute stabilization
Clinical Setting Level: Acute inpatient (highest level of care)
Expected Length of Stay Request: 5 days initial (concurrent review to follow)
Treatment Team: Attending psychiatrist + multidisciplinary team

================================
CLINICAL DOCUMENTATION SUMMARY
================================
Presenting Concern Category: Acute psychiatric decompensation (de-identified)
Safety Assessment: Documented, meets criteria for acute inpatient level of care per managed care guidelines
Outpatient Treatment History: Active outpatient treatment documented, recent level-of-care escalation indicated
Less Restrictive Alternatives Considered: Documented, intensive outpatient and partial hospitalization considered and ruled out with clinical rationale
Medication Status: Current medications documented (de-identified)
Functional Impairment Level: Documented, unable to safely maintain at lower level of care

================================
LEVEL OF CARE CRITERIA
================================
Applicable Criteria Set: Managed care behavioral health level-of-care criteria (standard commercial criteria)
Safety Criteria Met: Yes, documented in clinical attestation
Intensity Criteria Met: Yes, acute presentation documented
Outpatient Failure Documented: Yes, clinical progression documented
Medical Stability: Confirmed, medically stable for psychiatric treatment setting

================================
DOCUMENTATION SUBMITTED
================================
- Admission request with clinical attestation (de-identified)
- Prescriber attestation of medical necessity
- Level-of-care criteria checklist, all applicable criteria checked
- Less restrictive alternatives assessment
- Facility treatment plan summary (de-identified)
- Safety assessment summary (de-identified, no identifiers)

================================
TARGET OUTPUT
================================
Required Output: Administrative authorization summary, acute inpatient behavioral health
Review Standard: Administrative and process-oriented, non-clinical
Reviewer Action Required: Approve initial days, hold for concurrent review setup, or refer to behavioral health clinical reviewer
`;

export const DEMO_BEHAVIORAL_HEALTH_METADATA = {
  packetType: 'prior_auth_packet' as const,
  format: 'text' as const,
  sourceLabel: 'demo-behavioral-health-inpatient',
  deidentified: true,
  budgetHintUsd: 0.50,
};

// ── Scenario 6: Post-Acute / SNF Placement Review ────────────────────────────

export const DEMO_POST_ACUTE = `POST-ACUTE CARE PLACEMENT REVIEW
Administrative Review Document, De-Identified
Review Category: Discharge Planning / Post-Acute Care Authorization

================================
REQUEST INFORMATION
================================
Request Type: Post-Acute Care Authorization, Skilled Nursing Facility
Line of Business: Medicare Advantage, Standard Plan
Case Reference: DEMO-2026-0006 (de-identified)
Inpatient Admit: [date removed]
Discharge Planning Initiated: Day 2 of admission
Urgency: Standard discharge planning review

================================
CLINICAL CONTEXT
================================
Admitting Diagnosis Category: Acute fracture, lower extremity (de-identified)
Surgical Intervention: Completed, operative repair, day of admission
Current Inpatient Day: Day 3 of acute admission
Functional Status: Requires physical and occupational therapy for mobility and ADL restoration
Medical Stability: Stable, wound management and anticoagulation management ongoing
Social Context: Home environment assessed, patient lives alone, home modifications needed

================================
POST-ACUTE LEVEL OF CARE REQUEST
================================
Requested Level: Skilled Nursing Facility (SNF), Medicare Part A benefit
Requested Duration: 21 days (standard Medicare SNF benefit period, first 20 covered at 100%)
Skilled Services Required:
  - Physical therapy: daily, ambulation and transfer training
  - Occupational therapy: daily, ADL restoration
  - Skilled nursing: wound care, anticoagulation monitoring
  - Social work: discharge planning to home
SNF Facility: In-network facility, bed available, admission confirmed

================================
MEDICARE SKILLED CRITERIA
================================
Three-Day Qualifying Stay: Met, Day 3 of acute admission
Skilled Service Need: Documented, PT, OT, skilled nursing all required
Qualifying Condition: Related to admitting diagnosis
Coverage Level: Days 1–20 at 100%; Days 21–100 at co-insurance rate

================================
ALTERNATIVE LEVELS OF CARE CONSIDERED
================================
Home Health: Considered, deferred due to functional status and home environment assessment
Inpatient Rehab Facility: Considered, intensity criteria not met at this time
Home with Outpatient Therapy: Not appropriate, ambulation status does not support safe discharge to home
SNF Selected: Appropriate level of care per functional assessment and social factors

================================
DOCUMENTATION SUBMITTED
================================
- Discharge planning summary (de-identified)
- Functional assessment tool results (de-identified)
- SNF level-of-care criteria checklist
- Therapy evaluation summary (PT and OT)
- Home environment assessment
- Social work documentation
- SNF admission agreement confirmation

================================
TARGET OUTPUT
================================
Required Output: Administrative post-acute placement review summary
Review Standard: Administrative and process-oriented, non-clinical
Reviewer Action Required: Approve SNF authorization (duration and level of care), modify duration, or refer for clinical review
`;

export const DEMO_POST_ACUTE_METADATA = {
  packetType: 'prior_auth_packet' as const,
  format: 'text' as const,
  sourceLabel: 'demo-post-acute-snf',
  deidentified: true,
  budgetHintUsd: 0.50,
};

// ── Scenario index for UI rendering ──────────────────────────────────────────

export const HEALTHCARE_SCENARIOS = [
  {
    id: 1 as const,
    label: 'Prior Auth',
    sublabel: 'Outpatient imaging request',
    filename: 'demo-prior-auth-outpatient.txt',
    category: 'Diagnostic',
  },
  {
    id: 2 as const,
    label: 'Util Review',
    sublabel: 'Inpatient extension request',
    filename: 'demo-util-review-inpatient.txt',
    category: 'Inpatient',
  },
  {
    id: 3 as const,
    label: 'Specialty Drug',
    sublabel: 'Biologic step therapy PA',
    filename: 'demo-specialty-drug-biologic.txt',
    category: 'Pharmacy',
  },
  {
    id: 4 as const,
    label: 'Surgical PA',
    sublabel: 'Elective joint replacement',
    filename: 'demo-surgical-pa-orthopedic.txt',
    category: 'Surgical',
  },
  {
    id: 5 as const,
    label: 'Behavioral Health',
    sublabel: 'Acute inpatient psych',
    filename: 'demo-behavioral-health-inpatient.txt',
    category: 'BH',
  },
  {
    id: 6 as const,
    label: 'Post-Acute',
    sublabel: 'SNF placement review',
    filename: 'demo-post-acute-snf.txt',
    category: 'PAC',
  },
] as const;

export type ScenarioId = (typeof HEALTHCARE_SCENARIOS)[number]['id'];
