// app/meter/_demo/packets/prior-auth-demo.ts
// Demo-safe, de-identified prior authorization packet for consistent demo runs

export const DEMO_PACKET_CONTENT = `PRIOR AUTHORIZATION CASE PACKET
Administrative Review Document, De-Identified

================================
REQUEST INFORMATION
================================
Request Type: Prior Authorization, Outpatient Service
Line of Business: Commercial, Standard Plan
Case Reference: DEMO-2026-0001 (de-identified)
Submission Date: [date removed]
Urgency Classification: Standard (non-urgent)

================================
SERVICE INFORMATION
================================
Service Category: Outpatient Diagnostic Procedure
Service Description: Advanced diagnostic imaging, outpatient setting
Requested Service Units: 1
Requested Date Range: Within 30 days of authorization

================================
POLICY CRITERIA REFERENCE
================================
Applicable Guideline: Standard utilization management criteria for outpatient diagnostic services
Coverage Class: Standard outpatient benefit, commercial plan
Review Criteria Threshold: Documentation of medical necessity per plan criteria; prior authorization required for services in this category
Prior Claim History: Not applicable (first request)

================================
SUBMITTED DOCUMENTATION SUMMARY
================================
Supporting documentation indicates the requesting provider has submitted:
- Completed prior authorization request form
- Clinical summary documentation (de-identified)
- Applicable diagnostic codes consistent with service request (codes removed for de-identification)
- Ordering provider attestation

Documentation appears complete per standard submission requirements.

================================
TARGET OUTPUT
================================
Required Output: Utilization management review summary
Review Standard: Administrative and process-oriented, non-clinical
Reviewer Action Required: Approve for manual review OR hold for escalation
`;

export const DEMO_PACKET_METADATA = {
  packetType: 'prior_auth_packet' as const,
  format: 'text' as const,
  sourceLabel: 'demo-prior-auth-2026',
  deidentified: true,
  budgetHintUsd: 0.50,
};

// Second demo packet, utilization review variant
export const DEMO_PACKET_CONTENT_2 = `UTILIZATION REVIEW PACKET
Administrative Review Document, De-Identified

================================
REQUEST TYPE
================================
Review Type: Concurrent Utilization Review
Setting: Inpatient, Standard Admission Review
Line of Business: Government-sponsored plan, generic
Case Reference: DEMO-2026-0002 (de-identified)

================================
REVIEW CONTEXT
================================
Admission Category: Standard medical admission
Requested Additional Days: 2
Review Day: Day 3 of admission
Attending Attestation: Included (de-identified)

================================
POLICY REFERENCE
================================
Criteria Set: Standard inpatient utilization management criteria
Coverage Class: Government-sponsored plan benefit
Applicable Review Level: Nurse review threshold for standard admission extension requests

================================
DOCUMENTATION SUBMITTED
================================
- Day 3 clinical summary (de-identified, PHI removed)
- Discharge planning notes (administrative elements only)
- Attending physician day 3 attestation

================================
TARGET OUTPUT
================================
Required Output: Concurrent utilization review summary for day 3 extension request
Review Standard: Administrative, non-clinical, process-oriented
Reviewer Action Required: Approve extension, hold for escalation, or recommend discharge planning review
`;
