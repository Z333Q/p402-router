/**
 * Add-ons list (3AX §29.1 + §29.2).
 * Read by the pricing page; prices and inclusions locked to the source of truth.
 * The future cost-measurement module (3AX §29.2) is intentionally listed as
 * "not for sale" so the surface communicates the deferred posture without
 * making any cost-savings claim.
 */

export interface AddOn {
    readonly id: string;
    readonly name: string;
    readonly eligiblePlans: string;
    readonly price: string;
    readonly note?: string;
}

export const ADD_ONS: readonly AddOn[] = [
    {
        id: 'settlement',
        name: 'Settlement (Base, Tempo)',
        eligiblePlans: 'Business and above',
        price: 'Usage-based, 0.5% of settled value, $500/mo minimum',
        note: 'Optional; not a precondition for accountability.',
    },
    {
        id: 'audit-retention',
        name: 'Advanced audit retention',
        eligiblePlans: 'Business and above',
        price: '$1,000/mo per extra year of retention',
    },
    {
        id: 'warehouse-export',
        name: 'Data warehouse export',
        eligiblePlans: 'Business and above',
        price: '$500/mo (Snowflake, BigQuery, Redshift)',
        note: 'Includes pipeline maintenance.',
    },
    {
        id: 'private-deploy',
        name: 'Private deployment design',
        eligiblePlans: 'Enterprise',
        price: 'Starting at $50,000 engagement fee',
        note: 'Design only; ongoing operation is contracted separately.',
    },
    {
        id: 'procurement-pack',
        name: 'Procurement pack',
        eligiblePlans: 'Scale and Enterprise',
        price: 'Included on request',
        note: 'Standardized procurement-response artifacts.',
    },
    {
        id: 'dedicated-support',
        name: 'Dedicated support',
        eligiblePlans: 'Scale and Enterprise',
        price: 'From $2,000/mo (Scale); custom on Enterprise',
        note: 'Named engineer plus Slack response SLA.',
    },
    {
        id: 'regulated-evidence',
        name: 'Regulated evidence pack',
        eligiblePlans: 'Regulated Enterprise',
        price: 'Included on request',
        note: 'Vendor questionnaire, evidence artifacts, BAA path after security and contracting review.',
    },
    {
        id: 'optimize-review',
        name: 'Optimize Readiness review',
        eligiblePlans: 'Business and above',
        price: '$5,000 per quarterly engagement',
        note: 'Founder-led review of readiness signals.',
    },
];

export const COST_MEASUREMENT_MODULE_NOTE =
    'A future cost-measurement module is on the roadmap. It is not for sale today. There is no success fee, no revenue share, and no cost-savings claim until baseline, approved change, and post-period measurement are all in place.';

export function AddOnsList() {
    return (
        <section className="bg-white border-y-2 border-neutral-200">
            <div className="max-w-6xl mx-auto px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    <div>
                        <h2 className="text-3xl font-black text-black uppercase tracking-tight">Add-ons</h2>
                    </div>
                    <div className="lg:col-span-2 text-sm font-mono text-neutral-700 leading-relaxed">
                        Optional modules priced per use case. None are required to run P402&apos;s accountability layer.
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {ADD_ONS.map((a) => (
                        <div key={a.id} className="border-2 border-neutral-200 p-4 bg-white">
                            <div className="text-xs font-black uppercase tracking-widest text-black mb-1">{a.name}</div>
                            <div className="text-[11px] font-mono text-neutral-500 mb-3">{a.eligiblePlans}</div>
                            <div className="text-xs font-mono text-neutral-800 mb-2">{a.price}</div>
                            {a.note && <div className="text-[11px] font-mono text-neutral-600 leading-snug">{a.note}</div>}
                        </div>
                    ))}
                </div>
                <div className="mt-8 border-2 border-dashed border-neutral-300 bg-neutral-50 p-5">
                    <div className="text-[11px] font-black uppercase tracking-widest text-neutral-500 mb-2">
                        Future module
                    </div>
                    <div className="text-sm font-mono text-neutral-800">{COST_MEASUREMENT_MODULE_NOTE}</div>
                </div>
            </div>
        </section>
    );
}
