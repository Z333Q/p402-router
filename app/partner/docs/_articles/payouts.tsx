import React from 'react'
import type { ArticleContent } from '../[slug]/page'

// ---------------------------------------------------------------------------
// Payout & Commission FAQ — 4 articles
// ---------------------------------------------------------------------------

export const payoutArticles: Record<string, ArticleContent> = {

  // -------------------------------------------------------------------------
  // 1. Commission Calculation
  // -------------------------------------------------------------------------
  'commission-calculation': {
    title: 'Commission calculation',
    category: 'Payout & Commission FAQ',
    categorySlug: 'payouts',
    updatedAt: 'April 2025',
    body: (
      <>
        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          Commissions are calculated on <strong>net invoice amount</strong> — the gross
          subscription price charged to the referred customer. They are never calculated on
          routing volume, x402 settlement throughput, usage fees, or any other revenue P402
          earns from operating the platform.
        </div>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          What triggers a commission
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          A commission entry is created whenever all three of the following conditions are met:
        </p>
        <ul className="space-y-2 text-sm text-neutral-700 list-none mt-3">
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>
              A new tenant signs up via your referral link (cookie last-touch within the
              90-day attribution window) or via a registered lead / deal approval (Track B
              and Track C).
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>
              The tenant completes their <strong>first paid subscription invoice</strong> —
              a Stripe <code>checkout.session.completed</code> or{' '}
              <code>invoice.payment_succeeded</code> event on a Pro or Enterprise plan.
              Free trials do not generate commissions.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>
              Each subsequent monthly renewal within the <strong>12-month commission
              window</strong> from the customer's first paid invoice date generates
              an additional commission entry at the same rate.
            </span>
          </li>
        </ul>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Commission rates by track
        </h2>
        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Track</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Type</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Rate</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Duration</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Attribution</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-bold">A</td>
              <td className="border border-neutral-200 px-3 py-2">Developer Affiliate</td>
              <td className="border border-neutral-200 px-3 py-2 font-bold">20%</td>
              <td className="border border-neutral-200 px-3 py-2">12 months</td>
              <td className="border border-neutral-200 px-3 py-2">Cookie last-touch, 90-day window</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-bold">B</td>
              <td className="border border-neutral-200 px-3 py-2">Agency / Integration</td>
              <td className="border border-neutral-200 px-3 py-2 font-bold">25%</td>
              <td className="border border-neutral-200 px-3 py-2">12 months</td>
              <td className="border border-neutral-200 px-3 py-2">Registered lead or cookie last-touch</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-bold">C</td>
              <td className="border border-neutral-200 px-3 py-2">Enterprise Referral</td>
              <td className="border border-neutral-200 px-3 py-2 font-bold">10%</td>
              <td className="border border-neutral-200 px-3 py-2">12 months (year-one)</td>
              <td className="border border-neutral-200 px-3 py-2">Deal registration required</td>
            </tr>
          </tbody>
        </table>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          The calculation formula
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Commission = Net Invoice Amount × Rate
        </p>
        <p className="text-sm text-neutral-700 leading-relaxed mt-2">
          Net invoice amount equals the gross subscription price invoiced to the customer.
          For a $49/mo Pro plan, the net invoice is <strong>$49.00</strong>. P402 does not
          deduct Stripe processing fees, platform overhead, or any other costs before
          applying the commission rate.
        </p>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Worked example 1 — Track A: 5 Pro referrals
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          A Track A partner refers 5 customers who all sign up for Pro ($49/mo) in the same
          month. Rate: 20%. All 5 customers remain subscribed for all 12 months.
        </p>
        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Month</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Customers active</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Gross invoiced</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Commission (20%)</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Running total</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['1', '5', '$245.00', '$49.00', '$49.00'],
              ['2', '5', '$245.00', '$49.00', '$98.00'],
              ['3', '5', '$245.00', '$49.00', '$147.00'],
              ['4', '5', '$245.00', '$49.00', '$196.00'],
              ['5', '5', '$245.00', '$49.00', '$245.00'],
              ['6', '5', '$245.00', '$49.00', '$294.00'],
              ['7', '5', '$245.00', '$49.00', '$343.00'],
              ['8', '5', '$245.00', '$49.00', '$392.00'],
              ['9', '5', '$245.00', '$49.00', '$441.00'],
              ['10', '5', '$245.00', '$49.00', '$490.00'],
              ['11', '5', '$245.00', '$49.00', '$539.00'],
              ['12', '5', '$245.00', '$49.00', '$588.00'],
            ].map(([month, customers, gross, comm, running]) => (
              <tr key={month}>
                <td className="border border-neutral-200 px-3 py-2">{month}</td>
                <td className="border border-neutral-200 px-3 py-2">{customers}</td>
                <td className="border border-neutral-200 px-3 py-2">{gross}</td>
                <td className="border border-neutral-200 px-3 py-2 font-bold">{comm}</td>
                <td className="border border-neutral-200 px-3 py-2">{running}</td>
              </tr>
            ))}
            <tr className="bg-neutral-50">
              <td className="border border-neutral-200 px-3 py-2 font-black" colSpan={3}>Total earned over 12 months</td>
              <td className="border border-neutral-200 px-3 py-2 font-black">$588.00</td>
              <td className="border border-neutral-200 px-3 py-2 font-black">—</td>
            </tr>
          </tbody>
        </table>
        <p className="text-sm text-neutral-700 leading-relaxed">
          At month 13, commission entries stop for all 5 of these customers. The customers
          remain attributed in the system but generate no further commissions. To grow
          recurring earnings, refer new customers.
        </p>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Worked example 2 — Track B: 3 clients, 2 upgrade mid-year
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          A Track B Agency partner registers 3 clients in month 1. All start on Pro ($49/mo).
          At month 7, Client B and Client C upgrade to Enterprise ($499/mo). Rate: 25%.
        </p>
        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          When a customer upgrades, the commission rate and track stay fixed from when they
          were first attributed. The commission base changes to reflect the new invoice
          amount immediately. Track B partners earn 25% on the Enterprise invoice from the
          month of upgrade onward — the 12-month window continues from the original
          first-payment date.
        </div>
        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Month</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Client A (Pro)</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Client B</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Client C</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Monthly commission (25%)</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['1–6', 'Pro $49', 'Pro $49', 'Pro $49', '$36.75 × 6 = $220.50'],
              ['7–12', 'Pro $49', 'Enterprise $499', 'Enterprise $499', '$12.25 + $124.75 + $124.75 = $261.75 × 6 = $1,570.50'],
            ].map(([months, a, b, c, comm]) => (
              <tr key={months}>
                <td className="border border-neutral-200 px-3 py-2 font-bold">{months}</td>
                <td className="border border-neutral-200 px-3 py-2">{a}</td>
                <td className="border border-neutral-200 px-3 py-2">{b}</td>
                <td className="border border-neutral-200 px-3 py-2">{c}</td>
                <td className="border border-neutral-200 px-3 py-2 font-bold">{comm}</td>
              </tr>
            ))}
            <tr className="bg-neutral-50">
              <td className="border border-neutral-200 px-3 py-2 font-black" colSpan={4}>Total over 12 months</td>
              <td className="border border-neutral-200 px-3 py-2 font-black">$1,791.00</td>
            </tr>
          </tbody>
        </table>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Note: months 1–6 calculation: 3 clients × $49 × 25% = $36.75/mo. Months 7–12:
          Client A ($49 × 25% = $12.25) + Client B ($499 × 25% = $124.75) + Client C
          ($499 × 25% = $124.75) = $261.75/mo. After month 12 (from each client's
          respective first-payment date), commission entries cease for that client.
        </p>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Worked example 3 — Track C: $50,000/yr Enterprise deal
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          A Track C partner registers a deal. The closed-won Enterprise contract is invoiced
          annually at $50,000/yr. Rate: 10%. Commission window: 12 months of entries from
          revenue recognition date.
        </p>
        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          Enterprise deals may be invoiced annually or in monthly installments depending on
          the contract. Commission entries are created per invoice event. For a $50,000
          annual invoice paid upfront, a single commission entry of $5,000 is created.
          For a $4,166.67/mo equivalent invoiced monthly, 12 entries of $416.67 are created.
          The example below shows both scenarios.
        </div>
        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Scenario</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Invoice structure</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Commission entries</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Commission per entry</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Total year-one</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-neutral-200 px-3 py-2">Annual upfront</td>
              <td className="border border-neutral-200 px-3 py-2">1 × $50,000</td>
              <td className="border border-neutral-200 px-3 py-2">1</td>
              <td className="border border-neutral-200 px-3 py-2 font-bold">$5,000.00</td>
              <td className="border border-neutral-200 px-3 py-2 font-bold">$5,000.00</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2">Monthly installments</td>
              <td className="border border-neutral-200 px-3 py-2">12 × $4,166.67</td>
              <td className="border border-neutral-200 px-3 py-2">12</td>
              <td className="border border-neutral-200 px-3 py-2 font-bold">$416.67</td>
              <td className="border border-neutral-200 px-3 py-2 font-bold">$5,000.00</td>
            </tr>
          </tbody>
        </table>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Track C commissions are limited to year-one net software revenue. If the customer
          renews at year two, no further commission entries are generated for the same deal.
          A separate new deal registration is required for any expansion contract treated as
          a new commercial transaction.
        </p>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          What commissions are NOT calculated on
        </h2>
        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span><strong>Usage/routing fees:</strong> P402 earns margin on LLM routing decisions. This is not included in the commission base.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span><strong>x402 settlement volume:</strong> The gross USDC throughput settled on-chain is not commission-eligible revenue.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span><strong>One-time setup or onboarding fees:</strong> If P402 charges a one-time professional services fee, it is excluded from the commission base unless explicitly confirmed in your partner agreement.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span><strong>Stripe processing fees:</strong> Payment processing costs are not deducted before calculating your commission, but they are also not an additional commission base. Your commission is on the subscription line item only.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span><strong>Taxes collected:</strong> Any sales tax or VAT collected from the customer is excluded from the net invoice amount for commission purposes.</span>
          </li>
        </ul>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          The 12-month cap
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          After 12 calendar months from a referred customer's first paid invoice date,
          commission entries stop for that customer. The customer remains attributed to you
          in the system — P402 maintains the attribution record — but no new commission
          entries are generated beyond month 12.
        </p>
        <p className="text-sm text-neutral-700 leading-relaxed mt-3">
          This is intentional design. The program is structured to reward active partner
          engagement. Partners who continuously refer new customers earn significantly more
          than partners relying on a single long-term referral. Plan your pipeline
          accordingly.
        </p>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Multiple attribution — who wins?
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          If a customer touched multiple partner referral paths before converting, P402
          resolves attribution using the following priority order (highest priority first):
        </p>
        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Priority</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Attribution type</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Applies to</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-bold">1 (highest)</td>
              <td className="border border-neutral-200 px-3 py-2">Deal registration (approved)</td>
              <td className="border border-neutral-200 px-3 py-2">Track C, Track B registered deals</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-bold">2</td>
              <td className="border border-neutral-200 px-3 py-2">Registered lead (accepted)</td>
              <td className="border border-neutral-200 px-3 py-2">Track B</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-bold">3 (lowest)</td>
              <td className="border border-neutral-200 px-3 py-2">Cookie last-touch (90-day window)</td>
              <td className="border border-neutral-200 px-3 py-2">Track A, Track B (no registered lead)</td>
            </tr>
          </tbody>
        </table>
        <p className="text-sm text-neutral-700 leading-relaxed">
          A deal registration always wins over cookie attribution, regardless of which
          cookie was set most recently. A registered lead beats a cookie. Within the same
          tier, the valid attribution present at the time of the first invoice event wins —
          there is no split commission between partners.
        </p>
        <div className="border-2 border-error px-4 py-3 text-sm text-error font-medium my-4">
          Self-referrals are detected and result in immediate commission decline and possible
          account review. Do not refer your own organization, subsidiaries, or accounts
          you control.
        </div>
      </>
    ),
  },

  // -------------------------------------------------------------------------
  // 2. Hold Period Rules
  // -------------------------------------------------------------------------
  'hold-period-rules': {
    title: 'Hold period rules',
    category: 'Payout & Commission FAQ',
    categorySlug: 'payouts',
    updatedAt: 'April 2025',
    body: (
      <>
        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          Every commission entry is subject to a <strong>30-day hold period</strong> before
          it enters the finance review queue. The hold exists to protect against fraud,
          trial abuse, and chargebacks. It is non-negotiable and applies to every commission
          entry on every track.
        </div>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Why the hold exists
        </h2>
        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span><strong>Fraud and trial abuse prevention:</strong> Some bad actors sign up, trigger commission events, and then immediately chargeback or violate terms. The hold period ensures commissions are not paid before the transaction has proven to be legitimate.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span><strong>Chargeback surfacing:</strong> Stripe chargebacks typically surface within 5–15 business days of a payment. The 30-day hold gives adequate time for chargebacks to appear before we approve commissions.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span><strong>Industry standard:</strong> A 30-day hold is standard practice across SaaS affiliate programs. It does not reflect any distrust of individual partners — it is a baseline program protection that applies universally.</span>
          </li>
        </ul>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          What starts the hold timer
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          The 30-day hold timer starts at the <strong>revenue recognition date</strong> —
          the timestamp when Stripe fires a confirmed <code>invoice.payment_succeeded</code>{' '}
          or <code>checkout.session.completed</code> event. This is not the referral
          click date, not the account signup date, and not the trial start date. It is
          specifically the moment Stripe confirms the payment as successful.
        </p>
        <p className="text-sm text-neutral-700 leading-relaxed mt-3">
          Example: If a customer clicks your referral link on March 1, signs up for a trial
          on March 5, and completes their first payment on March 6, the hold timer starts
          on <strong>March 6</strong> and the hold lifts on <strong>April 5</strong>.
        </p>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Commission status during the hold
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          While a commission entry is in the hold period, its status is{' '}
          <strong>pending</strong>. In your partner dashboard (Commissions tab), pending
          entries are visible with their hold_until date. Pending entries do not contribute
          to payout batches. They are informational only.
        </p>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          What happens after the hold
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          When the hold period ends, the commission entry automatically moves from{' '}
          <strong>pending</strong> to the <strong>review queue</strong>. The P402 finance
          team reviews queued entries within <strong>5 business days</strong>. Two outcomes
          are possible:
        </p>
        <ul className="space-y-2 text-sm text-neutral-700 list-none mt-3">
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span><strong>Approved:</strong> Status changes to <em>approved</em>. The entry is included in the next scheduled payout batch (processed on the 15th of the following month).</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span><strong>Declined:</strong> Status changes to <em>declined</em>. You receive an email notification with the reason. Declined entries do not roll over or reenter the review queue.</span>
          </li>
        </ul>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Grounds for decline
        </h2>
        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Reason</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Description</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Chargeback', 'A payment dispute was filed on the referred payment before review completed.'],
              ['Fraud indicators', 'The referred account shares device fingerprint, IP, or billing info with your partner account — indicating a potential self-referral or coordinated fraud.'],
              ['ToS violation', 'The referred customer was found to have violated P402 Terms of Service, resulting in account suspension or termination.'],
              ['Self-referral', 'Referral attributed to an account you own, control, or are otherwise affiliated with.'],
              ['Invalid attribution', 'Attribution was found to be manipulated — e.g. cookie stuffing, forced redirects, or misrepresented referral paths.'],
              ['Deal registration mismatch', 'Track C only: deal registration details do not match the closed-won contract.'],
            ].map(([reason, desc]) => (
              <tr key={reason}>
                <td className="border border-neutral-200 px-3 py-2 font-bold whitespace-nowrap">{reason}</td>
                <td className="border border-neutral-200 px-3 py-2">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Grounds for reversal (post-approval)
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Even after a commission is approved, it can be <strong>reversed</strong> if
          new information surfaces. Reversed commissions are deducted from your next payout
          batch. If there is no pending batch balance to absorb the deduction, a negative
          balance carries forward until it is offset by future approved commissions.
        </p>
        <ul className="space-y-2 text-sm text-neutral-700 list-none mt-3">
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>A chargeback is received on the underlying payment after commission approval.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>The referred customer is identified as a fraudulent actor post-approval.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>An error in commission calculation is corrected (overpayment adjustment).</span>
          </li>
        </ul>
        <div className="border-2 border-error px-4 py-3 text-sm text-error font-medium my-4">
          Reversal does not require P402 to claw back previously paid USDC or wire transfers.
          Reversed amounts are always offset against future payout batches. P402 does not
          initiate direct debit or demand payment from partners for reversed commissions.
        </div>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Practical earnings calendar — full timeline example
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Here is the complete timeline for a customer who signs up on March 1:
        </p>
        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Date</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Event</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Commission status</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['March 1', 'Customer clicks referral link, signs up', '—'],
              ['March 6', 'Customer pays first Pro invoice ($49)', 'pending — hold starts'],
              ['March 6', 'Commission entry created ($49 × 20% = $9.80)', 'pending (hold_until: April 5)'],
              ['April 5', 'Hold period ends (30 days from March 6)', 'Enters review queue'],
              ['~April 8–10', 'Finance review completes — approved', 'approved'],
              ['April 30', 'Cutoff for April approved-commissions batch', 'Included in April batch'],
              ['May 15', 'Payout batch executed', 'in_payout → paid'],
            ].map((row) => {
              const [d, ev, st] = row as [string, string, string]
              return (
                <tr key={d + ev}>
                  <td className="border border-neutral-200 px-3 py-2 font-bold whitespace-nowrap">{d}</td>
                  <td className="border border-neutral-200 px-3 py-2">{ev}</td>
                  <td className="border border-neutral-200 px-3 py-2">{st}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="text-sm text-neutral-700 leading-relaxed">
          A customer's March 6 first payment results in a payout on May 15 — approximately
          10 weeks from the payment event. This is the minimum timeline when everything
          proceeds without delays.
        </p>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Frequently asked questions
        </h2>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">
          Can I appeal a declined commission?
        </h3>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Yes. Email <strong>payouts@p402.io</strong> with your partner ID, the commission
          entry ID, and the basis for your appeal. Appeals are reviewed by the finance team
          within 5 business days. If the decline was due to an error on our part, the
          commission will be reinstated. If the decline was due to confirmed fraud or a
          policy violation, the decision is final.
        </p>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">
          What if the hold period ends on a weekend or holiday?
        </h3>
        <p className="text-sm text-neutral-700 leading-relaxed">
          The hold timer is calendar-day based, not business-day based. If day 30 falls on
          a Saturday, the commission enters the review queue on Saturday. Finance reviews
          are processed on the next business day. There is no extension to the hold period
          for weekends or holidays.
        </p>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">
          Does the hold apply to every monthly payment or just the first?
        </h3>
        <p className="text-sm text-neutral-700 leading-relaxed">
          The hold applies to <strong>every commission entry</strong> — including each
          monthly renewal payment within the 12-month window. Month 2, month 3, and all
          subsequent months each generate a separate commission entry, each subject to
          its own 30-day hold from that specific payment's revenue recognition date.
        </p>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">
          Is there a chargeback rate threshold that triggers additional review?
        </h3>
        <p className="text-sm text-neutral-700 leading-relaxed">
          P402 does not publish a specific chargeback rate threshold. Any chargeback on a
          referred payment triggers review of that specific commission entry. There is no
          blanket chargeback rate at which a partner account is suspended — individual
          events are evaluated on their merits.
        </p>
      </>
    ),
  },

  // -------------------------------------------------------------------------
  // 3. Tax Form Requirements
  // -------------------------------------------------------------------------
  'tax-form-requirements': {
    title: 'Tax form requirements',
    category: 'Payout & Commission FAQ',
    categorySlug: 'payouts',
    updatedAt: 'April 2025',
    body: (
      <>
        <div className="border-2 border-error px-4 py-3 text-sm text-error font-medium my-4">
          No payout occurs without an approved tax profile. This applies without exception
          to all partners on all tracks, regardless of payout amount or payout method.
          Submit your tax form immediately after your partner application is approved.
        </div>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          US partners — Form W-9
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          All US persons — individuals (sole proprietors, freelancers) and US entities
          (LLCs, corporations, partnerships) — must submit a completed{' '}
          <strong>Form W-9</strong> before their first payout batch.
        </p>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">
          What the W-9 collects
        </h3>
        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span><strong>Legal name:</strong> Your full legal name (individuals) or the legal name of your entity.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span><strong>Business name (DBA):</strong> If your operating name differs from your legal name.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span><strong>Taxpayer Identification Number (TIN):</strong> SSN for individuals; EIN for entities.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span><strong>Address:</strong> Your mailing address for tax correspondence.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span><strong>Entity type:</strong> Individual/sole proprietor, LLC, C corporation, S corporation, partnership, trust, or other.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span><strong>Signature:</strong> Certifying that the TIN is correct and you are not subject to backup withholding.</span>
          </li>
        </ul>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">
          How to submit
        </h3>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Partner dashboard → Settings → Tax Profile. You can complete the W-9 form
          directly in the dashboard (digital submission) or upload a signed PDF. Both
          methods are accepted. Do not email your W-9 — use the dashboard only.
        </p>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">
          Form 1099-NEC issuance
        </h3>
        <p className="text-sm text-neutral-700 leading-relaxed">
          P402 issues a <strong>Form 1099-NEC</strong> to US partners whose total
          commissions paid in a calendar year exceed <strong>$600.00</strong>. The 1099-NEC
          is delivered electronically to your partner dashboard by January 31 of the
          following year and filed with the IRS. Partners earning less than $600/year do
          not receive a 1099-NEC but are still responsible for self-reporting their income.
        </p>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Non-US partners — Form W-8BEN or W-8BEN-E
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Partners outside the United States must certify their foreign status and (where
          applicable) claim treaty benefits to reduce withholding on commission payments.
        </p>
        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Partner type</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Required form</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-neutral-200 px-3 py-2">Individual / sole proprietor</td>
              <td className="border border-neutral-200 px-3 py-2 font-bold">W-8BEN</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2">Entity (company, LLC, partnership, corporation)</td>
              <td className="border border-neutral-200 px-3 py-2 font-bold">W-8BEN-E</td>
            </tr>
          </tbody>
        </table>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">
          Withholding rates
        </h3>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Without a valid W-8 form on file, P402 is required to withhold{' '}
          <strong>30%</strong> of all commission payments and remit them to the IRS. With
          a valid W-8 that claims a tax treaty benefit, the withholding rate may be
          reduced. Common rates by country:
        </p>
        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Country</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Treaty withholding rate (services income)</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Treaty article (approximate)</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['United Kingdom', '0%', 'Article 7 (Business Profits)'],
              ['Canada', '0%', 'Article VII (Business Profits)'],
              ['Germany', '0%', 'Article 7 (Business Profits)'],
              ['Australia', '0%', 'Article 7 (Business Profits)'],
              ['France', '0%', 'Article 7 (Business Profits)'],
              ['Netherlands', '0%', 'Article 7 (Business Profits)'],
              ['India', '15%', 'Article 12 (Royalties / FIS)'],
              ['China', '10%', 'Article 11/12'],
              ['Brazil', '15%', 'Limited treaty — verify with tax advisor'],
              ['Singapore', '0%', 'Article 7 (Business Profits)'],
              ['Japan', '0%', 'Article 7 (Business Profits)'],
              ['No treaty', '30%', '—'],
            ].map(([country, rate, article]) => (
              <tr key={country}>
                <td className="border border-neutral-200 px-3 py-2 font-bold">{country}</td>
                <td className="border border-neutral-200 px-3 py-2">{rate}</td>
                <td className="border border-neutral-200 px-3 py-2 text-neutral-500 text-[11px]">{article}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          Treaty rates shown are for services income (business profits / independent
          personal services). The applicable article and rate depend on the nature of the
          income and the treaty's specific terms. These are reference figures only —
          confirm your applicable rate with a qualified tax advisor.
        </div>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">
          How to submit
        </h3>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Same process as W-9: Partner dashboard → Settings → Tax Profile. Select your
          form type (W-8BEN or W-8BEN-E), complete all fields including the treaty claim
          section if applicable, and submit. Upload a signed PDF if you prefer.
        </p>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          What "approved" means
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          P402 finance reviews submitted tax forms within <strong>3 business days</strong>.
          Common rejection reasons:
        </p>
        <ul className="space-y-2 text-sm text-neutral-700 list-none mt-3">
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>Missing or illegible signature</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>Wrong form type (e.g., W-8BEN submitted for an entity — should be W-8BEN-E)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>TIN/EIN does not match IRS records</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>Missing country of residence for foreign partners</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>Form is outdated (W-8 forms expire after 3 years — ensure you use the current IRS version)</span>
          </li>
        </ul>
        <p className="text-sm text-neutral-700 leading-relaxed mt-3">
          You will receive an email notification when your form is approved or if
          resubmission is required. Payout batches are held until the tax profile status
          is <strong>approved</strong>. Commissions continue to accumulate in approved
          status — they are not forfeited — but they cannot be paid out.
        </p>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Updating your tax profile
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          If your tax status changes — you form an LLC, change your entity type, relocate
          to a different country, or marry and change your legal name — you must submit a
          new tax form before your next payout batch. Your previous tax profile is
          superseded immediately upon approval of the new form. Do not wait until year-end.
        </p>

        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          <strong>Disclaimer:</strong> The information in this article reflects P402's
          program-specific requirements for collecting tax documentation. It is not tax,
          legal, or financial advice. Your actual tax obligations depend on your specific
          circumstances, country of residence, entity structure, and applicable treaties.
          Consult a qualified tax professional for guidance specific to your situation.
        </div>
      </>
    ),
  },

  // -------------------------------------------------------------------------
  // 4. Payout Timeline
  // -------------------------------------------------------------------------
  'payout-timeline': {
    title: 'Payout timeline',
    category: 'Payout & Commission FAQ',
    categorySlug: 'payouts',
    updatedAt: 'April 2025',
    body: (
      <>
        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          P402 processes payout batches once per month, on the <strong>15th of the month</strong>{' '}
          following the approval month. All commissions that reach{' '}
          <strong>approved</strong> status by the last calendar day of month M are included
          in the batch processed on the 15th of month M+1.
        </div>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          The monthly payout cycle
        </h2>
        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Step</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">When</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Detail</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Commission approved', 'Anytime during month M (after hold + review)', 'Status: approved'],
              ['Batch cutoff', 'Last calendar day of month M (23:59 UTC)', 'All approved commissions locked into batch'],
              ['Batch execution', '15th of month M+1', 'P402 executes all payout methods simultaneously'],
              ['USDC settlement', '15th of M+1, within ~2 minutes', 'On-chain transfer on Base mainnet — txHash visible in dashboard'],
              ['Stripe Connect', '15th of M+1 + 2–5 business days', 'Stripe transfer initiation to connected bank'],
              ['PayPal / Wise', '15th of M+1 + 3–7 business days', 'Third-party transfer initiation'],
            ].map(([step, when, detail]) => (
              <tr key={step}>
                <td className="border border-neutral-200 px-3 py-2 font-bold">{step}</td>
                <td className="border border-neutral-200 px-3 py-2">{when}</td>
                <td className="border border-neutral-200 px-3 py-2">{detail}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Payout method comparison
        </h2>
        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Method</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Currency</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Settlement time</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Processing fee</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-bold">USDC on Base</td>
              <td className="border border-neutral-200 px-3 py-2">USDC</td>
              <td className="border border-neutral-200 px-3 py-2">~1–2 minutes</td>
              <td className="border border-neutral-200 px-3 py-2 font-bold">None</td>
              <td className="border border-neutral-200 px-3 py-2">On-chain txHash provided. Gas paid by P402.</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-bold">Stripe Connect</td>
              <td className="border border-neutral-200 px-3 py-2">USD</td>
              <td className="border border-neutral-200 px-3 py-2">2–5 business days</td>
              <td className="border border-neutral-200 px-3 py-2">Stripe standard rates</td>
              <td className="border border-neutral-200 px-3 py-2">Requires connected Stripe account.</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-bold">PayPal</td>
              <td className="border border-neutral-200 px-3 py-2">USD</td>
              <td className="border border-neutral-200 px-3 py-2">3–7 business days</td>
              <td className="border border-neutral-200 px-3 py-2">PayPal standard rates</td>
              <td className="border border-neutral-200 px-3 py-2">Fees deducted from payout amount.</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-bold">Wise</td>
              <td className="border border-neutral-200 px-3 py-2">USD / local</td>
              <td className="border border-neutral-200 px-3 py-2">3–7 business days</td>
              <td className="border border-neutral-200 px-3 py-2">Wise standard rates</td>
              <td className="border border-neutral-200 px-3 py-2">Best option for international partners who want local currency.</td>
            </tr>
          </tbody>
        </table>
        <p className="text-sm text-neutral-700 leading-relaxed">
          USDC on Base is the recommended payout method. It is the fastest, has zero
          processing fees, and the on-chain transaction is verifiable by the partner
          independently. All payout amounts are denominated in USD and converted to USDC
          at 1:1 at time of execution.
        </p>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Worked timeline — March referral through May payout
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Track A partner refers a customer who signs up March 5 and pays their first Pro
          invoice on March 6. Commission rate: 20% × $49 = <strong>$9.80</strong>.
        </p>
        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Date</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Event</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Commission status</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Amount</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['March 5', 'Customer signs up via referral link', '—', '—'],
              ['March 6', 'Customer pays first Pro invoice', 'pending', '$9.80'],
              ['March 6', 'Commission entry created; hold timer starts', 'pending (hold_until: April 5)', '$9.80'],
              ['April 5', '30-day hold period ends', 'Enters review queue', '$9.80'],
              ['~April 8', 'Finance review: approved', 'approved', '$9.80'],
              ['April 30', 'April batch cutoff (23:59 UTC)', 'Locked in April batch', '$9.80'],
              ['May 15', 'Batch executed — USDC sent on Base', 'in_payout → paid', '$9.80 USDC'],
            ].map((row) => {
              const [d, ev, st, amt] = row as [string, string, string, string]
              return (
                <tr key={d + ev}>
                  <td className="border border-neutral-200 px-3 py-2 font-bold whitespace-nowrap">{d}</td>
                  <td className="border border-neutral-200 px-3 py-2">{ev}</td>
                  <td className="border border-neutral-200 px-3 py-2">{st}</td>
                  <td className="border border-neutral-200 px-3 py-2 font-bold">{amt}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Total elapsed time from March 6 (payment date) to May 15 (payout): approximately
          69 days. This is the minimum payout timeline when all steps proceed without
          delay.
        </p>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Minimum payout threshold and rollover
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          The minimum payout threshold is <strong>$25.00 USD</strong> per batch. If your
          total approved commission balance is below $25.00 at batch cutoff, your balance
          rolls over to the following month's batch. This continues until your balance
          reaches or exceeds $25.00.
        </p>
        <p className="text-sm text-neutral-700 leading-relaxed mt-3">
          <strong>Rollover example:</strong>
        </p>
        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Month</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">New approved commissions</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Running balance</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Meets $25 threshold?</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Payout on 15th</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['January', '$9.80', '$9.80', 'No', 'Rolls over'],
              ['February', '$9.80', '$19.60', 'No', 'Rolls over'],
              ['March', '$9.80', '$29.40', 'Yes', '$29.40 paid on April 15'],
            ].map(([month, newComm, balance, threshold, payout]) => (
              <tr key={month}>
                <td className="border border-neutral-200 px-3 py-2 font-bold">{month}</td>
                <td className="border border-neutral-200 px-3 py-2">{newComm}</td>
                <td className="border border-neutral-200 px-3 py-2">{balance}</td>
                <td className="border border-neutral-200 px-3 py-2">{threshold}</td>
                <td className="border border-neutral-200 px-3 py-2 font-bold">{payout}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Rolled-over balances are never forfeited. They accumulate indefinitely until the
          threshold is met. No action is required from the partner — rollover is automatic.
        </p>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Commission entry statuses — reference
        </h2>
        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Status</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Meaning</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Action required</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['pending', 'Commission created; 30-day hold in progress', 'None — wait for hold to lift'],
              ['approved', 'Hold lifted, finance review passed; queued for next batch', 'None — will be paid in next batch if threshold met'],
              ['in_payout', 'Batch executing; transfer initiated', 'None'],
              ['paid', 'Payout confirmed (USDC: txHash available; Stripe/PayPal/Wise: transfer confirmed)', 'None'],
              ['declined', 'Finance review rejected the commission entry', 'Review decline reason in dashboard; contact payouts@p402.io to appeal'],
              ['reversed', 'Previously approved commission clawed back (chargeback or fraud)', 'Deducted from next batch; contact payouts@p402.io if you believe this is in error'],
            ].map(([status, meaning, action]) => (
              <tr key={status}>
                <td className="border border-neutral-200 px-3 py-2 font-bold font-mono">{status}</td>
                <td className="border border-neutral-200 px-3 py-2">{meaning}</td>
                <td className="border border-neutral-200 px-3 py-2">{action}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Checking your payout status
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Partner dashboard → <strong>Payouts</strong> tab. You will see:
        </p>
        <ul className="space-y-2 text-sm text-neutral-700 list-none mt-3">
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>Batch history: each executed batch with date, total amount, payout method, and status.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>Individual commission entries: status, hold_until date (if pending), and amount.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>On-chain transaction hash: for USDC payouts, the Base mainnet txHash is linked so you can verify the transfer directly on Basescan.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>Current pending balance: total commissions in hold or review, not yet eligible for payout.</span>
          </li>
        </ul>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          What can delay a payout
        </h2>
        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Delay reason</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">How to resolve</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Tax form not approved (most common)', 'Submit W-9 / W-8BEN / W-8BEN-E through dashboard immediately. Allow 3 business days for review.'],
              ['Payout method not configured', 'Dashboard → Settings → Payout Method. Add your USDC wallet address, Stripe Connect account, PayPal email, or Wise email.'],
              ['Below $25 minimum threshold', 'No action needed. Balance rolls over automatically until threshold is met.'],
              ['Commission still in hold period', 'No action needed. Wait for the hold_until date to pass.'],
              ['Commission under review (finance queue)', 'Finance reviews within 5 business days of hold lifting. No action needed unless that window has passed.'],
              ['Batch execution failure (rare)', 'Partner manager is notified immediately. You will receive an email. Affected commissions are rescheduled to the next available batch at no penalty.'],
            ].map(([reason, resolution]) => (
              <tr key={reason}>
                <td className="border border-neutral-200 px-3 py-2 font-bold">{reason}</td>
                <td className="border border-neutral-200 px-3 py-2">{resolution}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Contact for payout issues
        </h2>
        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          Email <strong>payouts@p402.io</strong> with the following in your message:
          your <strong>Partner ID</strong> (found in dashboard → Settings → Account),
          the <strong>Batch ID</strong> or <strong>Commission Entry ID</strong> in question,
          and a description of the issue. Response within <strong>2 business days</strong>.
        </div>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Do not contact general support for payout issues — route all payout and commission
          questions directly to payouts@p402.io to reach the finance team.
        </p>
      </>
    ),
  },
}
