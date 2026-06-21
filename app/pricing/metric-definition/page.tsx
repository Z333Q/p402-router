import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";
import Link from "next/link";

export const metadata = {
    title: 'Metered AI Event Definition | P402',
    description: 'The metered AI event definition that drives P402 billing. Counts unique provider-bound, meter-only, or policy-evaluated AI request events per tenant.',
    alternates: { canonical: 'https://p402.io/pricing/metric-definition' },
    openGraph: {
        title: 'Metered AI Event Definition | P402',
        description: 'The billing metric definition referenced by every P402 order form and contract.',
        url: 'https://p402.io/pricing/metric-definition',
    },
};

export default function MetricDefinitionPage() {
    return (
        <main className="min-h-screen bg-white">
            <TopNav />

            <section className="max-w-3xl mx-auto px-6 lg:px-8 pt-16 pb-16">
                <p className="text-[11px] font-mono uppercase tracking-widest text-neutral-500 mb-4">
                    Rate card v1 · Contract appendix
                </p>
                <h1 className="text-4xl lg:text-5xl font-black text-black uppercase tracking-tight leading-[1] mb-8">
                    Metered AI event definition
                </h1>

                <div className="space-y-8 text-sm font-mono text-neutral-800 leading-relaxed">
                    <section>
                        <h2 className="text-xl font-black text-black uppercase tracking-tight mb-3">Definition</h2>
                        <p>
                            A <strong>metered AI event</strong> is one unique provider-bound, meter-only, or policy-evaluated AI request event recorded by P402 for a customer tenant during the billing period.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-black text-black uppercase tracking-tight mb-3">What counts as a metered AI event</h2>
                        <p>The following are billable when recorded:</p>
                        <ol className="list-decimal pl-6 mt-3 space-y-2">
                            <li><strong>Hosted AI request through P402.</strong> A request that traverses the P402 router and is forwarded to a provider (OpenAI, Anthropic, Google, Cohere, OpenRouter, etc.).</li>
                            <li><strong>Meter-only event submitted by SDK or API.</strong> A request the customer makes directly to a provider where the SDK or API posts the event metadata to P402 for ledger purposes.</li>
                            <li><strong>Policy-evaluated AI event.</strong> A request whose policy was evaluated by P402&apos;s Control surface, including shadow-mode decisions, whether or not the request was forwarded.</li>
                            <li><strong>Settled AI work event.</strong> A request that is settled via P402&apos;s facilitator for an AI service the customer purchased through P402.</li>
                            <li><strong>Retry event when unique and customer-caused.</strong> A retry triggered by the customer&apos;s application where the retry has a distinct event id.</li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-xl font-black text-black uppercase tracking-tight mb-3">What does not count</h2>
                        <p>The following are explicitly excluded:</p>
                        <ul className="list-disc pl-6 mt-3 space-y-2">
                            <li><strong>Dashboard views.</strong> Looking at your usage does not cost.</li>
                            <li><strong>Outcome-only records.</strong> Posting outcomes never counts as an event.</li>
                            <li><strong>Duplicate replay with the same event id.</strong> Idempotent replay is free.</li>
                            <li><strong>Internal heartbeat.</strong> Health-check pings from P402 to providers are not customer-attributable.</li>
                            <li><strong>Support action.</strong> A P402 staff member querying customer data for support is not a billable event.</li>
                            <li><strong>Billing sync.</strong> Billing-system sync activity is not metered.</li>
                            <li><strong>Admin audit action.</strong> A customer admin reading the audit log is not a billable event.</li>
                            <li><strong>Failed auth request before tenant resolution.</strong> If we can&apos;t identify the tenant, we cannot bill the tenant.</li>
                            <li><strong>Test fixture events.</strong> Events written from a tenant flagged as a test tenant are excluded by query.</li>
                            <li><strong>Synthetic QA events.</strong> Events written by the P402 QA harness against an enrolled tenant are excluded by tenant id.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-black text-black uppercase tracking-tight mb-3">Counting rules</h2>
                        <ol className="list-decimal pl-6 mt-3 space-y-2">
                            <li><strong>Unique event id.</strong> Each metered event has a stable event id; the ledger deduplicates on tenant id plus request id.</li>
                            <li><strong>One event per unique attempt.</strong> Retries with a distinct event id count; replays with the same id do not.</li>
                            <li><strong>No double-counting across schemes.</strong> A request that is hosted and policy-evaluated counts once.</li>
                            <li><strong>No fractional events.</strong> Events are integers.</li>
                            <li><strong>No backdated invoices.</strong> Late-arriving events past the 72-hour settlement window are billed in the next invoice period as a debit line.</li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-xl font-black text-black uppercase tracking-tight mb-3">Disputed usage window</h2>
                        <p>
                            Customers may dispute usage within <strong>30 days of invoice date</strong>. Disputes are resolved against the ledger and the audit exports. Resolved disputes either credit the invoice (if the ledger shows over-counting) or stand (if the ledger shows correct counting).
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-black text-black uppercase tracking-tight mb-3">Metric versioning</h2>
                        <p>
                            This definition is <strong>metered AI event v1</strong>, effective 2026-06-21. Future versions are committed alongside contract amendments. Customer contracts reference the version in force at signing; the version does not change mid-term without written amendment.
                        </p>
                    </section>
                </div>

                <div className="mt-12 pt-8 border-t-2 border-neutral-200">
                    <Link
                        href="/pricing"
                        className="inline-flex items-center gap-2 text-sm font-black text-black uppercase tracking-wide border-b-2 border-black hover:text-primary hover:border-primary"
                    >
                        ← Back to pricing
                    </Link>
                </div>
            </section>

            <Footer />
        </main>
    );
}
