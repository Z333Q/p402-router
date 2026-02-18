import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';
import { CommandPaletteBar } from '../_components/CommandPaletteBar';

const errors = [
  ['P402_QUOTE_EXPIRED', 'Quote TTL elapsed before signing', 'Re-request quote and prompt user to sign immediately'],
  ['P402_ROUTE_UNAVAILABLE', 'No viable route for requested constraints', 'Relax constraints or switch source asset preference'],
  ['P402_POLICY_BLOCKED_ROUTE', 'Policy engine denied selected route', 'Select policy-compliant route from quote options'],
  ['P402_SIGNATURE_REJECTED', 'User/agent declined signing request', 'Surface non-fatal retry action and preserve draft intent'],
  ['P402_AUTH_INVALID', 'Malformed/invalid authorization payload', 'Rebuild typed data from server intent and re-sign'],
  ['P402_INSUFFICIENT_BALANCE', 'Insufficient token balance for route', 'Offer fallback route or ask for top-up'],
  ['P402_SETTLEMENT_TIMEOUT', 'Settlement not finalized in SLA window', 'Poll settlement status with idempotency key'],
  ['P402_RECEIPT_UNAVAILABLE', 'Receipt generation delayed/unavailable', 'Retry receipt fetch with backoff; keep txHash visible'],
];

export default function WdkErrorCodesPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <TopNav />
      <main className="max-w-5xl mx-auto py-16 px-6">
        <div className="border-b-2 border-black pb-6 mb-8">
          <p className="text-xs font-black uppercase tracking-widest text-neutral-500">WDK Docs</p>
          <h1 className="text-5xl font-black uppercase italic tracking-tighter">Error Code Reference</h1>
          <p className="mt-3 font-semibold text-neutral-700">
            Stable error taxonomy for API responses, SDK exceptions, and UI recovery flows.
          </p>
        </div>

        <CommandPaletteBar />

        <div className="overflow-x-auto border-2 border-black">
          <table className="min-w-full text-left">
            <thead className="bg-black text-white text-xs uppercase tracking-widest">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Meaning</th>
                <th className="px-4 py-3">Recommended Recovery</th>
              </tr>
            </thead>
            <tbody>
              {errors.map(([code, meaning, recovery]) => (
                <tr key={code} className="border-t-2 border-black align-top">
                  <td className="px-4 py-3 text-xs font-black">{code}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-neutral-700">{meaning}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-neutral-700">{recovery}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="mt-8 border-2 border-black p-5 bg-neutral-50">
          <h2 className="text-lg font-black uppercase">HTTP Mapping Guidelines</h2>
          <ul className="list-disc pl-6 mt-2 text-sm font-semibold text-neutral-700 space-y-1">
            <li>Use 400 for malformed payload/auth failures, 409 for replay/idempotency conflicts, and 422 for policy denials.</li>
            <li>Use 503 when route liquidity is temporarily unavailable.</li>
            <li>Always include `code`, `message`, and optional `details` in error payloads.</li>
          </ul>
        </section>
      </main>
      <Footer />
    </div>
  );
}
