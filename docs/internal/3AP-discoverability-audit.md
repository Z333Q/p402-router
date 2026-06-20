# 3AP: Discoverability Audit

**Status:** read-only audit + one-line Twitter handle fix.
**Predecessor:** none in the discoverability track.
**Successor:** to be decided. Aggressive overhaul is deferred until repositioning launch.

## TL;DR

Technical SEO plumbing is largely correct. The visibility gap is mostly **off-page** (low domain authority, no backlinks, no PR), and one **on-page canonical mismatch** that quietly hurts every branded query.

Two issues are real and concrete enough to act on:

1. **Twitter/X handle was wrong everywhere.** Fixed in this commit.
2. **Apex (`p402.io`) → `www.p402.io` is a 307 (temporary) redirect, and the canonical/sitemap/metadataBase all point at the apex.** Google sees a brand that points its canonical at a URL that immediately redirects away. This is the single highest-leverage on-page fix.

Everything else is fine, missing, or off-page.

## What is already correct (do not touch)

- `app/robots.ts`: explicitly allow GPTBot, ChatGPT-User, ClaudeBot, anthropic-ai, PerplexityBot, cohere-ai, Omgilibot, YouBot, Diffbot, AI2Bot, CCBot. Standard crawlers blocked from `/dashboard/`, `/api/v1/`, `/api/v2/`, `/api/auth/`, `/api/internal/`.
- `app/sitemap.ts`: 80+ URLs across product, docs, intelligence research, meter verticals, SEO landing pages.
- `public/llms.txt` and `public/llms-full.txt`: published, structured for LLM ingestion.
- `app/layout.tsx`: `metadataBase`, full OpenGraph block, Twitter card, JSON-LD Organization with `knowsAbout`, `sameAs`, `hasOfferCatalog`.
- `app/opengraph-image.tsx`: dynamic OG image route.
- A `talentapp:project_verification` meta tag is present and should be left alone unless that service is no longer in use.
- Per-page metadata on `/`, `/meter`, `/trust`, `/pricing`, `/developers/quickstart`, `/docs` — every public page tested in 3AO returned a unique, branded `<title>`.

## What was wrong and is now fixed (this commit)

| Where | Before | After |
|---|---|---|
| `app/layout.tsx` (twitter.site) | `@p402_io` | `@p402io` |
| `app/layout.tsx` (JSON-LD `sameAs`) | `https://twitter.com/p402_io` | `https://x.com/p402io` |
| `app/page.tsx` (twitter.site) | `@p402_io` | `@p402io` |
| `public/llms.txt` | `https://twitter.com/p402_io` | `https://x.com/p402io` |
| `claude-skills-files/llms.txt` | `https://twitter.com/p402_io` | `https://x.com/p402io` |

The X handle `@p402io` is what `app/partner/docs/_articles/compliance.tsx` already documented as the canonical brand handle, and what `README.md` already linked. Everything is consistent now.

## Top finding — canonical / apex / www split

Observable today (verified via `curl -sI`):

- `https://p402.io` returns `HTTP/2 307` with `location: https://www.p402.io/`.
- `https://www.p402.io` returns `HTTP/2 200`.
- `app/layout.tsx` declares `metadataBase: new URL('https://p402.io')` and `alternates.canonical: 'https://p402.io'`.
- `app/sitemap.ts` emits `https://p402.io/...` URLs.
- `public/robots.txt` (production) declares `sitemap: https://p402.io/sitemap.xml`.

Why it matters:

1. Google sees the brand's declared canonical at the apex, which immediately 307s away. The 307 is **temporary**, so Google does not consolidate ranking signals onto either host. A 301 would; a 307 won't.
2. Every internal sitemap URL goes through the same redirect on first crawl, wasting crawl budget and diluting authority.
3. Twitter/X uses canonical + OpenGraph URL to dedupe link previews. Canonical → 307 → mismatch is one of the standard reasons cards "don't render right" on first share.
4. Branded queries for "p402.io" land on whichever host Google last indexed, which may be neither.

Recommended fix (one of two; do not do both):

- **Option A (preferred):** make the apex canonical. Change the Vercel/DNS config so `https://p402.io` serves the site (no redirect) and `https://www.p402.io` 301-redirects to the apex. This matches every URL in code today. Code change: zero. DNS/Vercel change: one rule.
- **Option B:** make `www` canonical. Update `metadataBase` → `https://www.p402.io`, `alternates.canonical` → `https://www.p402.io`, `app/sitemap.ts` `baseUrl` → `https://www.p402.io`, `app/robots.ts` `sitemap` → `https://www.p402.io/sitemap.xml`, JSON-LD `url` and `sameAs`, all hard-coded references in metadata throughout the app. Then make the apex permanently (301) redirect to www. Heavier code change but matches the live server today.

