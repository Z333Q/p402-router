# P402 Meter — Implementation Map
## Healthcare Payer-Ops Version, Arc Hackathon, April 2026

---

## 1. Reused without modification

| Asset | Path | How used |
|---|---|---|
| Neo-brutalist design tokens | `app/globals.css`, `tailwind.config.ts` | All Meter UI inherits CSS vars and Tailwind mappings |
| AP2 policy engine | `lib/ap2-policy-engine.ts` | Budget verification in session pre-flight |
| ERC-8004 modules | `lib/erc8004/` | InheritedTrustStrip reads identity/reputation/validation |
| DB pool | `lib/db.ts` | All meter queries use the same Neon pool |
| ApiError / ApiErrorCode | `lib/errors.ts` | Meter API routes throw the same typed errors |
| A2A types (AP2Mandate) | `lib/a2a-types.ts` | Mandate issued at session creation |
| Decision trace / SSE | `lib/trace/decision-trace.ts` | Adapted for ledger SSE stream |
| Env validation | `lib/env.ts` | GOOGLE_API_KEY, CIRCLE_API_KEY already present |
| Next.js App Router config | `next.config.mjs`, `tsconfig.json` | No changes needed |

---

## 2. Reused with adapter changes

| Asset | Path | Change needed |
|---|---|---|
| Gemini intelligence | `lib/intelligence/gemini-optimizer.ts` | Extract Gemini client init + FunctionDeclaration pattern; new `lib/meter/work-order-parser.ts` wraps it with healthcare prompt |
| Session creation | `app/api/v2/sessions/route.ts` | New `/api/meter/sessions` calls same DB shape but adds `meter_work_order_id` to policies JSONB |
| Streaming chat | `app/api/v2/chat/completions/route.ts` | New `/api/meter/chat` strips multi-tenant auth; adds ledger event SSE emission on top of existing streaming pattern |
| `@google/generative-ai` | Already in `package.json` | Add `generateContent` with JSON response schema + function tools |

---

## 3. Brand new for this hackathon build

| Asset | Path | Description |
|---|---|---|
| Arc chain constants | `lib/chains/arc.ts` ✅ | Chain ID, USDC, ERC-8004/8183 on Arc, Gateway, explorer helpers |
| DB migration | `scripts/migrations/v2_017_meter_healthcare.sql` | `meter_work_orders`, `meter_packet_assets`, `nanopayment_events`, `arc_agents`, `arc_jobs` |
| Work-order parser service | `lib/meter/work-order-parser.ts` | Gemini function-calling wrapper; structured extraction for prior_auth_review |
| Meter types | `lib/meter/types.ts` | WorkOrder, PacketAsset, LedgerEvent, ProofRecord, ApprovalRecord, ReleaseState |
| Packet intake API | `app/api/meter/packet/route.ts` | Accept text/file, validate de-identification, persist PacketAsset |
| Work-order API | `app/api/meter/work-order/route.ts` | Call parser, persist WorkOrder, return tool trace |
| Chat/meter API (SSE) | `app/api/meter/chat/route.ts` | Stream review summary + emit ledger events via SSE |
| Trust API | `app/api/meter/trust/route.ts` | Return InheritedTrustSummary from ERC-8004 module |
| Release API | `app/api/meter/release/route.ts` | Optional ERC-8183 job creation / status |
| Zustand store | `app/meter/_store/useMeterStore.ts` | Session, packet, workOrder, messages, ledger, trust, release |
| Main demo page | `app/meter/page.tsx` | Full workflow layout |
| Layout | `app/meter/layout.tsx` | SafeModeBanner, TopNav, demo metadata |
| PacketIntakeCard | `app/meter/_components/PacketIntakeCard.tsx` | Upload + text entry, deidentified flag |
| WorkOrderCard | `app/meter/_components/WorkOrderCard.tsx` | Structured Gemini output |
| ReviewSummaryPane | `app/meter/_components/ReviewSummaryPane.tsx` | Streamed UM summary |
| LedgerPane | `app/meter/_components/LedgerPane.tsx` | Estimate → reconcile events |
| FrequencyCounter | `app/meter/_components/FrequencyCounter.tsx` | Authorizations / Batches / Avg cost |
| ArcProofDrawer | `app/meter/_components/ArcProofDrawer.tsx` | Arcscan links, batch refs |
| ApprovalDecisionCard | `app/meter/_components/ApprovalDecisionCard.tsx` | Budget/policy/scope status + Gemini recommendation |
| InheritedTrustStrip | `app/meter/_components/InheritedTrustStrip.tsx` | 4 chips from ERC-8004 |
| OptionalReleaseStrip | `app/meter/_components/OptionalReleaseStrip.tsx` | ERC-8183 release state |
| SafeModeBanner | `app/meter/_components/SafeModeBanner.tsx` | Env-gated banner |
| ComplianceBoundaryBanner | `app/meter/_components/ComplianceBoundaryBanner.tsx` | De-identified / admin only |
| Demo seed packets | `app/meter/_demo/packets/` | 2-3 stable prior-auth mock packets |
| Safe Mode replay data | `app/meter/_demo/safe-mode/` | Pre-captured ledger events + proof refs |
| About page | `app/meter/about/page.tsx` | One-page judge explanation |
| Trust page | `app/meter/trust/page.tsx` | P402 trust depth detail |
| Release page | `app/meter/release/[jobId]/page.tsx` | Optional Arc-native release view |

---

## 4. Explicitly out of scope

- Claims adjudication, diagnosis support, treatment recommendations
- Live PHI processing
- Multi-vertical platform surfaces (legal, compliance, etc.)
- Agent marketplace or Bazaar views
- Analytics dashboards
- Deep wallet-management UX
- Broad routing mode configuration
- Named prospect or client content
