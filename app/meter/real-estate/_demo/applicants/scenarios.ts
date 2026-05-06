// Synthetic tenant applicant scenarios for the real estate screening demo.
// All names, addresses, and financial figures are fictional.

export type ScenarioOutcome = 'approved' | 'conditional' | 'declined' | 'escalated';
export type DocumentType = 'rental_application' | 'pay_stub' | 'bank_statement' | 'government_id';

export interface ApplicantDocument {
  id: string;
  type: DocumentType;
  label: string;
  extractionModel: 'flash' | 'pro';
  pages: number;
  estimatedCostUsd: number;
  content: string;
}

export interface ApplicantScenario {
  id: string;
  name: string;
  unit: string;
  monthlyRent: number;
  scenario: ScenarioOutcome;
  fraudScore: number;        // 0–100
  fraudThreshold: number;    // threshold for escalation
  summary: string;
  inconsistencies: string[];
  documents: ApplicantDocument[];
  estimatedTotalCostUsd: number;
  verifiedMonthlyIncome: number;
  claimedMonthlyIncome: number;
}

export const PROPERTY = {
  address: '1820 Valencia Street, Unit 4B, San Francisco, CA 94110',
  monthlyRent: 3850,
  incomeRequirement: '3× monthly rent = $11,550/mo gross',
  managementCo: 'Sunrise Property Management, Inc.',
};

