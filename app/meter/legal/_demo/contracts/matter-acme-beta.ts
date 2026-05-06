// Synthetic M&A data room — Acme Corp acquires Beta Technologies, Inc.
// All names, addresses, and terms are fictional.

export type ContractTier = 'flash' | 'pro';
export type ContractStatus = 'pending' | 'classifying' | 'queued' | 'reviewing' | 'done' | 'escalated';

export interface ContractDoc {
  id: string;
  filename: string;
  type: string;
  parties: string;
  pages: number;
  complexityScore: number;  // 1–10
  tier: ContractTier;
  tierRationale: string;
  estimatedCostUsd: number;
  content: string;
}

export const MATTER = {
  id: 'matter-acme-beta-2025-001',
  title: 'Acme Corp / Beta Technologies — Acquisition Data Room',
  buyer: 'Acme Corp',
  target: 'Beta Technologies, Inc.',
  dealValue: '$42M',
  closingTarget: 'Q3 2026',
  leadAttorney: 'Partner, M&A Group',
  budgetCapUsd: 0.12,
};

export const CONTRACTS: ContractDoc[] = [
  {
    id: 'doc-001',
    filename: 'nda-acme-beta-mutual.txt',
    type: 'Mutual NDA',
    parties: 'Acme Corp ↔ Beta Technologies',
    pages: 4,
    complexityScore: 2,
    tier: 'flash',
    tierRationale: 'Standard bilateral NDA. Boilerplate confidentiality obligations, 2-year term, no unusual carve-outs. Flash handles this class at 97% accuracy.',
    estimatedCostUsd: 0.000031,
    content: `MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of January 15, 2026, between Acme Corp, a Delaware corporation ("Acme"), and Beta Technologies, Inc., a California corporation ("Beta").

1. CONFIDENTIAL INFORMATION. "Confidential Information" means any non-public information disclosed by either party to the other party, directly or indirectly, in writing, orally or by inspection of tangible objects, that is designated as "Confidential," "Proprietary," or some similar designation, or that reasonably should be understood to be confidential given the nature of the information and circumstances of disclosure.

2. OBLIGATIONS. Each party agrees to: (a) hold the other party's Confidential Information in strict confidence; (b) not disclose such Confidential Information to third parties without prior written consent; (c) use the Confidential Information solely for the purpose of evaluating a potential business relationship between the parties.

3. TERM. This Agreement shall remain in effect for a period of two (2) years from the Effective Date.

4. RETURN OF INFORMATION. Upon request, each party shall promptly return or destroy the other party's Confidential Information.

5. NO LICENSE. Nothing in this Agreement grants either party any rights in or to the other party's Confidential Information other than the limited right to review it for the purposes set forth herein.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

ACME CORP                          BETA TECHNOLOGIES, INC.
By: ___________________            By: ___________________
Name: Sarah Chen                   Name: David Park
Title: VP Corporate Development    Title: CEO`,
  },
  {
    id: 'doc-002',
    filename: 'letter-of-intent-acquisition.txt',
    type: 'Letter of Intent',
    parties: 'Acme Corp → Beta Technologies',
    pages: 6,
    complexityScore: 5,
    tier: 'flash',
    tierRationale: 'Non-binding LOI with standard deal terms. Key provisions are straightforward — purchase price, escrow mechanics, exclusivity period. Complexity score 5 is within Flash range for LOI classification.',
    estimatedCostUsd: 0.000048,
    content: `LETTER OF INTENT

January 28, 2026

Beta Technologies, Inc.
Attn: David Park, CEO
123 Market Street, Suite 400
San Francisco, CA 94105

Dear David:

This Letter of Intent ("LOI") sets forth the non-binding terms under which Acme Corp ("Acme") proposes to acquire 100% of the outstanding equity of Beta Technologies, Inc. ("Beta").

PROPOSED TRANSACTION
Purchase Price: $42,000,000 (forty-two million dollars), subject to working capital adjustments as described below.

PAYMENT STRUCTURE
- At Closing: $35,000,000 in cash
- Escrow: $4,200,000 held in escrow for 18 months for indemnification claims
- Earnout: Up to $2,800,000 payable over 24 months based on revenue milestones

WORKING CAPITAL ADJUSTMENT
The purchase price will be adjusted dollar-for-dollar based on the difference between actual closing working capital and a target working capital of $2,100,000.

EXCLUSIVITY
Beta agrees to work exclusively with Acme for a period of 45 days from the date both parties sign this LOI.

DUE DILIGENCE
Acme will conduct customary legal, financial, technical, and commercial due diligence during the exclusivity period. Beta agrees to provide reasonable access to its books, records, key employees, and facilities.

KEY EMPLOYEE RETENTION
The transaction is conditioned upon execution of retention agreements with the following key employees: David Park (CEO), Maria Rodriguez (CTO), and James Kim (VP Engineering).

EMPLOYEE MATTERS
Acme intends to retain all current Beta employees for a minimum of 12 months post-closing, subject to standard employment terms.

This LOI is non-binding except for the Exclusivity and Confidentiality provisions, which are legally binding.

ACME CORP
By: ___________________
Name: Michael Torres
Title: Chief Strategy Officer`,
  },
  {
    id: 'doc-003',
    filename: 'master-service-agreement-saas.txt',
    type: 'Master Service Agreement',
    parties: 'Beta Technologies ↔ Enterprise Customers (form)',
    pages: 28,
    complexityScore: 8,
    tier: 'pro',
    tierRationale: 'Complex enterprise SaaS MSA with data processing addendum, SLA obligations, IP ownership provisions, and limitation of liability caps. Requires Pro for deep clause analysis and cross-reference detection.',
    estimatedCostUsd: 0.000214,
    content: `MASTER SERVICE AGREEMENT

This Master Service Agreement ("MSA") governs the provision of software-as-a-service products and professional services by Beta Technologies, Inc. ("Provider") to the customer identified in the applicable Order Form ("Customer").

ARTICLE 1: SERVICES AND LICENSES

1.1 Services. Provider will make the Beta Platform available to Customer pursuant to this MSA and any applicable Order Forms during the Subscription Term.

1.2 License Grant. Subject to the terms of this MSA, Provider grants Customer a limited, non-exclusive, non-transferable, non-sublicensable license to access and use the Platform during the Subscription Term solely for Customer's internal business purposes.

1.3 Restrictions. Customer shall not: (a) sublicense, sell, resell, transfer, assign, or otherwise commercially exploit the Platform; (b) modify or make derivative works based upon the Platform; (c) reverse engineer the Platform; (d) access the Platform to build a competitive product or service.

ARTICLE 2: CUSTOMER DATA AND PRIVACY

2.1 Customer Data. As between the parties, Customer owns all Customer Data. Provider shall process Customer Data only as instructed by Customer and only as necessary to provide the Services.

2.2 Data Processing. The parties agree that the Data Processing Addendum attached as Exhibit A is incorporated into this MSA and governs the processing of any personal data included in Customer Data.

2.3 Security. Provider shall implement and maintain reasonable technical and organizational security measures designed to protect Customer Data against unauthorized access, disclosure, alteration, or destruction.

ARTICLE 3: FEES AND PAYMENT

3.1 Fees. Customer agrees to pay all fees specified in each Order Form. Fees are due net 30 from invoice date.

3.2 Taxes. Customer is responsible for all applicable taxes, excluding taxes based on Provider's income.

3.3 Disputed Invoices. If Customer disputes any invoice in good faith, Customer must notify Provider within 15 days of receipt.

ARTICLE 4: INTELLECTUAL PROPERTY

4.1 Platform IP. Provider retains all right, title, and interest in and to the Platform, including all modifications, enhancements, and derivative works thereof.

4.2 Customer IP. Customer retains all right, title, and interest in and to Customer Data and any Customer-owned materials provided to Provider.

4.3 Feedback. If Customer provides feedback, suggestions, or recommendations regarding the Platform, Provider may use such feedback without restriction or compensation to Customer.

ARTICLE 5: CONFIDENTIALITY

5.1 Confidential Information. Each party may disclose confidential information to the other in connection with this MSA. The receiving party shall protect the disclosing party's confidential information using at least the same degree of care used to protect its own confidential information, but in no event less than reasonable care.

ARTICLE 6: WARRANTIES AND DISCLAIMERS

6.1 Provider Warranty. Provider warrants that: (a) the Platform will perform materially in accordance with the Documentation; (b) Provider will not knowingly introduce malware into the Platform.

6.2 Disclaimer. EXCEPT AS EXPRESSLY SET FORTH IN SECTION 6.1, THE PLATFORM IS PROVIDED "AS IS" AND PROVIDER DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.

ARTICLE 7: LIMITATION OF LIABILITY

7.1 Exclusion of Consequential Damages. NEITHER PARTY SHALL BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES.

7.2 Cap on Liability. EACH PARTY'S TOTAL CUMULATIVE LIABILITY ARISING OUT OF OR RELATED TO THIS MSA SHALL NOT EXCEED THE FEES PAID OR PAYABLE BY CUSTOMER IN THE 12 MONTHS PRECEDING THE CLAIM.

ARTICLE 8: INDEMNIFICATION

8.1 By Provider. Provider shall defend Customer against any third-party claim that the Platform infringes a third-party patent, copyright, or trademark, and indemnify Customer against damages finally awarded in such claim.

8.2 By Customer. Customer shall defend Provider against any third-party claim arising from Customer's use of the Platform in breach of this MSA.

ARTICLE 9: TERM AND TERMINATION

9.1 Term. This MSA commences on the Effective Date and continues until terminated.

9.2 Termination for Breach. Either party may terminate this MSA if the other party materially breaches and fails to cure within 30 days of written notice.

9.3 Effect of Termination. Upon termination, all licenses granted hereunder shall terminate and Customer shall cease all use of the Platform.`,
  },
  {
    id: 'doc-004',
    filename: 'employment-agreement-cto.txt',
    type: 'Key Employee Retention Agreement',
    parties: 'Acme Corp ↔ Maria Rodriguez (CTO)',
    pages: 14,
    complexityScore: 7,
    tier: 'pro',
    tierRationale: 'Executive retention agreement with equity rollover, earnout participation, golden parachute provisions, and post-acquisition restrictive covenants. Requires Pro for compensation structure analysis and covenant enforceability assessment.',
    estimatedCostUsd: 0.000156,
    content: `EXECUTIVE RETENTION AND EMPLOYMENT AGREEMENT

This Executive Retention and Employment Agreement ("Agreement") is entered into as of the Closing Date of the acquisition of Beta Technologies, Inc. by Acme Corp, between Acme Corp ("Company") and Maria Rodriguez ("Executive").

1. POSITION AND DUTIES
Executive shall serve as Chief Technology Officer of Acme Corp's Enterprise AI Division. Executive shall report directly to the CEO of Acme Corp.

2. COMPENSATION
2.1 Base Salary. Company shall pay Executive an annual base salary of $425,000, payable in accordance with Company's normal payroll practices.

2.2 Annual Bonus. Executive is eligible for an annual cash bonus with a target of 40% of base salary, based on performance criteria established by the Board.

2.3 Equity. On the Closing Date, Executive shall receive:
(a) 180,000 RSUs vesting over 4 years (25% per year) with 1-year cliff;
(b) Performance shares with a maximum payout of 90,000 shares based on revenue targets.

2.4 Earnout Participation. Executive shall be entitled to 8% of any earnout payments made to former Beta stockholders, up to a maximum of $224,000 over the earnout period.

3. RETENTION BONUS
Executive shall receive a retention bonus of $500,000, payable as follows:
- $200,000 on the 6-month anniversary of the Closing Date
- $300,000 on the 18-month anniversary of the Closing Date

Subject to clawback if Executive voluntarily terminates employment or is terminated for cause.

4. BENEFITS
Executive shall be entitled to all standard executive benefits, including health insurance, 401(k) with company match, and annual executive physical.

5. TERMINATION

5.1 Without Cause or for Good Reason. If Company terminates Executive without cause, or Executive resigns for good reason:
- 18 months base salary (lump sum)
- Target bonus for the year of termination (pro-rated)
- Accelerated vesting of 50% of unvested RSUs
- 18 months continued health benefits

5.2 Change of Control. If Executive is terminated without cause within 24 months following a subsequent change of control:
- 24 months base salary
- Full bonus for year of termination
- Full accelerated vesting of all equity

6. RESTRICTIVE COVENANTS

6.1 Non-Competition. Executive agrees not to compete with Company's Enterprise AI business for a period of 18 months following termination of employment in the following states: California, New York, Texas, and Washington.

NOTE: California Business & Professions Code Section 16600 may render this provision unenforceable as to California activities. Legal counsel should review enforceability.

6.2 Non-Solicitation of Employees. Executive agrees not to solicit Company employees for a period of 24 months following termination.

6.3 Non-Solicitation of Customers. Executive agrees not to solicit Company customers for a period of 18 months following termination.

7. INTELLECTUAL PROPERTY
All inventions, discoveries, and work product created by Executive during employment that relate to Company's business shall be the exclusive property of Company. Executive hereby assigns all such IP to Company.`,
  },
  {
    id: 'doc-005',
    filename: 'ip-assignment-agreement.txt',
    type: 'IP Assignment Agreement',
    parties: 'Beta Technologies founders → Acme Corp',
    pages: 18,
    complexityScore: 8,
    tier: 'pro',
    tierRationale: 'Comprehensive IP assignment covering core ML models, training datasets, patent applications, and open-source license obligations. High complexity due to dataset provenance questions and third-party license entanglements.',
    estimatedCostUsd: 0.000189,
    content: `INTELLECTUAL PROPERTY ASSIGNMENT AND REPRESENTATION AGREEMENT

This Intellectual Property Assignment Agreement ("Agreement") is effective as of the Closing Date of the Acme Corp acquisition of Beta Technologies, Inc.

ARTICLE I: DEFINITIONS

"Assigned IP" means all Intellectual Property Rights owned or controlled by Beta or any Beta Founder as of the Closing Date that relates to the Beta Business.

"Beta Business" means the development, training, and commercialization of large language model inference optimization software and related services.

"Core ML Assets" means: (i) all trained model weights, including the BetaLM-7B, BetaLM-13B, and BetaLM-70B model families; (ii) all training datasets owned by Beta; (iii) all fine-tuning methodologies and associated code; (iv) all inference optimization algorithms.

ARTICLE II: ASSIGNMENT

2.1 Assignment. Each Founder and Beta hereby irrevocably assigns to Acme all right, title, and interest in and to the Assigned IP, including all Core ML Assets.

ARTICLE III: REPRESENTATIONS AND WARRANTIES

3.1 Ownership. Beta and Founders represent and warrant that:
(a) Beta is the sole and exclusive owner of the Assigned IP;
(b) The Assigned IP is free and clear of all liens, claims, and encumbrances;
(c) No third party has any claim to ownership of any Core ML Asset.

3.2 Training Data Representations. Beta represents that:
(a) All training datasets used to train the Core ML Assets were licensed or owned by Beta;
(b) Beta has not used any data scraped from websites in violation of their terms of service;
(c) The training data does not include any personal data that would require consent under GDPR or CCPA.

IMPORTANT LIMITATION: The representations in Section 3.2(c) are qualified by Beta's knowledge as of the Closing Date. Acquirer should conduct independent data provenance review.

3.3 Open Source License Obligations. Beta discloses the following open-source components incorporated into the Assigned IP:
- LLaMA 2: Licensed under Meta's Community License Agreement (non-commercial use restrictions apply)
- Transformers library: Apache 2.0 (no material restrictions)
- PyTorch: BSD-style license (no material restrictions)

RISK FLAG: The LLaMA 2 Community License restricts commercial use above 700M MAU. Current Beta customer base does not approach this threshold, but acquirer should review post-acquisition growth projections.

ARTICLE IV: PATENT APPLICATIONS

4.1 Pending Applications. The following patent applications are included in the Assigned IP:
- US Application 18/234,567: "Adaptive Token Batching for Large Language Model Inference" (pending)
- US Application 18/198,432: "Memory-Efficient Attention Mechanism for Extended Context Windows" (pending)
- PCT/US2025/043218: International filing for the above applications (pending)

4.2 Prosecution. Acme shall assume all obligations and costs for prosecution of the pending applications following the Closing Date.`,
  },
  {
    id: 'doc-006',
    filename: 'office-lease-assignment-sf.txt',
    type: 'Lease Assignment',
    parties: 'Beta Technologies → Acme Corp (landlord consent required)',
    pages: 8,
    complexityScore: 4,
    tier: 'flash',
    tierRationale: 'Standard commercial lease assignment with landlord consent requirement. No unusual provisions. Flash handles lease assignment classification and key term extraction efficiently.',
    estimatedCostUsd: 0.000062,
    content: `ASSIGNMENT AND ASSUMPTION OF LEASE

This Assignment and Assumption of Lease ("Assignment") is entered into as of the Closing Date of the Acme Corp acquisition.

BACKGROUND
Beta Technologies, Inc. ("Assignor") is the tenant under that certain Office Lease Agreement dated March 1, 2024, between Pacific Properties LLC ("Landlord") and Assignor, covering approximately 12,400 rentable square feet at 123 Market Street, Suite 400, San Francisco, California 94105 (the "Lease").

ASSIGNMENT
Assignor hereby assigns to Acme Corp ("Assignee") all of Assignor's right, title, and interest in and to the Lease, including all prepaid rent and security deposits.

ASSUMPTION
Assignee hereby assumes and agrees to perform all of Assignor's obligations under the Lease arising on or after the Assignment Date.

LANDLORD CONSENT
This Assignment is conditioned upon receipt of Landlord's written consent in the form attached as Exhibit A. Assignor shall use commercially reasonable efforts to obtain such consent within 30 days of the Closing Date.

LEASE TERMS (Summary)
- Monthly Base Rent: $89,280 (current)
- Annual Escalation: 3% per year
- Lease Expiration: February 28, 2027
- Security Deposit: $267,840 (3 months)
- Remaining Term: ~14 months as of Closing Date
- Renewal Options: One 3-year option at then-market rent

PERSONAL GUARANTEE
The personal guarantee of David Park in connection with the Lease is hereby released effective upon Landlord's consent to this Assignment.`,
  },
  {
    id: 'doc-007',
    filename: 'merger-acquisition-agreement.txt',
    type: 'Merger and Acquisition Agreement',
    parties: 'Acme Corp ↔ Beta Technologies ↔ Stockholders',
    pages: 84,
    complexityScore: 10,
    tier: 'pro',
    tierRationale: 'Principal acquisition agreement — the most complex document in the data room. Requires deep analysis of rep and warranty provisions, indemnification baskets and caps, closing conditions, MAC definition, and earnout mechanics.',
    estimatedCostUsd: 0.000847,
    content: `AGREEMENT AND PLAN OF MERGER

This Agreement and Plan of Merger ("Agreement") is entered into as of February 14, 2026, among Acme Corp, a Delaware corporation ("Parent"), Acme Merger Sub, Inc., a Delaware corporation and wholly owned subsidiary of Parent ("Merger Sub"), and Beta Technologies, Inc., a California corporation (the "Company").

ARTICLE I: THE MERGER

1.1 The Merger. Upon the terms and subject to the conditions of this Agreement, Merger Sub shall merge with and into the Company (the "Merger"), with the Company surviving as a wholly owned subsidiary of Parent.

1.2 Effective Time. The Merger shall become effective upon the filing of a certificate of merger with the Secretary of State of California (the "Effective Time").

ARTICLE II: CONVERSION OF SECURITIES

2.1 Conversion of Company Common Stock. Each share of Company Common Stock outstanding immediately prior to the Effective Time shall be converted into the right to receive:
(a) A pro rata portion of $35,000,000 in cash (the "Closing Cash Consideration"), less:
    (i) The Escrow Amount ($4,200,000)
    (ii) Transaction expenses as set forth in the Estimated Closing Statement
(b) The right to receive Earnout Payments as set forth in Article VI.

2.2 Treatment of Options. Each outstanding option to purchase Company Common Stock shall be cancelled and converted into the right to receive a cash payment equal to the excess of the Per Share Merger Consideration over the exercise price, net of applicable withholding.

ARTICLE III: REPRESENTATIONS AND WARRANTIES OF THE COMPANY

3.1 Organization and Qualification. The Company is duly incorporated, validly existing and in good standing under the laws of the State of California.

3.2 Capitalization. The authorized capital stock of the Company consists of: (i) 20,000,000 shares of Common Stock, of which 8,234,560 shares are issued and outstanding; (ii) 5,000,000 shares of Preferred Stock, of which 3,456,789 shares (Series A and B) are issued and outstanding.

3.3 No Conflicts. The execution of this Agreement and consummation of the Merger do not (a) violate any provision of the Company's certificate of incorporation or bylaws; (b) conflict with any material contract to which the Company is a party.

IMPORTANT EXCEPTION: Section 3.3(b) is subject to the following disclosed exceptions in Schedule 3.3(b): The enterprise SaaS MSA (Exhibit 3 to this Agreement) contains change of control notification requirements. Customer consent is required for assignment. Acquirer must review whether any customer has a termination right upon change of control.

3.4 Financial Statements. The audited financial statements for fiscal years 2023 and 2024 and the unaudited interim financials for the nine months ended September 30, 2025 (collectively, the "Financial Statements") have been prepared in accordance with GAAP and fairly present the financial condition of the Company.

3.5 Material Adverse Change. Since the date of the Most Recent Balance Sheet, the Company has not suffered any Material Adverse Effect.

"Material Adverse Effect" means any event, change, or condition that has had, or would reasonably be expected to have, a material adverse effect on the business, financial condition, assets, liabilities, or results of operations of the Company, taken as a whole, other than effects resulting from: (i) general economic, financial market, or geopolitical conditions; (ii) conditions affecting the AI software industry generally; (iii) actions taken by Parent or Merger Sub.

3.6 Intellectual Property. The Company owns or has the right to use all Intellectual Property material to the conduct of its business. The Core ML Assets do not infringe any third-party patent, copyright, or trade secret.

RISK FLAG: Rep 3.6 is limited by "to the Company's knowledge." Given the nascent state of ML model IP law and pending litigation regarding training data practices industry-wide, acquirer should consider requesting an expanded rep with specific carve-outs for known industry-wide claims.

ARTICLE IV: CLOSING CONDITIONS

4.1 Conditions to Parent's Obligations. Parent's obligation to consummate the Merger is conditioned upon:
(a) Accuracy of Company's representations and warranties in all material respects;
(b) Performance by Company of all covenants in all material respects;
(c) No Material Adverse Effect;
(d) Execution of retention agreements by Key Employees;
(e) Receipt of consent to the SaaS MSA assignment from customers accounting for at least 80% of trailing 12-month ARR.

4.2 Conditions to Company's Obligations. Company's obligation is conditioned upon:
(a) Accuracy of Parent's representations in all material respects;
(b) Performance by Parent of all covenants in all material respects.

ARTICLE V: INDEMNIFICATION

5.1 Indemnification by Stockholders. Stockholders shall indemnify Parent against Losses arising from:
(a) Any inaccuracy in Company's representations and warranties;
(b) Any breach of Company's covenants;
(c) Any Pre-Closing Tax Liabilities.

5.2 Indemnification Limitations.
(a) Deductible: No indemnification obligation until aggregate Losses exceed $420,000 (1% of deal value)
(b) Cap: Aggregate indemnification obligations shall not exceed $4,200,000 (Escrow Amount), except for Fundamental Reps (Cap = $21,000,000, or 50% of deal value)
(c) Survival: General reps survive for 18 months; Fundamental Reps (authority, capitalization, IP ownership) survive indefinitely.

ARTICLE VI: EARNOUT

6.1 Earnout Payments. Parent shall pay to Stockholders up to $2,800,000 in additional consideration based on:
(a) Year 1 Earnout: $1,400,000 if Beta Division Revenue ≥ $8,500,000 in calendar year 2026
(b) Year 2 Earnout: $1,400,000 if Beta Division Revenue ≥ $11,000,000 in calendar year 2027

6.2 Earnout Calculation. "Beta Division Revenue" means revenue attributable to the Beta product line as determined in accordance with GAAP.

POTENTIAL CONFLICT: The earnout revenue definition in Article VI uses a different revenue recognition standard than the financial representations in Section 3.4. Counsel should confirm consistent application.`,
  },
  {
    id: 'doc-008',
    filename: 'non-compete-founder-agreement.txt',
    type: 'Founder Non-Compete',
    parties: 'Acme Corp ↔ David Park (CEO) ↔ James Kim (VP Engineering)',
    pages: 7,
    complexityScore: 5,
    tier: 'flash',
    tierRationale: 'Founder non-compete and non-solicit with standard AI industry scope and duration. Complexity score 5 — Flash is appropriate with a focused review prompt for California enforceability risk.',
    estimatedCostUsd: 0.000054,
    content: `FOUNDER NON-COMPETITION AND NON-SOLICITATION AGREEMENT

This Agreement is entered into in connection with the acquisition of Beta Technologies, Inc. by Acme Corp.

PARTIES
David Park ("Park"), CEO and co-founder of Beta Technologies
James Kim ("Kim"), VP Engineering and co-founder of Beta Technologies
Acme Corp ("Company")

1. CONSIDERATION
Park and Kim are each receiving substantial deal consideration in connection with the acquisition. This Agreement is entered into in exchange for such consideration.

2. NON-COMPETITION

2.1 Restricted Activities. For a period of 24 months following the Closing Date, Park and Kim each agree not to, directly or indirectly:
(a) Engage in any business that develops, markets, or sells large language model inference optimization software competitive with the Beta product line;
(b) Hold any ownership interest in any such competing business (other than passive investments of less than 2%);
(c) Serve as an officer, director, employee, or consultant to any such competing business.

2.2 Geographic Scope. The restrictions in Section 2.1 apply worldwide.

2.3 California Law Notice. The parties acknowledge that California Business and Professions Code Section 16600 provides that every contract by which anyone is restrained from engaging in a lawful profession, trade, or business is void. The parties intend for this Agreement to be enforceable to the maximum extent permitted by applicable law, including any statutory exceptions that may apply to non-competes entered in connection with the sale of a business.

LEGAL NOTE: California courts have recognized a "sale of business" exception to Section 16600 under which non-competes may be enforced against selling shareholders. The enforceability of this provision should be evaluated by California counsel given the evolving state of the law.

3. NON-SOLICITATION

3.1 Employee Non-Solicitation. For 36 months following the Closing Date, Park and Kim each agree not to hire, solicit, or encourage any Company employee to leave their employment with Company.

3.2 Customer Non-Solicitation. For 24 months following the Closing Date, Park and Kim each agree not to solicit any customer of the Beta Division for a competing AI product.

4. REPRESENTATIONS
Each of Park and Kim represents that compliance with this Agreement will not cause financial hardship, given the substantial consideration received.

5. REMEDIES
The parties agree that breach of this Agreement would cause irreparable harm for which money damages would be inadequate, and that injunctive relief is an appropriate remedy.`,
  },
];

export const TOTAL_ESTIMATED_COST_USD = CONTRACTS.reduce((acc, c) => acc + c.estimatedCostUsd, 0);
export const PRO_DOCS = CONTRACTS.filter((c) => c.tier === 'pro');
export const FLASH_DOCS = CONTRACTS.filter((c) => c.tier === 'flash');
