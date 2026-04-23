import React from 'react'
import type { ArticleContent } from '../[slug]/page'

// ---------------------------------------------------------------------------
// Compliance article module — 4 articles
// ---------------------------------------------------------------------------

export const complianceArticles: Record<string, ArticleContent> = {

  // ─────────────────────────────────────────────────────────────────────────
  // 1. FTC / ASA Disclosure Guide
  // ─────────────────────────────────────────────────────────────────────────
  'ftc---asa-disclosure-guide': {
    title: 'FTC / ASA Disclosure Guide',
    category: 'Compliance',
    categorySlug: 'compliance',
    updatedAt: 'April 2025',
    body: (
      <div className="space-y-6">

        <p className="text-sm text-neutral-700 leading-relaxed">
          As a P402 affiliate partner you receive commission on referred subscriptions. That
          financial relationship is a <strong>material connection</strong> under both US FTC
          and UK ASA rules. You must disclose it — clearly and conspicuously — every time you
          publish promotional content. This guide tells you exactly how.
        </p>

        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          <strong>TL;DR for experienced affiliates:</strong> disclose at the top of every
          piece of content, in the same visual field as the recommendation, using plain
          language or #ad. The rest of this guide gives you exact copy for each channel.
        </div>

        {/* ── FTC ── */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          FTC Requirements (United States)
        </h2>

        <p className="text-sm text-neutral-700 leading-relaxed">
          The FTC's <em>Endorsement Guides</em> (16 C.F.R. Part 255, updated 2023) require
          that any material connection between an endorser and a brand be disclosed
          whenever the endorsement appears. Receiving affiliate commission qualifies as a
          material connection.
        </p>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">
          What "clear and conspicuous" means
        </h3>
        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span><strong>Visible without scrolling or clicking.</strong> Disclosure buried in a footer, a collapsed section, or behind a hyperlink ("*see disclosure") does not comply.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span><strong>Readable font and contrast.</strong> Same size and legibility as surrounding text — not 8 px grey on white.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span><strong>In the natural flow of content</strong> — before the viewer reaches the recommendation or affiliate link, not after.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span><strong>Platform-native.</strong> Disclosures in your bio, channel description, or a pinned comment do not substitute for in-content disclosure.</span>
          </li>
        </ul>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">
          What counts as a material connection
        </h3>
        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>Receiving commission on referred sales (this applies to you)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>Receiving free or discounted access to a product in exchange for coverage</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>Employment or consulting relationships with the brand</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>Any other compensation, including gift cards, early access, or co-marketing budget</span>
          </li>
        </ul>

        {/* ── ASA ── */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          ASA Requirements (United Kingdom)
        </h2>

        <p className="text-sm text-neutral-700 leading-relaxed">
          The UK Advertising Standards Authority enforces the CAP Code, which requires that
          all marketing communications be obviously identifiable as such. Jurisdiction follows
          the <strong>audience</strong>, not your location. If your content is targeted at or
          materially reaches UK consumers, ASA rules apply regardless of where you are based.
        </p>

        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span><strong>#ad works.</strong> It is the ASA's accepted shorthand and is unambiguous to a UK audience.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span><strong>#spon, #collab, #gifted do not work</strong> for affiliate arrangements where you receive commission — those labels imply a different kind of relationship. Use #ad.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>The disclosure must appear <strong>before</strong> the audience engages with the promotional content — at the start of a video, the top of a post, the first line of a caption.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>On Instagram and TikTok, the platform's native "Paid Partnership" tag is <em>in addition to</em> — not a substitute for — a clear label in the caption.</span>
          </li>
        </ul>

        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          <strong>Both sets of rules can apply at the same time.</strong> A US-based creator
          with significant UK readership should treat every piece of content as subject to
          both FTC and ASA standards simultaneously — this is the safer default.
        </div>

        {/* ── Compliant vs Non-Compliant Table ── */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Compliant vs Non-Compliant Disclosures
        </h2>

        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-1/2">
                Non-Compliant
              </th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-1/2">
                Compliant
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 text-error">Disclosure link in bio only</td>
              <td className="border border-neutral-200 px-3 py-2 text-success">Disclosure in the caption/post body, before the link</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 text-error">"* affiliate link" in 8px font at page bottom</td>
              <td className="border border-neutral-200 px-3 py-2 text-success">"I earn a commission if you buy through this link" in the first paragraph</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 text-error">#spon in a list of 20 hashtags at the end of a caption</td>
              <td className="border border-neutral-200 px-3 py-2 text-success">#ad as the very first word of the caption</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 text-error">Verbal disclosure only at the end of a 15-minute video</td>
              <td className="border border-neutral-200 px-3 py-2 text-success">Verbal + on-screen text disclosure within the first 30 seconds</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 text-error">"Check my website for disclosure info" (redirect)</td>
              <td className="border border-neutral-200 px-3 py-2 text-success">"This is an affiliate link — I earn commission at no cost to you"</td>
            </tr>
          </tbody>
        </table>

        {/* ── Required Language Per Channel ── */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Required Disclosure Language for P402 Promotions
        </h2>

        <p className="text-sm text-neutral-700 leading-relaxed">
          Use one of the approved phrases below for each channel. Variations are permitted
          as long as they are equally clear — do not make them less specific.
        </p>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">
          YouTube (video content)
        </h3>
        <div className="border-2 border-neutral-200 p-4 font-mono text-xs bg-neutral-50 my-3">
          "This video contains affiliate links to P402. I earn a commission if you sign up
          through my link, at no extra cost to you."
        </div>
        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>Must appear <strong>verbally and as on-screen text</strong> within the first 30 seconds of the video — not only in the description.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>Also include in the video description: "Affiliate disclosure: I may earn a commission for purchases made through the P402 link below."</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>YouTube's built-in "Includes paid promotion" toggle is required <em>in addition</em> to verbal disclosure, not instead of it.</span>
          </li>
        </ul>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">
          Twitter / X
        </h3>
        <div className="border-2 border-neutral-200 p-4 font-mono text-xs bg-neutral-50 my-3">
          "#ad — I'm a P402 affiliate and earn commission on signups."
        </div>
        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span><strong>#ad must appear in the tweet itself</strong>, not in a reply thread, your bio, or a linked article.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>Place #ad at the beginning of the tweet — not buried after the link.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>Thread starters that contain the affiliate link require disclosure; replies in the same thread do not need to repeat it, but the original tweet must.</span>
          </li>
        </ul>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">
          Email Newsletter
        </h3>
        <div className="border-2 border-neutral-200 p-4 font-mono text-xs bg-neutral-50 my-3">
          "Disclosure: This newsletter contains affiliate links to P402. I receive a
          commission if you subscribe through my link."
        </div>
        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>Must appear at the <strong>top of the email</strong>, before any promotional content or affiliate links — not in the footer.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>If a newsletter issue has a dedicated P402 sponsorship section, repeat a shorter version ("Affiliate link below") directly above that section as well.</span>
          </li>
        </ul>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">
          Blog Post / Written Content
        </h3>
        <div className="border-2 border-neutral-200 p-4 font-mono text-xs bg-neutral-50 my-3">
          "Disclosure: This post contains affiliate links. If you sign up for P402 through
          a link in this article, I earn a commission at no additional cost to you."
        </div>
        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>Must appear <strong>above the fold</strong> — the reader must see it before scrolling. Top of article, before the introduction.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>A sitewide disclosure page does not replace per-article disclosure.</span>
          </li>
        </ul>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">
          Instagram / TikTok
        </h3>
        <div className="border-2 border-neutral-200 p-4 font-mono text-xs bg-neutral-50 my-3">
          "#ad — Affiliate link in bio for P402 (I earn commission on signups)."
        </div>
        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>Instagram: #ad must be in the <strong>first line</strong> of the caption — not hidden after "more".</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>TikTok: verbal disclosure in the video <strong>and</strong> #ad in the caption.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>Instagram Stories: on-screen text disclosure on the frame containing the affiliate mention or swipe-up link.</span>
          </li>
        </ul>

        {/* ── Consequences ── */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Consequences of Non-Disclosure
        </h2>

        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">
                Party
              </th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">
                Consequence
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">FTC (US)</td>
              <td className="border border-neutral-200 px-3 py-2">Civil penalties up to <strong>$51,744 per violation</strong>. The FTC may pursue both the publisher and, in some cases, the brand.</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">ASA (UK)</td>
              <td className="border border-neutral-200 px-3 py-2">Public censure (published rulings), mandatory content removal, referral to Trading Standards for persistent breaches.</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">Platform (YouTube / Meta / X)</td>
              <td className="border border-neutral-200 px-3 py-2">Content strikes, demonetization, account suspension.</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">P402 Partner Agreement</td>
              <td className="border border-neutral-200 px-3 py-2"><strong>Immediate termination</strong> of the partner relationship, clawback of commissions earned during the period of non-disclosure.</td>
            </tr>
          </tbody>
        </table>

        <div className="border-2 border-error px-4 py-3 text-sm text-error font-medium my-4">
          P402 actively monitors partner promotional content. If an undisclosed promotion is
          found, the partner will be notified once and given 48 hours to remediate. A second
          violation results in immediate termination without right of appeal.
        </div>

      </div>
    ),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Brand Guidelines
  // ─────────────────────────────────────────────────────────────────────────
  'brand-guidelines': {
    title: 'Brand Guidelines',
    category: 'Compliance',
    categorySlug: 'compliance',
    updatedAt: 'April 2025',
    body: (
      <div className="space-y-6">

        <p className="text-sm text-neutral-700 leading-relaxed">
          These guidelines govern how P402 brand assets, names, and identity may be used in
          partner content. Complying protects you from intellectual property claims and ensures
          your audience receives accurate information about what P402 is and is not.
        </p>

        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          Questions not answered here? Email <strong>partnerships@p402.io</strong> before
          publishing. It is always safer to ask first.
        </div>

        {/* ── Correct Naming ── */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Correct Product and Protocol Names
        </h2>

        <p className="text-sm text-neutral-700 leading-relaxed">
          Consistent naming matters for SEO, legal protection, and user trust. Use these
          exact forms every time.
        </p>

        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">
                Term
              </th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">
                Correct Form
              </th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">
                Never Use
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-neutral-200 px-3 py-2">Company / product brand</td>
              <td className="border border-neutral-200 px-3 py-2 font-mono font-black">P402</td>
              <td className="border border-neutral-200 px-3 py-2 text-error font-mono">p402, P 402, p-402, P-402</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2">Payment protocol</td>
              <td className="border border-neutral-200 px-3 py-2 font-mono font-black">x402</td>
              <td className="border border-neutral-200 px-3 py-2 text-error font-mono">X402, X-402, x-402</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2">Full product name</td>
              <td className="border border-neutral-200 px-3 py-2 font-mono font-black">P402 Router</td>
              <td className="border border-neutral-200 px-3 py-2 text-error font-mono">P402 router, p402 Router</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2">Spending mandates feature</td>
              <td className="border border-neutral-200 px-3 py-2 font-mono font-black">AP2 Mandates</td>
              <td className="border border-neutral-200 px-3 py-2 text-error font-mono">ap2 mandates, AP2 mandates, AP-2</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2">Agent marketplace</td>
              <td className="border border-neutral-200 px-3 py-2 font-mono font-black">Bazaar</td>
              <td className="border border-neutral-200 px-3 py-2 text-error font-mono">bazaar, the bazaar, BAZAAR</td>
            </tr>
          </tbody>
        </table>

        {/* ── Logo ── */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Logo Usage
        </h2>

        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>Partners <strong>may not use P402 logo files</strong> (wordmark, icon, or lockup) without explicit written permission obtained per campaign. Logo files are not distributed with program enrollment.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>To request logo usage rights, email <strong>partnerships@p402.io</strong> with the subject "Logo Usage Request" and include the intended placement, context, and publication date.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>If permission is granted, you must use the logo files provided without modification — no recoloring, distorting, rotating, or applying effects.</span>
          </li>
        </ul>

        {/* ── Partner Identity ── */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          How to Identify Yourself as a Partner
        </h2>

        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-1/2">
                Approved Language
              </th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-1/2">
                Not Approved
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-neutral-200 px-3 py-2">"a P402 affiliate partner"</td>
              <td className="border border-neutral-200 px-3 py-2 text-error">"Official P402 partner" (implies exclusivity or endorsement beyond the program)</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2">"P402 integration partner"</td>
              <td className="border border-neutral-200 px-3 py-2 text-error">"P402 certified" (certification program does not exist)</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2">"I use P402 for my clients"</td>
              <td className="border border-neutral-200 px-3 py-2 text-error">"P402 endorsed" (P402 does not endorse individual partners publicly)</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2">"built with P402"</td>
              <td className="border border-neutral-200 px-3 py-2 text-error">"P402 reseller" (unless an explicit reseller agreement is in place)</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2">"P402 affiliate" with required disclosure</td>
              <td className="border border-neutral-200 px-3 py-2 text-error">"P402 employee", "P402 representative", "P402 team" in any form</td>
            </tr>
          </tbody>
        </table>

        <div className="border-2 border-error px-4 py-3 text-sm text-error font-medium my-4">
          Implying that you are a P402 employee, official representative, or that your
          content has been approved by P402 is a material misrepresentation and grounds for
          immediate program termination.
        </div>

        {/* ── Color and Visual ── */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Color and Visual Identity
        </h2>

        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span><strong>Do not replicate P402's full design system</strong> in your own content. Creating sites or materials that closely imitate P402's Neo-Brutalist aesthetic, typography, and acid-green palette may cause consumer confusion and is prohibited.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>Using P402's primary green (#B6FF2E) as a single accent color in partner content is acceptable provided your overall branding is clearly distinct from P402's.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span><strong>Screenshots of the P402 dashboard</strong> are permitted for editorial, tutorial, and review use. Screenshots must be current, unaltered (no editing of UI text, figures, or features), and accompanied by appropriate captions.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>Do not stage or fabricate dashboard screenshots — publishing manipulated UI images is a violation of both this policy and consumer protection law.</span>
          </li>
        </ul>

        {/* ── Social Media ── */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Social Media Handles and Accounts
        </h2>

        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>Never impersonate <strong>@p402io</strong> or any P402-owned social account on any platform.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>Do not create social accounts, pages, groups, or communities with "P402" in the handle or name without prior written permission. This includes accounts like "@p402_tips", "P402 community", or "P402 news".</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>Partner-run communities (Slack, Discord, forums) that discuss P402 must include a clear notice that they are independently run and not affiliated with or moderated by P402.</span>
          </li>
        </ul>

        {/* ── Permission Grants ── */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Requesting Extended Permissions
        </h2>

        <p className="text-sm text-neutral-700 leading-relaxed">
          Track B (Agency) and Track C (Enterprise) partners may apply for extended brand
          usage rights — for example, co-branded landing pages, print materials, or
          conference booth assets. Submit requests to <strong>partnerships@p402.io</strong>{' '}
          at least 10 business days before your planned publication date. Include:
        </p>
        <ul className="space-y-2 text-sm text-neutral-700 list-none mt-3">
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>Description of the asset and its intended use</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>Target audience and distribution channel</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>Draft or mockup of the asset</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>Estimated reach / impression volume</span>
          </li>
        </ul>

      </div>
    ),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Prohibited Methods
  // ─────────────────────────────────────────────────────────────────────────
  'prohibited-methods': {
    title: 'Prohibited Methods',
    category: 'Compliance',
    categorySlug: 'compliance',
    updatedAt: 'April 2025',
    body: (
      <div className="space-y-6">

        <p className="text-sm text-neutral-700 leading-relaxed">
          The following promotion methods are prohibited under the P402 Partner Agreement.
          Each is listed with the reasoning — ethical, legal, or commercial — and the
          consequence. Violations are detected through automated monitoring, third-party
          brand protection services, and user reports.
        </p>

        <div className="border-2 border-error px-4 py-3 text-sm text-error font-medium my-4">
          Commissions earned during a period in which a prohibited method was active are
          subject to clawback regardless of whether those commissions have already been paid.
        </div>

        {/* ── Traffic Fraud ── */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Traffic Fraud
        </h2>

        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-2/5">
                Prohibited Method
              </th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-2/5">
                Why It&apos;s Prohibited
              </th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-1/5">
                Consequence
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">Click farms / paid click services</td>
              <td className="border border-neutral-200 px-3 py-2">Generates fraudulent referral credit. No real customers, no real intent. Constitutes wire fraud in most jurisdictions when used to generate financial gain.</td>
              <td className="border border-neutral-200 px-3 py-2 font-black text-error">Immediate termination + clawback</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">Self-referral</td>
              <td className="border border-neutral-200 px-3 py-2">Signing up for P402 using your own affiliate link to earn commission on your own subscription. Explicitly prohibited in the Partner Agreement; constitutes fraudulent inducement.</td>
              <td className="border border-neutral-200 px-3 py-2 font-black text-error">Immediate termination + clawback</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">Incentivized clicks (undisclosed)</td>
              <td className="border border-neutral-200 px-3 py-2">Paying or rewarding others to click your referral link without disclosing the incentive. Violates FTC rules and inflates conversion metrics deceptively.</td>
              <td className="border border-neutral-200 px-3 py-2 font-black text-error">Immediate termination + clawback</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">Cookie stuffing / forced clicks</td>
              <td className="border border-neutral-200 px-3 py-2">Dropping affiliate cookies on users without their knowledge via hidden iframes, redirect chains, or injected scripts. Illegal under GDPR/CCPA and computer fraud statutes.</td>
              <td className="border border-neutral-200 px-3 py-2 font-black text-error">Immediate termination + legal referral</td>
            </tr>
          </tbody>
        </table>

        {/* ── Misleading Promotion ── */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Misleading Promotion
        </h2>

        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-2/5">
                Prohibited Method
              </th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-2/5">
                Why It&apos;s Prohibited
              </th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-1/5">
                Consequence
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">Fake reviews or testimonials</td>
              <td className="border border-neutral-200 px-3 py-2">Fabricating or purchasing reviews is illegal under the FTC's Rule on the Use of Consumer Reviews (effective August 2024) — civil penalties up to $51,744 per violation, per review.</td>
              <td className="border border-neutral-200 px-3 py-2 font-black text-error">Immediate termination + clawback</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">Fabricated case studies or results</td>
              <td className="border border-neutral-200 px-3 py-2">Publishing false or exaggerated performance claims (e.g., "saved 90% on AI costs" without evidence) constitutes deceptive advertising under FTC Act Section 5.</td>
              <td className="border border-neutral-200 px-3 py-2 font-black text-error">Immediate termination + clawback</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">AI-generated fake reviews attributed to real people</td>
              <td className="border border-neutral-200 px-3 py-2">Using LLMs to generate testimonials presented as being from real, identified individuals. This is identity fraud and violates the FTC's fake review rule and UK Consumer Protection from Unfair Trading Regulations.</td>
              <td className="border border-neutral-200 px-3 py-2 font-black text-error">Immediate termination + legal referral</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">Cloaking referral links</td>
              <td className="border border-neutral-200 px-3 py-2">Using redirect chains or link shorteners specifically to disguise that a link is an affiliate link. Violates FTC disclosure requirements and most platform terms of service.</td>
              <td className="border border-neutral-200 px-3 py-2 font-black text-error">Warning, then termination</td>
            </tr>
          </tbody>
        </table>

        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          <strong>Note on link cloaking:</strong> Standard URL shorteners (bit.ly, etc.) are
          permitted as long as the destination is clearly a P402 referral link and a proper
          disclosure accompanies it. The prohibition is on cloaking that is specifically
          intended to hide the affiliate relationship.
        </div>

        {/* ── Spam ── */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Spam
        </h2>

        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-2/5">
                Prohibited Method
              </th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-2/5">
                Why It&apos;s Prohibited
              </th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-1/5">
                Consequence
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">Unsolicited bulk email</td>
              <td className="border border-neutral-200 px-3 py-2">Sending affiliate promotions to purchased lists or any recipients who did not explicitly opt in to receive your marketing. Violates CAN-SPAM (US), CASL (Canada), and GDPR (EU/UK). Fines up to $46,517 per email (CAN-SPAM) or 4% of global turnover (GDPR).</td>
              <td className="border border-neutral-200 px-3 py-2 font-black text-error">Immediate termination + clawback</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">Automated social media DM campaigns</td>
              <td className="border border-neutral-200 px-3 py-2">Bot-driven or bulk DM sends promoting P402 affiliate links to cold recipients. Violates platform terms (Twitter, LinkedIn, Instagram) and in some jurisdictions constitutes electronic harassment.</td>
              <td className="border border-neutral-200 px-3 py-2 font-black text-error">Immediate termination</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">Forum / comment spam</td>
              <td className="border border-neutral-200 px-3 py-2">Posting affiliate links in comment sections, forum threads, or Q&A platforms (Stack Overflow, Reddit, Hacker News) where promotional content is prohibited or where the link adds no genuine value to the discussion.</td>
              <td className="border border-neutral-200 px-3 py-2 font-black text-error">Warning, then termination</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">Referral links in non-promotional community channels</td>
              <td className="border border-neutral-200 px-3 py-2">Posting in Slack workspaces, Discord servers, or Reddit communities where promotional content or affiliate links are explicitly prohibited by community rules. Harms P402's reputation in developer communities P402 depends on.</td>
              <td className="border border-neutral-200 px-3 py-2 font-black text-error">Warning, then termination</td>
            </tr>
          </tbody>
        </table>

        {/* ── Paid Advertising Restrictions ── */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Paid Advertising Restrictions
        </h2>

        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-2/5">
                Prohibited Method
              </th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-2/5">
                Why It&apos;s Prohibited
              </th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-1/5">
                Consequence
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">Bidding on P402 branded keywords in paid search</td>
              <td className="border border-neutral-200 px-3 py-2">Inflates P402's own customer acquisition costs and creates ad auction competition between affiliates and the brand. See the Brand Bidding Policy for full detail.</td>
              <td className="border border-neutral-200 px-3 py-2 font-black text-error">Immediate termination + clawback</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">Ads that impersonate P402's own ads</td>
              <td className="border border-neutral-200 px-3 py-2">Creating display or search ads designed to look like they originate from P402 directly (using P402's logo, headline style, or domain variants) constitutes trademark infringement and consumer deception.</td>
              <td className="border border-neutral-200 px-3 py-2 font-black text-error">Immediate termination + legal referral</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">Display ads misrepresenting the affiliate relationship</td>
              <td className="border border-neutral-200 px-3 py-2">Running display advertising that does not clearly indicate the content is from a third-party affiliate. Google Ads policy and FTC rules both require clear identification.</td>
              <td className="border border-neutral-200 px-3 py-2 font-black text-error">Warning, then termination</td>
            </tr>
          </tbody>
        </table>

        {/* ── Content Violations ── */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Content Violations
        </h2>

        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-2/5">
                Prohibited Method
              </th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-2/5">
                Why It&apos;s Prohibited
              </th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-1/5">
                Consequence
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">Using P402 brand assets without permission</td>
              <td className="border border-neutral-200 px-3 py-2">Trademark infringement. See Brand Guidelines for what is and is not permitted.</td>
              <td className="border border-neutral-200 px-3 py-2 font-black text-error">Takedown notice, then termination</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">Publishing confidential P402 information</td>
              <td className="border border-neutral-200 px-3 py-2">Disclosing pricing details marked confidential, unreleased features, customer data, or internal roadmap information shared through partner channels. Violates the NDA provisions of the Partner Agreement.</td>
              <td className="border border-neutral-200 px-3 py-2 font-black text-error">Immediate termination + legal referral</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">Publishing on prohibited platforms</td>
              <td className="border border-neutral-200 px-3 py-2">Placing P402 affiliate links on adult content sites, piracy sites, malware distribution networks, hate speech platforms, or any site whose content would not pass P402's acceptable use policy. Associates P402's brand with harmful content.</td>
              <td className="border border-neutral-200 px-3 py-2 font-black text-error">Immediate termination + clawback</td>
            </tr>
          </tbody>
        </table>

        {/* ── Reporting ── */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Reporting Suspected Violations by Other Partners
        </h2>

        <p className="text-sm text-neutral-700 leading-relaxed">
          If you observe another partner using prohibited methods — particularly if their
          spam or fraud activity is associating P402 with bad practices in your niche — you
          can report it to <strong>partnerships@p402.io</strong> with subject "Compliance
          Report". Include a URL, screenshot, or other documentation. Reports are
          confidential.
        </p>

      </div>
    ),
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Brand Bidding Policy
  // ─────────────────────────────────────────────────────────────────────────
  'brand-bidding-policy': {
    title: 'Brand Bidding Policy',
    category: 'Compliance',
    categorySlug: 'compliance',
    updatedAt: 'April 2025',
    body: (
      <div className="space-y-6">

        <p className="text-sm text-neutral-700 leading-relaxed">
          This policy governs paid search advertising by P402 affiliate partners on all
          search platforms including Google Ads, Microsoft Advertising (Bing Ads), and any
          equivalent search-intent advertising network. It exists to protect both P402's
          paid acquisition efficiency and your ability to run profitable campaigns on
          non-brand keywords.
        </p>

        {/* ── Core Rule ── */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          The Core Rule
        </h2>

        <div className="border-2 border-error px-4 py-3 text-sm text-error font-medium my-4">
          Partners may NOT bid on P402 branded keywords in any paid search platform without
          explicit written permission from P402 obtained in advance of the campaign launch.
          Violations result in immediate termination and full commission clawback.
        </div>

        <p className="text-sm text-neutral-700 leading-relaxed">
          This prohibition applies across all match types — exact match, phrase match,
          broad match, and broad match modified. The mechanism that triggers the violation
          is targeting brand-intent searches with an affiliate link, regardless of how the
          targeting is technically configured.
        </p>

        {/* ── What Brand Keywords Means ── */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          What "Brand Keywords" Means
        </h2>

        <p className="text-sm text-neutral-700 leading-relaxed">
          Brand keywords are any search terms where the primary search intent is to find
          P402 or information about P402 specifically. This includes:
        </p>

        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-1/2">
                Prohibited Brand Keywords
              </th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-1/2">
                Category
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-mono">P402</td>
              <td className="border border-neutral-200 px-3 py-2">Core brand name</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-mono">p402.io</td>
              <td className="border border-neutral-200 px-3 py-2">Brand domain</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-mono">P402 router</td>
              <td className="border border-neutral-200 px-3 py-2">Brand + product name</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-mono">P402 ai</td>
              <td className="border border-neutral-200 px-3 py-2">Brand + category</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-mono">P402 pricing</td>
              <td className="border border-neutral-200 px-3 py-2">Brand + informational modifier — captures users already aware of P402</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-mono">P402 review</td>
              <td className="border border-neutral-200 px-3 py-2">Brand + review intent</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-mono">P402 alternative</td>
              <td className="border border-neutral-200 px-3 py-2">Brand + competitor comparison intent</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-mono">x402 protocol</td>
              <td className="border border-neutral-200 px-3 py-2">Protocol name associated exclusively with P402</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-mono">AP2 Mandates</td>
              <td className="border border-neutral-200 px-3 py-2">P402-specific feature name</td>
            </tr>
          </tbody>
        </table>

        <p className="text-sm text-neutral-700 leading-relaxed">
          <strong>Competitor targeting from a P402-affiliated account is also prohibited.</strong>{' '}
          Running ads that bid on competitor names while directing traffic through a P402
          affiliate link creates brand-safety and disclosure complications that P402 is not
          willing to take on.
        </p>

        {/* ── What IS Allowed ── */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          What IS Allowed
        </h2>

        <p className="text-sm text-neutral-700 leading-relaxed">
          Partners may run paid search campaigns on generic, non-brand-intent keywords that
          describe the problem space P402 operates in.
        </p>

        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-1/2">
                Permitted Keyword Examples
              </th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-1/2">
                Intent Category
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-mono">AI API router</td>
              <td className="border border-neutral-200 px-3 py-2">Generic category</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-mono">LLM cost optimization</td>
              <td className="border border-neutral-200 px-3 py-2">Problem-aware, no brand intent</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-mono">reduce OpenAI costs</td>
              <td className="border border-neutral-200 px-3 py-2">Competitor pain point, generic</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-mono">AI payment SDK</td>
              <td className="border border-neutral-200 px-3 py-2">Generic product category</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-mono">agentic AI payments</td>
              <td className="border border-neutral-200 px-3 py-2">Emerging category, no P402 brand intent</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-mono">multi-provider LLM routing</td>
              <td className="border border-neutral-200 px-3 py-2">Technical capability, generic</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-mono">AI infrastructure cost savings</td>
              <td className="border border-neutral-200 px-3 py-2">Business outcome, generic</td>
            </tr>
          </tbody>
        </table>

        <p className="text-sm text-neutral-700 leading-relaxed">
          <strong>Organic SEO is always permitted.</strong> Writing a review, tutorial, or
          comparison article that organically ranks for "P402 review" or "P402 pricing" is
          not only allowed — it is encouraged. The prohibition is on <em>paid</em> bidding
          only.
        </p>

        <p className="text-sm text-neutral-700 leading-relaxed">
          <strong>YouTube in-stream ads with generic targeting are permitted</strong> even if
          the video content mentions P402 as part of a tutorial or comparison. The keyword
          targeting on the campaign must be generic, not brand-intent.
        </p>

        {/* ── Why This Policy Exists ── */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Why This Policy Exists
        </h2>

        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span><strong>Direct cost inflation.</strong> When affiliates bid on "P402", P402's own Google Ads campaigns must bid higher to win their own branded terms. Each affiliate bidding on the brand pushes CPC up for everyone, including P402's own budget.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span><strong>Attribution conflict.</strong> A user who searches "P402" and clicks an affiliate ad instead of P402's own ad is a user who was already aware of P402 — the affiliate provided no incremental discovery value, but collects 20–25% commission anyway.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span><strong>Consumer confusion.</strong> Multiple ads on branded queries — some from P402, some from affiliates — make it unclear to users which ad is authoritative. This erodes trust in the brand.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span><strong>FTC disclosure complexity.</strong> An affiliate running a paid search ad with an affiliate link creates a layered disclosure problem: the ad must disclose it is an ad (Google's policy), and the affiliate nature of the link must also be disclosed — creating copy and landing page constraints that are difficult to manage correctly at scale.</span>
          </li>
        </ul>

        {/* ── Exception Process ── */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Exception Process for Track B Agency Partners
        </h2>

        <p className="text-sm text-neutral-700 leading-relaxed">
          Track B (Agency/Integration) partners may apply for a written exception for
          specific, time-limited co-marketing campaigns — for example, a joint campaign for
          a regional launch or a vertical-specific promotion where P402 wants targeted brand
          presence it cannot run itself.
        </p>

        <p className="text-sm text-neutral-700 leading-relaxed">
          Exceptions are granted campaign-by-campaign and are never standing permissions.
          Each exception request must include all of the following before any ads are
          created or launched:
        </p>

        <ul className="space-y-2 text-sm text-neutral-700 list-none mt-3">
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span><strong>Campaign brief</strong> — objectives, budget, duration, geographic targeting, and target audience</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span><strong>Keyword list</strong> — exact list of branded keywords you are requesting permission to bid on</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span><strong>Ad copy</strong> — all headline and description variants, pre-approved before any ads go live</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span><strong>Landing page</strong> — URL and content, including the affiliate disclosure and any P402 brand assets used</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span><strong>FTC/ASA disclosure plan</strong> — how you will disclose the affiliate relationship in the ad and on the landing page</span>
          </li>
        </ul>

        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          Submit exception requests to <strong>partnerships@p402.io</strong> with the subject
          line <strong>"Brand Bidding Exception Request"</strong>. Allow at least 10 business
          days for review. Do not launch any campaigns pending approval — running a brand
          bidding campaign without written approval is a violation regardless of intent.
        </div>

        <div className="border-2 border-error px-4 py-3 text-sm text-error font-medium my-4">
          There is no exception process for Track A (Developer Affiliate) or Track C
          (Enterprise Referral) partners. Brand bidding is categorically prohibited for
          these tracks.
        </div>

        {/* ── Monitoring and Enforcement ── */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Monitoring and Enforcement
        </h2>

        <p className="text-sm text-neutral-700 leading-relaxed">
          P402 uses brand protection monitoring tools that continuously scan for affiliate
          links appearing in paid search results on P402 branded queries. When a violation
          is detected:
        </p>

        <ul className="space-y-2 text-sm text-neutral-700 list-none mt-3">
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>The partner is notified by email and given <strong>24 hours</strong> to pause all infringing campaigns.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>If campaigns are not paused within 24 hours, the partner account is suspended immediately.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>All commissions earned during the period when infringing ads were running are subject to full clawback — including commissions already paid in prior payout cycles.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-black shrink-0">→</span>
            <span>A second violation in any 12-month period results in permanent termination without right of appeal.</span>
          </li>
        </ul>

      </div>
    ),
  },

}
