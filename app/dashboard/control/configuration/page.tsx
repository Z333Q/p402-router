import Link from 'next/link';

import { ConfigurationForm } from './_components/ConfigurationForm';

/**
 * Slice 3S — Control · Configuration.
 *
 * Tenant-level Control defaults. Read-only when the viewer is not the
 * tenant owner; editable for the tenant owner and global admins.
 *
 * Slice 3S persists these values but DOES NOT wire them into the runtime
 * budget-guard, DOES NOT alter the Control simulator, and DOES NOT change
 * any other product surface. Runtime and simulator wire-ups are deferred
 * to later approved slices.
 */
export const dynamic = 'force-dynamic';

export default function ControlConfigurationPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">
                        Dashboard / Control / Configuration
                    </div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-black leading-none">
                        Configuration
                    </h1>
                    <p className="text-neutral-600 font-medium mt-2 max-w-xl">
                        Tenant-level Control defaults. Sets the baseline budget, allowed models, allowed task types, max cost per request, and human-review threshold. Tenant owners and global admins can save changes.
                    </p>
                </div>
                <Link
                    href="/dashboard/control"
                    className="inline-flex items-center h-10 px-5 border-2 border-black font-black text-[11px] uppercase tracking-wider hover:bg-neutral-50 transition-colors no-underline shrink-0"
                >
                    Back to Control
                </Link>
            </div>

            <ConfigurationForm />

            <div
                className="border-2 border-black p-5 bg-neutral-50 space-y-2"
                data-testid="control-configuration-scope-footer"
            >
                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                    What this saves, and what it does not affect
                </div>
                <ul className="text-[13px] text-neutral-700 font-medium space-y-1 list-disc ml-5">
                    <li>This saves tenant-level Control defaults.</li>
                    <li>This does not affect runtime budget-guard enforcement in this slice.</li>
                    <li>This does not affect the Control simulator in this slice.</li>
                    <li>
                        This does not change Optimize, Settle, Publish, Prove, billing, checkout, pricing, Trust Center, or runtime privacy behavior.
                    </li>
                    <li>Runtime and simulator wiring require later approved slices.</li>
                </ul>
            </div>
        </div>
    );
}
