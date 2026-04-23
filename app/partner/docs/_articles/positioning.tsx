import React from 'react'
import type { ArticleContent } from '../[slug]/page'

// ---------------------------------------------------------------------------
// Positioning & Messaging — 4 articles
// ---------------------------------------------------------------------------

export const positioningArticles: Record<string, ArticleContent> = {

  // -------------------------------------------------------------------------
  // 1. P402 in One Sentence
  // -------------------------------------------------------------------------
  'p402-in-one-sentence': {
    title: 'P402 in One Sentence',
    category: 'Positioning & Messaging',
    categorySlug: 'positioning',
    updatedAt: 'April 2025',
    body: (
      <div className="space-y-6">

        <p className="text-sm text-neutral-700 leading-relaxed">
          How you describe P402 in the first sentence determines whether a prospect reads the next one. This guide gives you eight vetted, approved one-liners — each written for a specific audience and context — plus guidance on when to use each, and a breakdown of common formulations that partners have gotten wrong.
        </p>

        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          Use these sentences verbatim in your content, emails, and pitches. Paraphrasing is fine but must preserve the core claims. Do not add qualifiers like "kind of", "basically", or "sort of" — they undercut credibility. Do not remove the qualifier "AI" from "AI payment router" — without it the product sounds like a network router.
        </div>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">The Eight Approved One-Liners</h2>

        {/* Sentence 1 */}
        <div className="border-2 border-black p-5 my-4">
          <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-2">01 — Developer Pitch</div>
          <p className="text-base font-black leading-snug text-black">
            "P402 is an AI payment router that sends every LLM request to the best available provider — by cost, speed, or quality — with a single OpenAI-compatible API call."
          </p>
          <div className="mt-4 space-y-2">
            <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500">When to use</p>
            <p className="text-sm text-neutral-700">Cold outreach to developers, README introductions, developer conference lightning-talk openers, Discord or Slack introductions in developer communities, tutorial video opening lines. This is the sentence that turns a skim into a read.</p>
            <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500 mt-3">Why it works</p>
            <p className="text-sm text-neutral-700">Developers recognize "OpenAI-compatible" as a zero-friction integration promise. The three-axis value prop (cost / speed / quality) lands because every developer has already argued internally about which matters most — here they don't have to choose.</p>
          </div>
        </div>

        {/* Sentence 2 */}
        <div className="border-2 border-black p-5 my-4">
          <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-2">02 — Enterprise Pitch</div>
          <p className="text-base font-black leading-snug text-black">
            "P402 gives enterprise AI teams a single control plane for spend governance, multi-model routing, and on-chain settlement — without replacing existing infrastructure."
          </p>
          <div className="mt-4 space-y-2">
            <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500">When to use</p>
            <p className="text-sm text-neutral-700">LinkedIn outreach to engineering VPs, CTO introductory emails, enterprise sales decks (slide 2, after the problem slide), procurement committee write-ups. Works well as the subject line of a follow-up after a demo.</p>
            <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500 mt-3">Why it works</p>
            <p className="text-sm text-neutral-700">"Control plane" and "spend governance" are enterprise-native vocabulary. "Without replacing existing infrastructure" directly preempts the biggest objection in enterprise AI buying cycles: change risk. The phrase AP2 Mandates refers to this governance layer specifically — but at the one-liner stage, "spend governance" is the right abstraction level.</p>
          </div>
        </div>

        {/* Sentence 3 */}
        <div className="border-2 border-black p-5 my-4">
          <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-2">03 — Investor / Advisor Pitch</div>
          <p className="text-base font-black leading-snug text-black">
            "P402 is the infrastructure layer that lets AI agents pay for AI services on-chain — routing requests across 13+ models and settling payments in USDC on Base with no credit card required."
          </p>
          <div className="mt-4 space-y-2">
            <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500">When to use</p>
            <p className="text-sm text-neutral-700">Ecosystem partner introductions, advisor referral pitches, accelerator and VC event networking, crypto-native community presentations. Best in writing when you have 15 seconds of attention and no slides.</p>
            <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500 mt-3">Why it works</p>
            <p className="text-sm text-neutral-700">Frames P402 as infrastructure (high-value, defensible) rather than a SaaS app. "AI agents pay for AI services" captures the agentic economy thesis in one clause. The Base + USDC specificity signals real technical credibility — vague blockchain claims get dismissed; chain and token names do not.</p>
          </div>
        </div>

        {/* Sentence 4 */}
        <div className="border-2 border-black p-5 my-4">
          <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-2">04 — Content Creator / Educator Pitch</div>
          <p className="text-base font-black leading-snug text-black">
            "P402 lets you route any LLM call to the cheapest or fastest provider automatically — and your readers can cut their AI API bill by 20–70% just by changing one endpoint."
          </p>
          <div className="mt-4 space-y-2">
            <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500">When to use</p>
            <p className="text-sm text-neutral-700">Blog post introductions, YouTube video descriptions, newsletter CTAs, course module intros, Twitter/X thread hooks when the content is cost-focused. The "your readers" framing works especially well in newsletters and communities where you have an established audience.</p>
            <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500 mt-3">Why it works</p>
            <p className="text-sm text-neutral-700">Cost reduction is the highest-converting angle for developer audiences because LLM costs are an immediate, felt pain. The "20–70%" range is approved (sourced from semantic cache performance data) and specific enough to be credible without being a guarantee. "Changing one endpoint" is the correct framing — it mirrors the actual integration path.</p>
          </div>
        </div>

        {/* Sentence 5 */}
        <div className="border-2 border-black p-5 my-4">
          <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-2">05 — Tweet-Length Version (under 240 characters)</div>
          <p className="text-base font-black leading-snug text-black">
            "P402 routes your LLM calls across 13+ AI providers, picks the cheapest or best option per request, and settles payments on Base — one API swap, no rewrites."
          </p>
          <div className="mt-4 space-y-2">
            <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500">When to use</p>
            <p className="text-sm text-neutral-700">Twitter/X posts, Mastodon, Bluesky, Threads. Also works as a Discord or Slack first message when introducing P402 to a new community. Character count: 162 (fits in one tweet with room for a link).</p>
            <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500 mt-3">Why it works</p>
            <p className="text-sm text-neutral-700">Three concrete verbs (routes, picks, settles) each map to a distinct product capability. "One API swap, no rewrites" closes the loop on integration friction — the hardest objection on social, where there's no space to elaborate.</p>
          </div>
        </div>

        {/* Sentence 6 */}
        <div className="border-2 border-black p-5 my-4">
          <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-2">06 — Email Subject Line Version</div>
          <p className="text-base font-black leading-snug text-black">
            "Route your AI calls across 13 providers. Pay less. Keep the same code."
          </p>
          <div className="mt-4 space-y-2">
            <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500">When to use</p>
            <p className="text-sm text-neutral-700">Cold email subject lines, promotional newsletter subject lines, SMS or push notification copy when promoting P402. Also works as a three-line hero tagline in landing pages when split across three lines.</p>
            <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500 mt-3">Why it works</p>
            <p className="text-sm text-neutral-700">Subject line optimization requires front-loading specificity and keeping sentences short enough to render unclipped on mobile. Three imperative sentences create rhythm and urgency. "Keep the same code" is the conversion hook — developers' second-biggest fear after cost is integration effort.</p>
          </div>
        </div>

        {/* Sentence 7 */}
        <div className="border-2 border-black p-5 my-4">
          <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-2">07 — Agent Builder Pitch</div>
          <p className="text-base font-black leading-snug text-black">
            "P402 is the payment and routing layer for autonomous AI agents — they pick the right model, pay for it in USDC, and operate within user-defined spending limits, without human intervention."
          </p>
          <div className="mt-4 space-y-2">
            <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500">When to use</p>
            <p className="text-sm text-neutral-700">LangChain, AutoGen, CrewAI, and OpenAI Agents SDK community channels, agent framework documentation, agentic AI conference talks, blog posts about autonomous agent architecture. Best used when the audience is already building multi-step agents, not just single-turn chatbots.</p>
            <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500 mt-3">Why it works</p>
            <p className="text-sm text-neutral-700">Agent builders face a problem that general developers don't: how does an autonomous agent handle billing? This sentence names the problem (payment + spending limits) and implies the solution (AP2 Mandates + x402). "Without human intervention" is the key phrase — it speaks directly to the autonomous operation goal.</p>
          </div>
        </div>

        {/* Sentence 8 */}
        <div className="border-2 border-black p-5 my-4">
          <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-2">08 — Automation Agency Pitch</div>
          <p className="text-base font-black leading-snug text-black">
            "P402 lets agencies run client AI workloads across any combination of models, track spend by client, and keep costs predictable — all from one dashboard."
          </p>
          <div className="mt-4 space-y-2">
            <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500">When to use</p>
            <p className="text-sm text-neutral-700">Agency owner communities, Make/Zapier/n8n communities when AI cost management comes up, automation consultant prospect emails, proposal cover pages. Strong as a testimonial prompt to give back to agency clients who have had success with P402.</p>
            <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500 mt-3">Why it works</p>
            <p className="text-sm text-neutral-700">Agencies run multiple clients on AI infrastructure and need per-client cost visibility. "One dashboard" is the integration value for operators managing complexity across accounts. "Predictable" costs — not just "lower" — is the correct framing for agencies billing clients on fixed retainers.</p>
          </div>
        </div>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">What to Avoid — Four Failure Modes</h2>

        <p className="text-sm text-neutral-700 leading-relaxed">
          These are real examples of P402 descriptions that partners have used in the wild that we've had to correct. Each one is wrong in a specific, instructive way.
        </p>

        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Bad Example</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Why It Fails</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">"P402 is like OpenRouter but with crypto payments."</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">Positions P402 as a derivative of a competitor rather than a standalone product. "Crypto payments" is vague and triggers skepticism in non-crypto audiences. We do not define ourselves relative to OpenRouter. Use this only if you're already deep in a comparison conversation and the prospect knows OpenRouter — and even then, follow up immediately with the actual differentiation.</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">"P402 uses AI to find the cheapest AI."</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">Circular and slightly absurd. Routing logic is algorithmic (scoring engine based on cost, latency, success rate, reputation) — not itself an AI system. Gemini is used for the intelligence/analytics layer but not for routing decisions. This claim is technically inaccurate and sounds cute but undermines credibility with technical audiences who will ask a follow-up question you cannot answer cleanly.</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">"P402 is a blockchain payment processor for AI."</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">"Blockchain payment processor" triggers association with crypto exchanges and NFT projects — it implies P402's core function is financial rather than orchestration. The x402 protocol is one capability within a broader routing and governance platform. Starting with blockchain positioning loses developer audiences who are cost-motivated but not Web3-native.</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">"P402 automatically picks the best AI model for every request."</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">Technically defensible but dangerously vague. "Best" is undefined — best by what metric? Without specifying cost / quality / speed, this reads as marketing fluff. Every AI middleware product says something similar. The sentence also omits the routing-across-providers differentiation, which is the mechanic that makes "best" meaningful. Always specify the optimization axis.</td>
            </tr>
          </tbody>
        </table>

        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          <strong>The one-sentence test:</strong> After reading your sentence, can a technical person immediately identify (1) what the product does mechanically, (2) who benefits, and (3) why it's better than the alternative? If any of those three are missing, the sentence needs revision. Use the eight approved examples above as the benchmark.
        </div>

      </div>
    ),
  },

  // -------------------------------------------------------------------------
  // 2. ICP Guide
  // -------------------------------------------------------------------------
  'icp-guide': {
    title: 'ICP Guide',
    category: 'Positioning & Messaging',
    categorySlug: 'positioning',
    updatedAt: 'April 2025',
    body: (
      <div className="space-y-6">

        <p className="text-sm text-neutral-700 leading-relaxed">
          Promoting P402 to the wrong audience is the fastest way to burn content distribution, credibility, and commission potential. This guide maps the exact customer segments who convert, the signals that identify them, and the message that unlocks each segment. Use it to qualify leads before you invest time, and to decide which angle to lead with.
        </p>

        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          ICP = Ideal Customer Profile. The profiles below are based on P402's actual customer data and conversion patterns, not hypothetical personas. Estimated deal sizes are based on average ARR per customer segment.
        </div>

        {/* Primary ICP */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">Primary ICP — Individual AI Developers and Agent Builders</h2>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Who They Are</h3>
        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Spending $50–$2,000/month directly on LLM API calls (OpenAI, Anthropic, Google)</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Building production applications — not demos, not learning projects. They have real users and real bills.</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Cost-aware but quality-sensitive: they've switched providers before or considered it, but worry about output degradation</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Have hit rate limits on at least one provider, or have been surprised by a monthly bill</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Using OpenAI SDK directly and are familiar with the completions API format</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>May be building autonomous agents (LangChain, AutoGen, CrewAI, OpenAI Agents SDK, custom)</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Typically indie developers, early-stage startup engineers, or solo founders</span></li>
        </ul>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Where to Find Them</h3>
        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>Twitter/X:</strong> Follow threads about "OpenAI pricing", "LLM costs", "rate limits" — people complaining in replies are warm leads</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>Reddit:</strong> r/LocalLLaMA, r/MachineLearning, r/SideProject — cost comparison posts convert well</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>Discord:</strong> LangChain, AutoGen, OpenAI developer Discord servers — especially #show-and-tell and #help channels</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>GitHub:</strong> Developers who have starred or forked OpenRouter, LiteLLM, or similar middleware repos are already pre-qualified</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>HackerNews:</strong> "Show HN" and "Ask HN: cheapest way to run X" threads</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>Dev.to / Hashnode:</strong> Tutorial content about AI API integration performs well organically with this audience</span></li>
        </ul>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">What They Care About (in Priority Order)</h3>
        <ol className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">1.</span><span><strong>Cost reduction</strong> — their LLM bill is a line item they defend in every budget conversation</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">2.</span><span><strong>Zero integration friction</strong> — they will not re-architect their app; the integration must be one endpoint swap</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">3.</span><span><strong>Output quality</strong> — cost savings that degrade results are worthless; the routing must be intelligent</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">4.</span><span><strong>Reliability</strong> — automatic failover when a provider is down; they've been burned before</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">5.</span><span><strong>Visibility</strong> — a dashboard that shows what's happening, what it costs, and where failures occurred</span></li>
        </ol>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Winning Message</h3>
        <div className="border-2 border-black p-4 my-3">
          <p className="text-sm font-black">"One API swap. Route across 13+ providers. Cut your LLM bill by 20–70% with semantic caching. Your existing OpenAI code works unchanged."</p>
          <p className="text-sm text-neutral-600 mt-2">Lead with cost, close with zero friction. In tutorials, show the before/after code diff (it's literally changing the base URL and API key). In social posts, lead with a concrete dollar amount — "I cut my AI bill from $400 to $180 last month" outperforms any abstract positioning.</p>
        </div>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Estimated Deal Size and LTV</h3>
        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Plan</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">MRR</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Your Commission (Track A)</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">12-Month LTV</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-neutral-200 px-3 py-2">Free → Pro conversion</td>
              <td className="border border-neutral-200 px-3 py-2">~$49/mo</td>
              <td className="border border-neutral-200 px-3 py-2">$9.80/mo × 12</td>
              <td className="border border-neutral-200 px-3 py-2">$117.60</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2">Pro (growing usage)</td>
              <td className="border border-neutral-200 px-3 py-2">$149/mo</td>
              <td className="border border-neutral-200 px-3 py-2">$29.80/mo × 12</td>
              <td className="border border-neutral-200 px-3 py-2">$357.60</td>
            </tr>
          </tbody>
        </table>
        <p className="text-sm text-neutral-700">Primary ICP customers are the highest-volume segment. A single tutorial post that converts 20 developers is worth $2,352–$7,152 in lifetime commissions depending on plan mix. Prioritize depth of reach into this segment over breadth.</p>

        {/* Secondary ICP */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">Secondary ICP — Automation Agencies and AI Consultants</h2>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Who They Are</h3>
        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Running AI-powered automations and workflows for 5–50 clients simultaneously</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Building with Make, n8n, Zapier, or custom Python/Node pipelines that call LLMs</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Passing LLM costs through to clients or absorbing them into flat-rate retainers</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Managing multiple API keys, billing across providers, and explaining AI costs to non-technical clients</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Typically 1–10 person operations; sometimes freelancers who have productized their services</span></li>
        </ul>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Where to Find Them</h3>
        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>Make/n8n communities:</strong> Facebook groups, subreddits, Discord servers — "AI automation" is a top topic</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>LinkedIn:</strong> Search "AI automation consultant", "AI agency owner" — direct outreach works well here because the value prop is immediately financial</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>YouTube:</strong> Comments on "AI automation tutorial" videos — people asking "how do I manage costs for multiple clients" are perfect leads</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>Skool / Circle communities:</strong> AI agency masterminds and cohort programs — members are actively spending money to grow and are highly receptive to cost optimization tools</span></li>
        </ul>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">What They Care About</h3>
        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>Margin protection</strong> — if LLM costs rise 20%, that hits their profit directly</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>Per-client cost visibility</strong> — they need to show clients what they're paying for</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>Reliability across client workloads</strong> — one provider outage affecting multiple clients is a crisis</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>Simplicity</strong> — they are not necessarily deep engineers; the dashboard and API must be operable without deep technical background</span></li>
        </ul>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Winning Message</h3>
        <div className="border-2 border-black p-4 my-3">
          <p className="text-sm font-black">"One P402 account, all your client workloads. Track spend by client, switch providers automatically when one goes down, and stop worrying about rate limits eating your margins."</p>
          <p className="text-sm text-neutral-600 mt-2">Agency leads respond to the multi-client management angle more than cost reduction per se. Show them the dashboard's routing decision log and spend analytics — these are the features that make their client billing conversations easier.</p>
        </div>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Estimated Deal Size and LTV</h3>
        <p className="text-sm text-neutral-700">Agency Track B partners can earn 25% recurring. A Track B agency referral converting to Pro plan: $49–$149/mo × 25% × 12 months = $147–$447 per referred customer. Agencies that become Track B partners often refer multiple clients — the network effect makes this segment disproportionately valuable despite lower initial deal size.</p>

        {/* Tertiary ICP */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">Tertiary ICP — Enterprise Teams Running AI at Scale</h2>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Who They Are</h3>
        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Companies with $5,000–$50,000+/month LLM spend across departments</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>AI/ML engineering teams with a VP or Director of AI who owns the model selection strategy</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Under pressure to show ROI on AI spend from finance and executive leadership</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Need spend governance — department-level budgets, approval workflows, per-agent spending limits</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Security-conscious: need audit logs, policy enforcement, and provable data handling</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Already considering or have used multiple LLM providers (not locked in at the application level)</span></li>
        </ul>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Where to Find Them</h3>
        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>LinkedIn:</strong> VP of AI Engineering, Head of AI Platform, Director of ML Infrastructure titles at 200–5,000 person companies</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>AI-first enterprise conferences:</strong> AI Engineer Summit, AI Summit, Enterprise AI World</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>Internal champions:</strong> Often a senior engineer advocates for P402 upward — focus on enabling the champion rather than reaching the buyer directly</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span><strong>Procurement-trigger content:</strong> Whitepapers and ROI calculators on "AI spend governance" perform well with this audience on LinkedIn and in email newsletters</span></li>
        </ul>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Winning Message</h3>
        <div className="border-2 border-black p-4 my-3">
          <p className="text-sm font-black">"P402 gives your AI teams a single control plane: route workloads intelligently across 13+ providers, enforce per-agent spending mandates, and get full audit logs — without rearchitecting your existing stack."</p>
          <p className="text-sm text-neutral-600 mt-2">For enterprise, the AP2 Mandate system (user-signed spending authorizations with configurable limits) and the policy engine are the differentiators. Lead with governance and visibility, then close with cost. Introduce the Enterprise plan and custom pricing early — enterprise buyers need to know custom terms are available before they invest evaluation time.</p>
        </div>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Estimated Deal Size and LTV</h3>
        <p className="text-sm text-neutral-700">Track C Enterprise Referral: 5–10% of year-one revenue. Enterprise contracts are custom-priced. A $60,000 first-year contract yields $3,000–$6,000 in referral commission. These deals require longer sales cycles — 30–90 days is typical. Prioritize only if you have direct relationships with enterprise AI decision-makers who trust your recommendation.</p>

        {/* Anti-ICP */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">Anti-ICP — Who P402 Is NOT For</h2>

        <p className="text-sm text-neutral-700 leading-relaxed">
          Spending promotional effort on anti-ICP segments wastes time and generates refund requests and churn that hurts your conversion metrics. Screen these out early.
        </p>

        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Segment</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Why They Won't Convert</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Screening Signal</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">Hobbyists spending under $10/month on LLMs</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">The cost savings don't justify the integration investment. Semantic cache benefits are real but not meaningful at this scale. Will sign up for Free, never upgrade, and may churn.</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">"I'm just learning" / "experimenting" language; questions about what a base URL is</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">Teams locked into Azure OpenAI with enterprise agreements</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">Contractually committed to a single provider with volume discounts that outprice P402's routing benefits. Switching costs are organizational, not technical. Their procurement team owns the AI spend.</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">"We're on Azure" / "our enterprise agreement covers this" / "IT procurement manages AI tools"</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">Companies that don't use LLMs in production</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">P402's value is tied entirely to LLM API cost and routing. If there's no LLM spend, there's nothing to route or optimize. This includes companies "exploring AI" without active API usage.</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">"We're evaluating AI use cases" / no existing OpenAI or Anthropic account</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium">Developers who only use local models (Ollama, LM Studio)</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">P402 routes across cloud LLM providers; local model users have already solved the cost problem differently. Their technical profile overlaps with the ICP but their use case does not.</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">"I run everything locally" / questions about self-hosted model support</td>
            </tr>
          </tbody>
        </table>

        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          <strong>Qualification shortcut:</strong> Before pitching anyone, ask one question: "What's your current monthly spend on LLM API calls?" Under $20: move on. $20–$50: light pitch, free plan entry. $50+: full pitch, Pro plan. $2,000+: Enterprise conversation. This single number qualifies the segment faster than any persona analysis.
        </div>

      </div>
    ),
  },

  // -------------------------------------------------------------------------
  // 3. Approved Claims
  // -------------------------------------------------------------------------
  'approved-claims': {
    title: 'Approved Claims',
    category: 'Positioning & Messaging',
    categorySlug: 'positioning',
    updatedAt: 'April 2025',
    body: (
      <div className="space-y-6">

        <p className="text-sm text-neutral-700 leading-relaxed">
          This is the definitive list of marketing claims partners are authorized to make about P402. Every claim here has been reviewed for accuracy and legal defensibility. Using a claim outside this list — even a paraphrase — creates compliance risk for you and brand risk for P402. When in doubt, come back to this list.
        </p>

        <div className="border-2 border-error px-4 py-3 text-sm text-error font-medium my-4">
          Approved claims must be used with the required caveats listed below. Omitting a caveat from a performance claim converts an approved statement into a prohibited one. This is not optional — it is a condition of the partner program.
        </div>

        {/* Category 1: Routing & Cost */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">Category 1 — Routing and Cost</h2>

        <div className="border-2 border-black p-5 my-4">
          <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-1">Claim 1.1 — Provider Count</div>
          <p className="text-sm font-black mb-2">"P402 routes LLM requests across 13+ AI providers."</p>
          <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500 mb-1">Evidence</p>
          <p className="text-sm text-neutral-700 mb-2">Supported providers include: OpenAI, Anthropic, Google (Gemini), Groq, Mistral, Cohere, DeepSeek, Fireworks, Perplexity, Together AI, AI21, OpenRouter, and additional providers accessible via OpenRouter's aggregation layer. The "13+" formulation is accurate and forward-compatible as the registry grows.</p>
          <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500 mb-1">Required Caveat</p>
          <p className="text-sm text-neutral-700">None required for the provider count claim. Do not inflate to "hundreds of models" without noting that many are accessed via OpenRouter's aggregation.</p>
        </div>

        <div className="border-2 border-black p-5 my-4">
          <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-1">Claim 1.2 — Semantic Cache Savings</div>
          <p className="text-sm font-black mb-2">"P402's semantic cache can reduce LLM API costs by 20–70% for workloads with repeated or similar queries."</p>
          <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500 mb-1">Evidence</p>
          <p className="text-sm text-neutral-700 mb-2">The semantic cache uses Google's text-embedding-004 model to detect semantically similar queries and serve cached responses without calling the LLM. Cache hit rates of 30–70% have been observed on customer workloads with high query repetition (customer support, FAQ-style applications, document Q&A). Lower-repetition workloads (creative generation, unique queries) see 10–30% savings.</p>
          <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500 mb-1">Required Caveat</p>
          <p className="text-sm text-neutral-700">Must include "for workloads with repeated or similar queries" or equivalent language. Do not state 20–70% as a universal guarantee. Acceptable: "up to 70%", "20–70% depending on workload", "30–70% for high-repetition workloads".</p>
        </div>

        <div className="border-2 border-black p-5 my-4">
          <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-1">Claim 1.3 — Routing Modes</div>
          <p className="text-sm font-black mb-2">"P402 offers four routing modes: cost (cheapest provider), quality (highest-performing), speed (lowest latency), and balanced (optimized blend)."</p>
          <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500 mb-1">Evidence</p>
          <p className="text-sm text-neutral-700 mb-2">These are the four documented routing modes in the P402 routing engine. The engine scores providers based on success rate, p95 settlement latency, reputation score, and health status — weighted differently per mode.</p>
          <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500 mb-1">Required Caveat</p>
          <p className="text-sm text-neutral-700">None required. You may describe the modes in your own words as long as the four mode names are accurate.</p>
        </div>

        <div className="border-2 border-black p-5 my-4">
          <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-1">Claim 1.4 — OpenAI Compatibility</div>
          <p className="text-sm font-black mb-2">"P402 is OpenAI API-compatible — existing applications using the OpenAI SDK can switch to P402 by changing the base URL and API key."</p>
          <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500 mb-1">Evidence</p>
          <p className="text-sm text-neutral-700 mb-2">P402 exposes POST /api/v2/chat/completions with OpenAI-compatible request and response schemas. Existing OpenAI SDK usage (Python, JavaScript, any language) can point to P402 without code changes beyond the base URL and key.</p>
          <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500 mb-1">Required Caveat</p>
          <p className="text-sm text-neutral-700">Partners must not claim 100% feature parity with OpenAI's full API surface (function calling, assistants, fine-tuning, image generation, etc. are not routed). The compatibility claim applies specifically to chat completions. Acceptable framing: "OpenAI-compatible chat completions endpoint".</p>
        </div>

        <div className="border-2 border-black p-5 my-4">
          <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-1">Claim 1.5 — Automatic Failover</div>
          <p className="text-sm font-black mb-2">"P402 automatically reroutes requests if a provider is down or rate-limited, with no manual intervention required."</p>
          <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500 mb-1">Evidence</p>
          <p className="text-sm text-neutral-700 mb-2">The routing engine incorporates real-time health status from provider health probes. Providers flagged as "down" or "degraded" are deprioritized or excluded from routing decisions. This is a live capability documented in the routing engine.</p>
          <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500 mb-1">Required Caveat</p>
          <p className="text-sm text-neutral-700">Do not guarantee zero downtime. Failover is routing-layer — if all providers simultaneously return errors for a given model, the request fails. Acceptable: "automatically reroutes to available providers" rather than "always available".</p>
        </div>

        <div className="border-2 border-black p-5 my-4">
          <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-1">Claim 1.6 — Spend Analytics Dashboard</div>
          <p className="text-sm font-black mb-2">"P402 provides a full analytics dashboard showing routing decisions, spend by provider, latency distributions, and traffic events in real time."</p>
          <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500 mb-1">Evidence</p>
          <p className="text-sm text-neutral-700 mb-2">The dashboard includes: spend overview, cache analytics, cost intelligence, provider comparison, routing decision trace (SSE), traffic events, and transaction history. Real-time data is delivered via Server-Sent Events.</p>
          <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500 mb-1">Required Caveat</p>
          <p className="text-sm text-neutral-700">None required. Screenshots of the dashboard are approved for partner content — contact your partner manager for approved assets.</p>
        </div>

        {/* Category 2: x402 Payments */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">Category 2 — x402 Payments and On-Chain Settlement</h2>

        <div className="border-2 border-black p-5 my-4">
          <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-1">Claim 2.1 — Gasless Payments</div>
          <p className="text-sm font-black mb-2">"P402's x402 protocol enables AI agents to pay for services in USDC on Base with no gas fees for the user — the facilitator covers gas."</p>
          <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500 mb-1">Evidence</p>
          <p className="text-sm text-neutral-700 mb-2">x402 uses EIP-3009 TransferWithAuthorization. The user signs a gasless authorization; the P402 facilitator submits the on-chain transaction and pays gas in ETH. The user's USDC balance decreases by the payment amount only — no gas cost to the user.</p>
          <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500 mb-1">Required Caveat</p>
          <p className="text-sm text-neutral-700">Must specify "for the user" — gas is not free, it is paid by the facilitator. Do not say "zero gas fees" without clarifying who pays. Acceptable: "users pay no gas fees", "gasless for the end user".</p>
        </div>

        <div className="border-2 border-black p-5 my-4">
          <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-1">Claim 2.2 — Agent-Native Payments</div>
          <p className="text-sm font-black mb-2">"P402's x402 protocol is designed for autonomous AI agents — agents can pay for services programmatically without human intervention or credit card billing."</p>
          <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500 mb-1">Evidence</p>
          <p className="text-sm text-neutral-700 mb-2">x402 implements HTTP 402 "Payment Required" as a machine-native response with signed USDC authorization. Agents that receive a 402 response can generate and submit payment payloads autonomously. No credit card, no human approval step at time of payment.</p>
          <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500 mb-1">Required Caveat</p>
          <p className="text-sm text-neutral-700">Initial wallet funding requires human action (loading USDC to the agent wallet). "No human intervention" applies to per-transaction payment, not to wallet setup. Clarify this if the context is technical.</p>
        </div>

        <div className="border-2 border-black p-5 my-4">
          <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-1">Claim 2.3 — Minimum Payment</div>
          <p className="text-sm font-black mb-2">"x402 supports micropayments as small as $0.01 USDC per request."</p>
          <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500 mb-1">Evidence</p>
          <p className="text-sm text-neutral-700 mb-2">The security minimum is enforced at $0.01 USDC in the x402 security check layer. This enables true per-request billing at LLM cost levels.</p>
          <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500 mb-1">Required Caveat</p>
          <p className="text-sm text-neutral-700">None required. This is a factual minimum value — do not inflate to "sub-cent" payments as the minimum is $0.01 not less.</p>
        </div>

        {/* Category 3: AP2 Governance */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">Category 3 — AP2 Mandates and Spend Governance</h2>

        <div className="border-2 border-black p-5 my-4">
          <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-1">Claim 3.1 — User-Controlled Spending Limits</div>
          <p className="text-sm font-black mb-2">"P402's AP2 Mandate system lets users set hard spending limits for AI agents — a mandate defines the maximum amount an agent can spend, the categories it can spend in, and the timeframe."</p>
          <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500 mb-1">Evidence</p>
          <p className="text-sm text-neutral-700 mb-2">AP2 Mandates are documented in the protocol: each mandate includes max_amount_usd, allowed_categories[], and valid_until. The policy engine enforces these at request time — a payment exceeding the mandate budget returns MANDATE_BUDGET_EXCEEDED.</p>
          <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500 mb-1">Required Caveat</p>
          <p className="text-sm text-neutral-700">None required for describing the feature. Do not imply mandates prevent all unauthorized spending at the smart contract level — enforcement is at the P402 application layer.</p>
        </div>

        <div className="border-2 border-black p-5 my-4">
          <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-1">Claim 3.2 — Policy Engine</div>
          <p className="text-sm font-black mb-2">"P402's policy engine allows teams to define per-route, per-model, or per-category spending rules that are enforced automatically before every AI call."</p>
          <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500 mb-1">Evidence</p>
          <p className="text-sm text-neutral-700 mb-2">The policy engine evaluates spending policies at request time. Policies are configurable in the dashboard under Policies. The AP2 mandate layer provides agent-specific governance on top of policies.</p>
          <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500 mb-1">Required Caveat</p>
          <p className="text-sm text-neutral-700">Do not represent policies as cryptographically enforced without qualification — enforcement is at the application layer, not smart contract level (unless using the on-chain x402 flow).</p>
        </div>

        {/* Category 4: Comparison Claims */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">Category 4 — Comparison Claims vs. Direct Provider Usage</h2>

        <div className="border-2 border-black p-5 my-4">
          <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-1">Claim 4.1 — Cost vs. Single-Provider Direct Access</div>
          <p className="text-sm font-black mb-2">"For workloads that use a single provider today, P402's cost-routing mode automatically selects lower-cost providers for appropriate requests, reducing overall LLM spend compared to using a single premium provider for everything."</p>
          <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500 mb-1">Evidence</p>
          <p className="text-sm text-neutral-700 mb-2">Providers like Groq (Llama-based), DeepSeek, and Together AI offer significantly lower token costs than OpenAI GPT-4o or Anthropic Claude for many request types. Routing simpler requests to lower-cost providers while preserving GPT-4o or Claude for complex requests produces genuine aggregate savings.</p>
          <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500 mb-1">Required Caveat</p>
          <p className="text-sm text-neutral-700">Do not make a specific percentage claim for cost-routing savings (as opposed to cache savings) without citing the customer's specific model mix. "Compared to using a single premium provider for everything" is a required qualifier.</p>
        </div>

        <div className="border-2 border-black p-5 my-4">
          <div className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-1">Claim 4.2 — Zero Lock-In</div>
          <p className="text-sm font-black mb-2">"P402 eliminates single-provider lock-in — switching which model or provider handles your requests is a dashboard setting change, not a code change."</p>
          <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500 mb-1">Evidence</p>
          <p className="text-sm text-neutral-700 mb-2">Because P402 presents an OpenAI-compatible endpoint, the application code does not reference individual provider APIs. Changing routing mode or preferred provider is a configuration change, not an integration change.</p>
          <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500 mb-1">Required Caveat</p>
          <p className="text-sm text-neutral-700">This applies to application-layer lock-in, not data lock-in. Don't extend the claim to data portability or model output consistency across providers.</p>
        </div>

        {/* Quick Reference Table */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">Quick Reference — Claim Approval Table</h2>

        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Claim</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Approved?</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Required Caveat</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-neutral-200 px-3 py-2">Routes across 13+ AI providers</td>
              <td className="border border-neutral-200 px-3 py-2 font-black text-success">Yes</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">None</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2">Reduce LLM costs 20–70% with semantic cache</td>
              <td className="border border-neutral-200 px-3 py-2 font-black text-success">Yes</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">Must add "for workloads with repeated or similar queries"</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2">Four routing modes: cost, quality, speed, balanced</td>
              <td className="border border-neutral-200 px-3 py-2 font-black text-success">Yes</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">None</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2">OpenAI-compatible API endpoint</td>
              <td className="border border-neutral-200 px-3 py-2 font-black text-success">Yes</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">Specify "chat completions" — not full OpenAI API parity</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2">Automatic failover when provider is down</td>
              <td className="border border-neutral-200 px-3 py-2 font-black text-success">Yes</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">Do not guarantee 100% uptime</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2">Gasless USDC payments (no gas fees for user)</td>
              <td className="border border-neutral-200 px-3 py-2 font-black text-success">Yes</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">Must specify "for the user" — facilitator pays gas</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2">Agents pay per request without human intervention</td>
              <td className="border border-neutral-200 px-3 py-2 font-black text-success">Yes</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">Initial wallet funding requires human action</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2">Micropayments from $0.01 USDC per request</td>
              <td className="border border-neutral-200 px-3 py-2 font-black text-success">Yes</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">None</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2">User-defined spending limits for AI agents (AP2 Mandates)</td>
              <td className="border border-neutral-200 px-3 py-2 font-black text-success">Yes</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">Enforcement is application-layer, not smart-contract-enforced by default</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2">Eliminates single-provider lock-in</td>
              <td className="border border-neutral-200 px-3 py-2 font-black text-success">Yes</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">Application-layer only; does not cover data portability</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2">Guaranteed 70% cost savings</td>
              <td className="border border-neutral-200 px-3 py-2 font-black text-error">No</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">See Prohibited Language article</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2">P402 uses AI to pick providers</td>
              <td className="border border-neutral-200 px-3 py-2 font-black text-error">No</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">Routing is algorithmic; Gemini is used for analytics/intelligence only</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2">Supports all OpenAI API features</td>
              <td className="border border-neutral-200 px-3 py-2 font-black text-error">No</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">See Prohibited Language article</td>
            </tr>
          </tbody>
        </table>

      </div>
    ),
  },

  // -------------------------------------------------------------------------
  // 4. Prohibited Language
  // -------------------------------------------------------------------------
  'prohibited-language': {
    title: 'Prohibited Language',
    category: 'Positioning & Messaging',
    categorySlug: 'positioning',
    updatedAt: 'April 2025',
    body: (
      <div className="space-y-6">

        <p className="text-sm text-neutral-700 leading-relaxed">
          This article defines what partners must not say when promoting P402. Violations create legal exposure, trigger FTC scrutiny on performance claims, damage P402's brand credibility with technical audiences who know when claims don't hold up, and may result in program suspension under Section 4 of the Partner Agreement. Read this before publishing any content.
        </p>

        <div className="border-2 border-error px-4 py-3 text-sm text-error font-medium my-4">
          If you are unsure whether a claim is permitted, do not publish it. Send it to your partner manager for review first. A one-day delay reviewing a claim is far less costly than content that requires a public correction.
        </div>

        {/* Category 1: False Performance Claims */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">Category 1 — False or Unqualified Performance Claims</h2>

        <p className="text-sm text-neutral-700 leading-relaxed">
          Performance claims are the highest-risk category. A savings claim without a caveat is not just misleading — it is potentially a deceptive trade practice under FTC guidelines on substantiation. P402's actual performance data is strong; the approved ranges in the Approved Claims article are genuine. There is no need to exaggerate.
        </p>

        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-1/3">Prohibited</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-1/3">Why It's Prohibited</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-1/3">Compliant Alternative</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium text-error">"Guaranteed 70% savings on AI costs"</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">"Guaranteed" is an absolute claim that requires 100% of users to achieve 70% savings. Cache savings depend on workload repetition; no guarantee is possible or accurate.</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">"Reduce LLM costs by up to 70% for workloads with repeated or similar queries"</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium text-error">"Cut your AI bill in half, guaranteed"</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">Same issue as above. "In half" is an unqualified 50% claim. "Guaranteed" makes it worse. A developer with a unique-query generation workload will not see 50% savings.</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">"Some customers see 50%+ savings from semantic caching — results depend on query repetition in your workload"</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium text-error">"10x cheaper than using OpenAI directly"</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">10x is not supported by any data. Routing to lower-cost providers produces real savings — but 10x would require the baseline cost to be 10 times higher than the routed cost, which is only possible in cherry-picked scenarios that do not represent typical use.</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">"For appropriate workloads, P402's routing engine can select providers that cost significantly less than GPT-4o per token"</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium text-error">"Zero latency with P402's speed routing"</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">Zero latency is physically impossible. Speed routing minimizes latency by selecting lowest-p95-latency providers — it does not eliminate latency.</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">"Speed routing selects the lowest-latency available provider for your request"</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium text-error">"P402 will save you $X per month" (specific dollar claim for a prospect)</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">You cannot predict a specific customer's savings without knowing their model mix, query repetition rate, current per-token cost, and routing mode. Specific dollar projections made to prospects create expectation liability.</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">Direct the prospect to P402's billing upgrade math tool, which calculates personalized savings from their actual usage data.</td>
            </tr>
          </tbody>
        </table>

        {/* Category 2: Misleading Comparisons */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">Category 2 — Misleading Comparisons and Cherry-Picked Benchmarks</h2>

        <p className="text-sm text-neutral-700 leading-relaxed">
          Comparison claims are valuable when they are fair. They are harmful — and prohibited — when they select the most favorable conditions to make P402 look better than it actually performs in typical use cases.
        </p>

        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-1/3">Prohibited</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-1/3">Why It's Prohibited</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-1/3">Compliant Alternative</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium text-error">"P402 outperforms [competitor] in every benchmark"</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">No routing middleware outperforms every other tool in every benchmark. "Every" is an absolute claim that cannot be substantiated and invites technical rebuttals that damage credibility.</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">Describe specific advantages in specific scenarios. "For cost-sensitive customer support workloads, P402's semantic cache outperforms direct LLM access significantly."</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium text-error">Benchmarks run exclusively on high-cache-hit workloads presented as typical results</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">Publishing a "70% savings" result from a workload with 90% cache hit rate — without disclosing that the workload was specifically selected for high repetition — is a deceptive benchmark. Technical readers will reproduce it and get different numbers.</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">Always disclose the workload type when publishing benchmark numbers: "Our FAQ automation workload (high query repetition) showed 68% cost reduction via semantic caching."</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium text-error">"OpenRouter charges more than P402" (general claim)</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">Pricing comparisons with named competitors require current, accurate pricing data that you as a partner cannot guarantee is up to date. Competitor pricing changes frequently. Naming a competitor with inaccurate pricing creates defamation risk and factual errors in your content.</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">Do not make named competitor pricing claims. Describe P402's pricing and let prospects draw their own comparisons.</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium text-error">"P402 is better than LiteLLM / OpenRouter / [other tool]"</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">"Better" is undefined without specifying the dimension. These tools serve overlapping but different use cases. Blanket superiority claims are not defensible and create adversarial dynamics with communities that use those tools.</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">Describe what P402 does that others do not: on-chain micropayment settlement, AP2 spending mandates, ERC-8004 agent identity. Let differentiation speak without deprecating competitors.</td>
            </tr>
          </tbody>
        </table>

        {/* Category 3: Unauthorized Product Claims */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">Category 3 — Unauthorized Product Claims</h2>

        <p className="text-sm text-neutral-700 leading-relaxed">
          Describing features that do not exist or have not been announced creates customer expectations that P402 cannot fulfill. This generates support tickets, refund requests, and reputational damage that hurts every partner. If you heard about a feature in conversation or saw something in a beta that has not been publicly documented, do not write about it without explicit approval.
        </p>

        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-1/3">Prohibited</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-1/3">Why It's Prohibited</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-1/3">Compliant Alternative</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium text-error">"P402 supports function calling and tool use across all providers"</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">Function calling support varies by provider and is not uniformly surfaced through P402's routing layer. Claiming universal function calling support sets expectations that will fail for many users.</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">Only make capability claims that are documented in P402's public API reference. Stick to chat completions compatibility.</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium text-error">"P402 is launching [unannounced feature] next month"</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">Roadmap commitments create legal and expectation liability. Products ship late. Features get cut. A partner publishing "launching next month" means P402 gets calls asking why the feature isn't live.</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">Only describe features that are live and documented. If you want to create excitement about direction, use "P402 is building toward X" language only after receiving written approval from your partner manager.</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium text-error">"P402 supports image generation / fine-tuning / assistants"</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">P402's OpenAI compatibility covers chat completions. Image generation (DALL-E), fine-tuning, assistants API, embeddings API, and speech APIs are not routed through P402.</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">"P402 routes chat completion requests across 13+ providers via an OpenAI-compatible endpoint"</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium text-error">"P402's AI automatically selects the best model for your request"</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">Routing is algorithmic (scoring engine), not AI-driven. Gemini is used for the intelligence and analytics layer but does not make per-request routing decisions. Implying AI selects models is inaccurate and anthropomorphizes a deterministic process.</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">"P402's routing engine scores available providers on cost, speed, and reliability — and routes each request to the optimal provider based on your selected mode"</td>
            </tr>
          </tbody>
        </table>

        {/* Category 4: Regulatory */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">Category 4 — Regulatory Red Flags</h2>

        <p className="text-sm text-neutral-700 leading-relaxed">
          Financial and investment language used in connection with a crypto-adjacent product (USDC, Base, ERC-8004) triggers regulatory risk. P402 is a developer infrastructure product, not a financial product. The following language patterns must be avoided entirely.
        </p>

        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-1/3">Prohibited</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-1/3">Why It's Prohibited</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-1/3">Compliant Alternative</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium text-error">"Earn yield on your USDC by routing through P402"</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">P402 does not offer yield on USDC. Falsely implying investment returns on stablecoin holdings is potential securities fraud and clearly inaccurate. P402 uses USDC as a payment medium, not an investment vehicle.</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">Do not connect P402 to any concept of yield, returns, or investment value.</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium text-error">"P402 token" / "P402 coin" / "P402 rewards"</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">P402 does not have a native token, coin, or on-chain reward mechanism. Implying one — even by implication or speculation — could be treated as promoting an unregistered security offering.</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">P402 uses USDC (Circle's regulated stablecoin) for payment settlement. Do not associate any speculative token with the P402 brand.</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium text-error">"P402 is a smart investment for AI developers" (investment framing)</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">Framing a software subscription as an "investment" is financial advice language. Even colloquially, it triggers FTC and SEC sensitivity in a crypto-adjacent context.</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">"P402 reduces operating costs for AI developers" — describe the financial benefit as a cost reduction, not an investment return.</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium text-error">"This is not financial advice, but you should definitely use P402 to manage your crypto" (disclaimer + advice)</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">The disclaimer does not neutralize the advice. Adding "NFA" and then giving a financial recommendation is a known regulatory pattern that regulators explicitly do not accept as sufficient protection. P402 is not a crypto management tool; it is a developer API infrastructure product.</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">Describe P402 as software infrastructure for AI developers. Keep financial and crypto language limited to accurate technical descriptions: "settles payments in USDC on Base mainnet".</td>
            </tr>
          </tbody>
        </table>

        {/* Category 5: Brand Misuse */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">Category 5 — Brand Misuse</h2>

        <p className="text-sm text-neutral-700 leading-relaxed">
          Brand misuse damages P402's recognition and can trigger trademark issues with third parties. Follow these rules precisely.
        </p>

        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-1/3">Prohibited</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-1/3">Why It's Prohibited</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide w-1/3">Correct Usage</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium text-error">Writing "P-402", "p402", "P 402", "Pay402", or any other variant</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">The correct brand name is P402 — uppercase P, numeral 402, no space, no hyphen. Non-standard spellings undermine brand recognition and look unprofessional to technical audiences.</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600"><strong>P402</strong> — always. In all-caps contexts: P402. Never lowercase the P.</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium text-error">Using a modified, recolored, or outdated P402 logo</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">Logo modifications — changing color, adding effects, stretching proportions, adding your own watermark over it — are not permitted under the partner brand guidelines. Outdated logos create inconsistency.</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">Download approved logo assets from the Partner Assets section of your partner dashboard. Use only current, unmodified logo files. Contact your partner manager for custom co-branded assets.</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium text-error">Implying partnership status you don't have: "P402 Official Partner" without the badge</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">Using "official" implies a level of endorsement that may not match your actual program tier. It can also imply P402 has reviewed and approved your content — which constitutes a false endorsement claim.</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">Use the exact tier language: "P402 Developer Affiliate", "P402 Agency Partner", or "P402 Referral Partner" per your agreement. Use the approved badge from the Partner Assets section.</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium text-error">Using third-party brand names (OpenAI, Anthropic, Google) in ways that imply those companies endorse P402</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">"Works with OpenAI" is fine. "OpenAI-recommended" or "Anthropic-certified" is trademark misuse — these companies have not endorsed P402. It also violates their own partner and brand use guidelines.</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">"Routes requests to OpenAI, Anthropic, Google, and 10+ other providers" — factual description of integration, no endorsement implied.</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 font-medium text-error">Calling P402 a "crypto platform", "DeFi tool", "Web3 dApp", or "blockchain startup"</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">These labels activate anti-crypto filtering in developer communities, enterprise procurement, and media. P402 is an AI infrastructure product that uses blockchain settlement for one protocol layer. Leading with crypto categorization dramatically narrows the addressable audience.</td>
              <td className="border border-neutral-200 px-3 py-2 text-neutral-600">"AI payment router", "AI orchestration platform", "multi-provider LLM routing infrastructure" — use AI-first category language.</td>
            </tr>
          </tbody>
        </table>

        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          <strong>If content has already been published with prohibited language:</strong> Edit or remove the content immediately and notify your partner manager. Do not wait for a scheduled update cycle. Leaving prohibited claims live after you become aware of them converts an honest mistake into a knowing violation under the partner agreement.
        </div>

        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">Quick Reference — Prohibited vs. Permitted</h2>

        <table className="w-full text-sm border-2 border-black my-4">
          <thead>
            <tr>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Say This</th>
              <th className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-left font-black text-[10px] uppercase tracking-wide">Not This</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 text-success font-medium">Up to 70% cost reduction for high-repetition workloads</td>
              <td className="border border-neutral-200 px-3 py-2 text-error font-medium">Guaranteed 70% savings</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 text-success font-medium">Routes across 13+ AI providers</td>
              <td className="border border-neutral-200 px-3 py-2 text-error font-medium">Access hundreds of models</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 text-success font-medium">OpenAI-compatible chat completions endpoint</td>
              <td className="border border-neutral-200 px-3 py-2 text-error font-medium">Full OpenAI API replacement</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 text-success font-medium">Gasless USDC payments for the end user</td>
              <td className="border border-neutral-200 px-3 py-2 text-error font-medium">Zero gas fees (no qualifier)</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 text-success font-medium">Algorithmic routing engine selects optimal provider</td>
              <td className="border border-neutral-200 px-3 py-2 text-error font-medium">AI automatically picks the best model</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 text-success font-medium">Reduces operating costs for AI developers</td>
              <td className="border border-neutral-200 px-3 py-2 text-error font-medium">Smart investment in your AI stack</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 text-success font-medium">AI payment router / AI orchestration platform</td>
              <td className="border border-neutral-200 px-3 py-2 text-error font-medium">Crypto platform / DeFi tool / blockchain startup</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 text-success font-medium">P402 Developer Affiliate (your exact tier name)</td>
              <td className="border border-neutral-200 px-3 py-2 text-error font-medium">P402 Official Partner (implies endorsement)</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 text-success font-medium">P402 (always, exactly)</td>
              <td className="border border-neutral-200 px-3 py-2 text-error font-medium">p402 / P-402 / Pay402 / P 402</td>
            </tr>
            <tr>
              <td className="border border-neutral-200 px-3 py-2 text-success font-medium">Routes requests to OpenAI, Anthropic, and 11+ other providers</td>
              <td className="border border-neutral-200 px-3 py-2 text-error font-medium">OpenAI-recommended / Anthropic-certified</td>
            </tr>
          </tbody>
        </table>

      </div>
    ),
  },

}
