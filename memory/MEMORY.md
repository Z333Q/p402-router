# P402 Router Memory

## Admin Dashboard
- See [admin-dashboard.md](admin-dashboard.md) — full admin console: auth, roles, pages, API routes, env vars

## Build Error Patterns
- See [build-fixes.md](build-fixes.md) for common build error patterns and fixes

## Key Architecture Notes
- Next.js 15 with strict TypeScript (`noUncheckedIndexedAccess`, `strictNullChecks`)
- Ethers v6 installed (NOT v5) — use `ethers.Provider`, `ethers.keccak256`, `ethers.AbiCoder.defaultAbiCoder()`, etc.
- Viem for frontend blockchain interactions (wagmi hooks)
- `cloudflare-facilitator/` is a separate project — must be excluded from tsconfig
- `lib/db.ts` exports a **default** export, not named `{ db }`. `query()` does NOT accept generics — cast rows manually
- `ApiErrorCode` is a strict union type in `lib/errors.ts` — custom codes must be added there first
- `app/dashboard/_components/ui.tsx` has custom `Input`/`Select` with `onChange?: (value: string) => void` (not React event)
- Treasury (deployed): `0xFa772434DCe6ED78831EbC9eeAcbDF42E2A031a6` — matches both deployed contracts
- Facilitator hot wallet (signer, NOT treasury): `0xB23f146251E3816a011e800BCbAE704baa5619Ec`
- USDC on Base: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- P402Settlement: `0xd03c7ab9a84d86dbc171367168317d6ebe408601`
- SubscriptionFacilitator: `0xc64747651e977464af5bce98895ca6018a3e26d7`

## CDP Agentic Wallet Integration (completed)
- `lib/cdp-client.ts`: lazy async init — use `getCdpClientAsync()` (not `getCdpClient()`) everywhere; dynamic import prevents @solana/kit ESM from breaking Next.js build
- `lib/cdp-server-wallet.ts`: `getOrProvisionAgentWallet()` + `createSessionSpendingPolicy()` + `recordCdpWallet()`; policy API is `cdp.policies.createPolicy()` (not `cdp.createPolicy()`)
- CDP policy enum values: `action: 'reject'|'accept'`, `operation: 'signEvmTransaction'`, `criteria.type: 'ethValue'`, `operator: '>'`
- `lib/x402/facilitator-wallet.ts`: Mode A=CDP TEE (CDP_SERVER_WALLET_ENABLED=true), Mode B=raw private key; cast `walletClient as WalletClient, publicClient as PublicClient` to satisfy viem type widening
- `components/auth/CDPEmailAuth.tsx`: Step type = `'email'|'otp'|'connecting'|'confirmed'`; `signInWithEmail()` returns `{ flowId }`, pass `{ flowId, otp }` to `verifyEmailOTP()`; uses `useAccount()` from wagmi to get address in confirmed step
- `app/providers.tsx`: `CDPHooksProvider` from `@coinbase/cdp-hooks` (NOT `@coinbase/cdp-core`)
- `__tests__/setup.ts`: mock `@/lib/cdp-client` directly (not raw SDK) — exports `getCdpClientAsync`, `getCdpClient`, `isCdpEnabled`, `_resetCdpClient`
- CDP Project ID: `81080910-ed18-480f-8633-70289ef0baac` (in `.env.example` + `NEXT_PUBLIC_CDP_PROJECT_ID`)
- Onboarding is now 4 steps: Role → API Key → Fund Wallet → Orientation
- `ApiErrorCode` now includes `CDP_POLICY_DENIED`

## CDP ↔ AP2 ↔ ERC-8004 Wiring (completed)
- Session creation (`app/api/v2/sessions/route.ts`): when `wallet_source=cdp` + `agent_id` present, auto-inserts `ap2_mandates` row and stores `ap2_mandate_id` in `policies` JSONB; ERC-8004 wallet link fires if `ERC8004_ENABLE_VALIDATION=true` and agent_id is numeric
- Auto-pay (`app/api/v1/router/auto-pay/route.ts`): session query now fetches `policies, agent_id` via `session_token` (not `id`); pre-flight `verifyMandate()` → 403 on failure; post-settlement: `recordUsage()` + `budget_spent_usd` increment + `queueFeedback()`; all non-blocking
- Backwards compatible: sessions without `ap2_mandate_id` skip mandate check entirely
- TypeScript pattern: capture `string | null` narrowed value in `const addr: string` before closure (not `as string` cast)
- E2E spec: `tests/e2e/cdp-ap2-erc8004-wiring.spec.ts`

## Partner Program (Phase 1 complete)
- See [project-partner-program.md](project-partner-program.md) for full details, file inventory, and what to build next
- DB: `v2_016_partner_core.sql` + `v2_017_partner_attribution.sql` (run these to activate)
- Auth: partner context in NextAuth JWT — `partnerId`, `partnerRole`, `partnerGroupIds` in session
- Permissions: `lib/partner/permissions.ts` — role → PartnerPermission[] bundles (single source of truth)
- Public: `/partners` landing, `/partners/apply` form
- Partner portal: `/partner` (layout + overview), `/partner/links`, etc.
- Phase 2 next: link generator, `/r/[code]` click tracker, attribution attach on signup

## Roadmap
- See [project-roadmap-v3.md](project-roadmap-v3.md) for all phases, sequencing, and Phase 1 (World AgentKit) deliverables
- See [phase1-foundation-complete.md](phase1-foundation-complete.md) for Foundation phase completion details (receipt scheme, EIP-3009, mock removal)
- See [phase1-world-agentkit-complete.md](phase1-world-agentkit-complete.md) for Phase 1 World AgentKit completion (server, SDK, CLI, MCP, Skill)
- See [phase2-complete.md](phase2-complete.md) for Phase 2 completion (Reputation, Mandate Bridge, Sentinel, Dashboard UX, Playground, Docs)
- See [phase3-complete.md](phase3-complete.md) for Phase 3 completion (P402Escrow.sol, escrow service, REST API, Bazaar auto-escrow, evidence bundles)

## ERC-8004 Integration
- `lib/erc8004/` module: types, abis, identity-client, reputation-client, feedback-service, validation-client, validation-guard, reputation-cache
- Identity Registry (Base): `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- Reputation Registry (Base): `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`
- Testnet Identity: `0x8004A818BFB912233c491871b3d84c89A494BD9e`, Reputation: `0x8004B663056A597Dffe9eCcC1965A193B7388713`
- Viem `writeContract` requires explicit `account` and `chain` params (strict typing in v2.42+)
- Feature flags: `ERC8004_ENABLE_REPUTATION`, `ERC8004_ENABLE_VALIDATION`, `ERC8004_TESTNET`
- DB migration: `scripts/migrations/005_erc8004_trustless_agents.sql`
- Registration script: `scripts/register-erc8004.ts` (run with `npx tsx`)