export const SCENARIOS: ApplicantScenario[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // Scenario A: Clean applicant — all documents consistent
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'applicant-a',
    name: 'Jordan Lee',
    unit: '4B',
    monthlyRent: PROPERTY.monthlyRent,
    scenario: 'approved',
    fraudScore: 8,
    fraudThreshold: 65,
    summary: 'Clean application. Income verified at 4.1× rent requirement. All documents internally consistent. No fraud signals detected.',
    inconsistencies: [],
    estimatedTotalCostUsd: 0.000022,
    verifiedMonthlyIncome: 15800,
    claimedMonthlyIncome: 15800,
    documents: [
      {
        id: 'a-rental-app',
        type: 'rental_application',
        label: 'Rental Application',
        extractionModel: 'flash',
        pages: 3,
        estimatedCostUsd: 0.000004,
        content: `RENTAL APPLICATION
Property: 1820 Valencia Street, Unit 4B, San Francisco, CA 94110
Monthly Rent: $3,850

APPLICANT INFORMATION
Name: Jordan Lee
Date of Birth: March 15, 1988
SSN (last 4): 7234
Current Address: 892 Folsom Street, Apt 2A, San Francisco, CA 94107
Current Landlord: Pacific Properties LLC
Current Monthly Rent: $3,200
Time at Current Address: 3 years, 2 months
Reason for Moving: Lease non-renewal (landlord is renovating)

EMPLOYMENT
Employer: Stripe, Inc.
Position: Senior Software Engineer
Employment Start Date: November 2020
Monthly Gross Income: $15,800
Employment Status: Full-time

ADDITIONAL INCOME: None

REFERENCES
Personal: Casey Wang, (415) 555-0187
Professional: Dr. Sam Nguyen, Engineering Manager, Stripe

AUTHORIZATION
I certify that the information provided is true and accurate.
Signature: Jordan Lee
Date: May 1, 2026`,
      },
      {
        id: 'a-pay-stub',
        type: 'pay_stub',
        label: 'Pay Stub (April 2026)',
        extractionModel: 'flash',
        pages: 1,
        estimatedCostUsd: 0.000003,
        content: `STRIPE, INC.
510 Townsend Street, San Francisco, CA 94103
Pay Period: April 1 – April 30, 2026
Employee: Jordan Lee
Employee ID: EMP-004821

EARNINGS
Regular: $15,800.00
Overtime: $0.00
Bonus: $0.00
Gross Pay: $15,800.00

DEDUCTIONS
Federal Income Tax: $3,476.00
CA State Tax: $1,027.00
Social Security: $979.60
Medicare: $229.10
Medical Insurance: $420.00
401(k): $1,264.00
Net Pay: $8,404.30

YEAR-TO-DATE
Gross: $63,200.00
Net: $33,617.20

Direct Deposit: Chase Bank ****4892`,
      },
      {
        id: 'a-bank-stmt',
        type: 'bank_statement',
        label: 'Bank Statement (April 2026)',
        extractionModel: 'flash',
        pages: 2,
        estimatedCostUsd: 0.000005,
        content: `CHASE BANK
Account Statement — April 2026
Account Holder: Jordan Lee
Account Number: ****4892
Statement Period: April 1 – April 30, 2026

ACCOUNT SUMMARY
Beginning Balance: $24,312.44
Total Deposits: $8,404.30
Total Withdrawals: $5,280.00
Ending Balance: $27,436.74

TRANSACTION HISTORY
04/01  Direct Deposit — STRIPE INC PAYROLL   +$8,404.30
04/03  Rent — Pacific Properties LLC          -$3,200.00
04/05  PG&E Utilities                           -$142.00
04/08  Whole Foods                             -$287.40
04/10  BART Monthly Pass                        -$98.00
04/14  Spotify Premium                          -$17.99
04/15  Chase Savings Transfer                  -$500.00
04/20  Amazon                                  -$89.40
04/22  Chase Credit Card Payment               -$945.21

SAVINGS ACCOUNT: ****5102
Balance: $18,500.00`,
      },
      {
        id: 'a-id',
        type: 'government_id',
        label: 'California Driver\'s License',
        extractionModel: 'flash',
        pages: 1,
        estimatedCostUsd: 0.000003,
        content: `CALIFORNIA DRIVER LICENSE

Name: JORDAN LEE
DOB: 03/15/1988
Address: 892 FOLSOM ST APT 2A, SAN FRANCISCO CA 94107
DL Number: C8472093
Issue Date: 08/12/2022
Expiration: 03/15/2028
Class: C
Restrictions: None
Endorsements: None

[Document appears authentic — standard CA DL format, hologram visible, no signs of alteration]`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Scenario B: Income mismatch — claimed vs verified discrepancy
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'applicant-b',
    name: 'Alex Morales',
    unit: '4B',
    monthlyRent: PROPERTY.monthlyRent,
    scenario: 'conditional',
    fraudScore: 42,
    fraudThreshold: 65,
    summary: 'Income discrepancy detected. Application claims $13,200/mo gross; pay stub shows $9,400/mo. Bank deposits confirm $9,400/mo. Applicant income is 2.44× rent (below 3× threshold). Conditional approval possible with co-signer or increased deposit.',
    inconsistencies: [
      'Application claims $13,200/mo gross income; pay stub shows $9,400/mo base — $3,800 discrepancy',
      'No additional income sources documented to explain the gap',
      'Income at 2.44× rent falls below the 3× requirement',
    ],
    estimatedTotalCostUsd: 0.000031,
    verifiedMonthlyIncome: 9400,
    claimedMonthlyIncome: 13200,
    documents: [
      {
        id: 'b-rental-app',
        type: 'rental_application',
        label: 'Rental Application',
        extractionModel: 'flash',
        pages: 3,
        estimatedCostUsd: 0.000004,
        content: `RENTAL APPLICATION
Property: 1820 Valencia Street, Unit 4B, San Francisco, CA 94110
Monthly Rent: $3,850

APPLICANT INFORMATION
Name: Alex Morales
Date of Birth: July 22, 1991
SSN (last 4): 4418
Current Address: 234 Mission Street, Apt 8C, San Francisco, CA 94105
Current Landlord: Bay Area Rentals LLC
Current Monthly Rent: $2,900
Time at Current Address: 1 year, 4 months
Reason for Moving: Want more space

EMPLOYMENT
Employer: Salesforce, Inc.
Position: Account Executive
Employment Start Date: March 2022
Monthly Gross Income: $13,200
Employment Status: Full-time

ADDITIONAL INCOME: None

Note from applicant: "My base is $9,400 but with commissions I typically earn $13,200. Last year I earned $158,400 total including commissions."`,
      },
      {
        id: 'b-pay-stub',
        type: 'pay_stub',
        label: 'Pay Stub (April 2026)',
        extractionModel: 'flash',
        pages: 1,
        estimatedCostUsd: 0.000003,
        content: `SALESFORCE, INC.
415 Mission Street, San Francisco, CA 94105
Pay Period: April 1 – April 30, 2026
Employee: Alex Morales
Employee ID: SF-039217

EARNINGS
Base Salary: $9,400.00
Commission (Q1 reconciliation): $0.00
Bonus: $0.00
Gross Pay: $9,400.00

NOTE: Commission payments are quarterly. Q1 2026 commission will be paid in May.

DEDUCTIONS
Federal Income Tax: $1,692.00
CA State Tax: $611.00
Social Security: $582.80
Medicare: $136.30
Medical Insurance: $380.00
401(k): $752.00
Net Pay: $5,245.90

YEAR-TO-DATE
Gross: $37,600.00
Net: $20,983.60`,
      },
      {
        id: 'b-bank-stmt',
        type: 'bank_statement',
        label: 'Bank Statement (April 2026)',
        extractionModel: 'flash',
        pages: 2,
        estimatedCostUsd: 0.000005,
        content: `BANK OF AMERICA
Account Statement — April 2026
Account Holder: Alex Morales
Account Number: ****7731
Statement Period: April 1 – April 30, 2026

ACCOUNT SUMMARY
Beginning Balance: $6,847.20
Total Deposits: $5,245.90
Total Withdrawals: $6,122.40
Ending Balance: $5,970.70

TRANSACTION HISTORY
04/01  ACH Deposit — SALESFORCE PAYROLL      +$5,245.90
04/01  Rent — Bay Area Rentals               -$2,900.00
04/03  PG&E                                    -$134.50
04/05  Whole Foods                             -$312.80
04/10  Gym Membership                          -$85.00
04/15  Venmo Transfer                         -$400.00
04/18  Amazon                                 -$157.30
04/22  Apple                                   -$29.99
04/25  Credit Card Payment (Chase)           -$2,102.81

SAVINGS: $0.00
NOTE: No commission deposit received in April. Prior commission deposits: Jan: $3,800, Oct 2025: $4,200`,
      },
      {
        id: 'b-id',
        type: 'government_id',
        label: 'California Driver\'s License',
        extractionModel: 'flash',
        pages: 1,
        estimatedCostUsd: 0.000003,
        content: `CALIFORNIA DRIVER LICENSE

Name: ALEX MORALES
DOB: 07/22/1991
Address: 234 MISSION ST APT 8C, SAN FRANCISCO CA 94105
DL Number: B7219834
Issue Date: 09/04/2021
Expiration: 07/22/2027
Class: C

[Document appears authentic]`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Scenario C: Likely fraud — multiple fabrication signals
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'applicant-c',
    name: 'M. Zhang',
    unit: '4B',
    monthlyRent: PROPERTY.monthlyRent,
    scenario: 'escalated',
    fraudScore: 87,
    fraudThreshold: 65,
    summary: 'High fraud probability. Name inconsistency across documents. Bank statement formatting anomalies — balance figures inconsistent with transaction history. Employer phone disconnected. Escalated for specialist forensic review.',
    inconsistencies: [
      'Name mismatch: application "M. Zhang", ID "Wei Zhang", bank statement "Ming Zhang" — three variations',
      'Bank statement arithmetic error: beginning balance + deposits − withdrawals ≠ ending balance ($312 discrepancy)',
      'Bank statement uses non-standard routing format (ABA routing number 021000021 is JPMorgan New York — inconsistent with claimed SF address)',
      'Employer "Pacific Coast AI Inc." shows no online presence; listed phone number disconnected',
      'Pay stub font inconsistency on line items vs header (different typeface weight)',
    ],
    estimatedTotalCostUsd: 0.000065,
    verifiedMonthlyIncome: 0,
    claimedMonthlyIncome: 18500,
    documents: [
      {
        id: 'c-rental-app',
        type: 'rental_application',
        label: 'Rental Application',
        extractionModel: 'flash',
        pages: 3,
        estimatedCostUsd: 0.000004,
        content: `RENTAL APPLICATION
Property: 1820 Valencia Street, Unit 4B, San Francisco, CA 94110
Monthly Rent: $3,850

APPLICANT INFORMATION
Name: M. Zhang
Date of Birth: January 3, 1985
SSN (last 4): 9901
Current Address: 45 Kearny Street, Suite 1200, San Francisco, CA 94108
Current Monthly Rent: $4,200
Time at Current Address: 6 months
Reason for Moving: Current unit sold

EMPLOYMENT
Employer: Pacific Coast AI Inc.
Position: Director of Machine Learning
Employment Start Date: January 2024
Monthly Gross Income: $18,500
Employment Status: Full-time
Employer Phone: (415) 555-0198

ADDITIONAL INCOME: Consulting: $2,000/mo`,
      },
      {
        id: 'c-pay-stub',
        type: 'pay_stub',
        label: 'Pay Stub (April 2026)',
        extractionModel: 'flash',
        pages: 1,
        estimatedCostUsd: 0.000003,
        content: `PACIFIC COAST AI INC.
123 Market Street, Suite 400, San Francisco, CA 94105
Pay Period: April 1 – April 30, 2026
Employee: M. Zhang
Employee ID: PC-00247

EARNINGS
Regular Salary: $18,500.00
Overtime: $0.00
Gross Pay: $18,500.00

DEDUCTIONS
Federal Income Tax: $4,625.00
CA State Tax: $1,295.00
Social Security: $1,147.00
Medicare: $268.25
Health Insurance: $380.00
Net Pay: $10,784.75

[FORMATTING NOTE: Line items appear in Arial Narrow; header uses Arial Bold — inconsistent with standard payroll software output]`,
      },
      {
        id: 'c-bank-stmt',
        type: 'bank_statement',
        label: 'Bank Statement (April 2026)',
        extractionModel: 'pro',
        pages: 2,
        estimatedCostUsd: 0.000032,
        content: `CHASE BANK
Account Statement — April 2026
Account Holder: Ming Zhang
Account Number: ****3847
Routing Number: 021000021
Statement Period: April 1 – April 30, 2026

ACCOUNT SUMMARY
Beginning Balance: $31,420.00
Total Deposits: $10,784.75
Total Withdrawals: $8,940.00
Ending Balance: $33,952.75

[ARITHMETIC CHECK: 31,420.00 + 10,784.75 − 8,940.00 = 33,264.75 ≠ 33,952.75 — $688 discrepancy]

TRANSACTION HISTORY
04/01  Direct Deposit — PACIFIC COAST AI INC  +$10,784.75
04/02  Rent Payment                            -$4,200.00
04/05  Utilities                                -$180.00
04/10  Groceries                               -$420.00
04/15  Online Transfer                        -$2,100.00
04/20  Miscellaneous                          -$2,040.00

NOTE: Routing number 021000021 is JPMorgan Chase NY headquarters routing — SF-based accounts would typically use 322271627 (Chase Western US)`,
      },
      {
        id: 'c-id',
        type: 'government_id',
        label: 'California Driver\'s License',
        extractionModel: 'flash',
        pages: 1,
        estimatedCostUsd: 0.000004,
        content: `CALIFORNIA DRIVER LICENSE

Name: WEI ZHANG
DOB: 01/03/1985
Address: 45 KEARNY ST STE 1200, SAN FRANCISCO CA 94108
DL Number: D4820571
Issue Date: 02/14/2023
Expiration: 01/03/2029
Class: C

NOTE: Name on ID is "Wei Zhang" — application uses "M. Zhang" — bank statement shows "Ming Zhang"
This three-way name inconsistency is a primary fraud signal.`,
      },
    ],
  },
];

export const TOTAL_SCENARIOS = SCENARIOS.length;
