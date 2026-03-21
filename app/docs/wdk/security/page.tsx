import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';
import { CommandPaletteBar } from '../_components/CommandPaletteBar';

const opsChecklist = [
  'Minimize stored payment metadata; never persist raw private keys or seed material.',
  'Store only necessary authorization artifacts (hash/nonce/expiry/audit refs) with strict retention.',
  'Redact wallet addresses and signatures in logs where full values are not required for debugging.',
  'Enforce replay protections (nonce, expiry, idempotency) before settlement execution.',
  'Separate signer, policy, and settlement responsibilities to reduce blast radius.',
  'Run monthly upstream WDK conformance reviews and publish validated_at / validated_by metadata.'
];

const privacyChecklist = [
  'Data classification: public-chain data vs sensitive app metadata vs user profile data.',
  'PII minimization in telemetry and support tooling.',
  'Retention windows documented per data class (events, receipts, audit logs).',
  'Deletion workflow for tenant-scoped metadata where legally required.',
  'Cross-border data handling and subprocessors review for hosted components.',
  'Incident response path for key-custody or signing-boundary anomalies.'
];

export default function WdkSecurityOpsPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <TopNav />
      <main className="max-w-5xl mx-auto py-16 px-6">
        <div className="border-b-2 border-black pb-6 mb-8">
          <p className="text-xs font-black uppercase tracking-widest text-neutral-500"><span className="font-mono">{">_"}</span> WDK Docs</p>
          <h1 className="text-5xl font-black uppercase italic tracking-tighter"><span className="heading-accent">Privacy & Security Operations.</span></h1>
          <p className="mt-3 font-semibold text-neutral-700">
            Public-facing operational guidance for running WDK + USDT0 integrations safely in production.
          </p>
        </div>

        <CommandPaletteBar />

        <section className="border-2 border-black p-5 mb-8">
          <h2 className="text-2xl font-black uppercase tracking-tight">Security Operations Baseline</h2>
          <ul className="list-disc pl-6 mt-3 text-sm font-semibold text-neutral-700 space-y-2">
            {opsChecklist.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>

        <section className="border-2 border-black p-5 mb-8 bg-neutral-50">
          <h2 className="text-2xl font-black uppercase tracking-tight">Privacy Operations Baseline</h2>
          <ul className="list-disc pl-6 mt-3 text-sm font-semibold text-neutral-700 space-y-2">
            {privacyChecklist.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>

        <section className="border-2 border-black p-5 bg-yellow-50">
          <h2 className="text-xl font-black uppercase">Release gates (must-pass)</h2>
          <ul className="list-disc pl-6 mt-2 text-sm font-semibold text-neutral-700 space-y-1">
            <li>Exact upstream WDK API surface mapping table is complete and reviewed.</li>
            <li>Claims review passed (no unsupported “first/native/official” language).</li>
            <li>Version pinning matrix published for WDK version, chains, auth modes, and known constraints.</li>
            <li>Security checklist attached to settlement strategy PRs with named reviewers.</li>
          </ul>
        </section>
      </main>
      <Footer />
    </div>
  );
}