Either is fine. Pick the one that matches operational reality first.

## Brand ambiguity (off-page, not on-page)

"P402" is a generic-looking token. Competing meanings in the wild:

- HTTP 402 Payment Required (the protocol you build on top of).
- French chess opening notation.
- Electrical part numbers / industrial SKUs.

Implication: a query like `P402` without context is unwinnable for a young domain. **Branded queries** (`p402.io`, `p402 ai`, `p402 router`, `p402 payment`) are winnable but require either domain authority or zero-click answers (e.g., LLM citations). Until you have either, Google has no reason to elevate the brand against the noise.

This is the part where "SEO is mostly off-page." See §"What 3AP does not fix" below.

## Article URL structure

You have substantial long-form content but no `/blog` or `/articles` index:

- `/intelligence/research/x402-standard`
- `/intelligence/research/ap2-mandates`
- `/intelligence/research/verifiable-compute`
- `/intelligence/research/flash-crash-protection`
- `/intelligence/research/economics-of-latency`
- `/intelligence/research/black-friday-swarm`
- `/intelligence/research/medical-data-heist`
- `/intelligence/research/supply-chain-miracle`
- `/intelligence/agentic-orchestration`
- `/intelligence/machine-governance`
- `/intelligence/protocol-economics`
- `/intelligence/sentinel-layer`

All twelve are in the sitemap. Buyers, journalists, and LLMs expect to find this content at a discoverable index URL. Two cheap moves to consider before the big repositioning:

- Add a thin `/intelligence` index page (if not already present) that lists the twelve with one-line abstracts.
- Mirror or alias the same listing at `/articles` or `/blog` so that "what does the P402 team write about" has an obvious URL. No content duplication needed — the canonical can stay at `/intelligence/*`; the alias can be a simple `<Link>` index.

Not shipped in this commit. Flagging for the repositioning sprint.

## Schema.org coverage

You have Organization JSON-LD with `knowsAbout`, `sameAs`, and `hasOfferCatalog`. That is the bare minimum for an org card in SERPs. To make the long-form content eligible for rich results, the articles would each need `Article` or `TechArticle` JSON-LD (`@type`, `headline`, `datePublished`, `author`, `image`). Not present today.

Cheap to add later, per article. Not urgent until the canonical fix lands.

## Indexation status (operator action, not a code change)

Cannot be verified from inside the repo. The operator should:

- Submit `https://www.p402.io/sitemap.xml` to Google Search Console (after picking apex vs www in §"Top finding").
- Check Coverage report for "Discovered – currently not indexed" and "Crawled – currently not indexed" buckets.
- Check `site:p402.io` in Google. If it returns < ~10 results for a site of this size, the issue is not on-page; it is index status.
- Submit the same sitemap to Bing Webmaster Tools.
- Verify Twitter/X card via `https://cards-dev.twitter.com/validator` for `https://www.p402.io/` and one article URL.

## What 3AP does not fix (intentionally)

Discoverability is mostly off-page work. The following are deferred to the repositioning launch:

- Backlinks from credible AI/payments/infra outlets.
- Founder/team mentions on podcasts, Substacks, X threads.
- Press release distribution for any of the three slices already shipped (3AB-3AN are independently newsworthy).
- Product Hunt launch (the site already preloads a Product Hunt widget image, suggesting an existing or planned launch — confirm before re-launching).
- Glossary / definitional pages targeting unbranded terms ("what is x402", "AI spend governance", "agentic payments"). Strong LLM citation candidates.
- Comparison pages ("P402 vs Stripe agents", "P402 vs Helicone", etc.). Strong intent capture.
- LinkedIn company page with regular long-form posts.
- DevTo / Hashnode / Medium cross-posting of `/intelligence/research/*` with canonical pointing home.

All of the above are launch-readiness items, not technical fixes.

## What shipped in this commit

- All five Twitter/X handle references corrected to `@p402io` / `https://x.com/p402io`.
- This audit document.

Nothing else changed. The canonical/apex fix is **flagged but not shipped** because it depends on a DNS/Vercel decision the audit cannot make alone. Once you choose apex or www, the code edit takes ten minutes.
