import React from 'react'
import type { ArticleContent } from '../[slug]/page'

// ---------------------------------------------------------------------------
// Launch Campaigns — 4 articles
// ---------------------------------------------------------------------------

export const campaignArticles: Record<string, ArticleContent> = {

  // =========================================================================
  // 1. NEWSLETTER TEMPLATES
  // =========================================================================

  'newsletter-template': {
    title: 'Newsletter Template',
    category: 'Launch Campaigns',
    categorySlug: 'campaigns',
    updatedAt: 'April 2025',
    body: (
      <div className="space-y-6">

        <p className="text-sm text-neutral-700 leading-relaxed">
          Three complete newsletter editions — ready to send. Each is written for a specific audience and angle.
          Drop in your referral link, adjust the first-person references to match your voice, and hit send.
          Do not forward these templates verbatim to multiple lists simultaneously — stagger by at least 72 hours.
        </p>

        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          Your referral link format: <strong>p402.io/r/YOUR_CODE</strong> — find your code in the Links tab of your partner dashboard.
          Every edition below marks the insertion point with <strong>[YOUR_LINK]</strong>.
        </div>

        {/* ---- EDITION A ---- */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Edition A — "The LLM API Bill Problem"
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Audience: AI developers, indie hackers, technical builders. Angle: cost pain → router as solution.
        </p>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Subject Lines (pick one)</h3>
        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>My OpenAI bill is getting embarrassing</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>How much of your API spend is pure waste?</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>The quiet cost of building AI products</span></li>
        </ul>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Preview Text</h3>
        <p className="text-sm text-neutral-700 leading-relaxed">
          You're probably paying full price for requests that could be cached, routed cheaper, or served by a different model entirely.
        </p>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Body Copy</h3>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`Something happened last month that I can't stop thinking about.

I was reviewing my API spend across a side project — nothing huge,
a few thousand requests a day — and I realized I'd spent $340 on
OpenAI calls in 30 days. For a product that had maybe 60 active users.

That's $5.67 per active user per month. Just in inference costs.

The rough math: if I scaled to 1,000 users at that rate, I'm looking
at $5,670/month before I've paid for hosting, database, my own time,
or anything else. That's not a business. That's a donation program
with a login screen.

The thing is, a large portion of those API calls were predictable.
The same types of questions. The same patterns. Same models, same
temperatures, same system prompts, same results — billed fresh every
single time.

I've been testing something called P402 for the past few weeks.
It sits in front of your LLM calls — completely transparent to your
existing code — and handles two things:

1. Semantic caching. If a request is similar enough to something
   you've already answered, it returns the cached result instead
   of hitting the API again. "Similar enough" is determined by
   vector embedding, not exact match, so it actually works.

2. Smart routing. When you do need a live inference call, it picks
   the right provider for the job — not just OpenAI every time.
   Groq for speed, DeepSeek for cost-sensitive tasks, Claude for
   anything requiring careful reasoning. 13+ providers, one endpoint.

The migration is literally two lines of code. Change the base URL
and your API key. Everything else — your SDK, your prompts, your
response handling — stays exactly the same.

I'm not going to make up a savings number because it depends entirely
on your usage patterns. What I will say is that on my test workload,
the cache hit rate was higher than I expected, and routing to cheaper
models for the right task categories made a real difference.

If you're spending more than you'd like on LLM APIs and you want to
try it without rewriting anything: [YOUR_LINK]

Free to start. No commitment.

– [Your name]

P.S. If you've already found a good solution to this problem, I'd
genuinely love to hear what you're doing. Hit reply.`}</code></pre>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Customization Notes</h3>
        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Replace the $340 / 60 users numbers with your own real figures if you have them — specificity builds credibility.</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>The model examples (Groq, DeepSeek, Claude) are accurate — keep them if your audience knows these names.</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Add a sentence about your specific use case (RAG pipeline, chatbot, coding assistant) to make the opening more personal.</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Insert [YOUR_LINK] two-thirds of the way down, where shown, not at the top — let the problem land first.</span></li>
        </ul>

        {/* ---- EDITION B ---- */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Edition B — "Your AI Agents Need a Bank Account"
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Audience: general AI enthusiasts, product thinkers, early adopters. Angle: autonomous agent payments, x402 protocol.
        </p>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Subject Lines (pick one)</h3>
        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>What happens when AI agents need to pay for things?</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>The missing piece in autonomous AI: money</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>AI agents can already pay for things. Most people don't know this yet.</span></li>
        </ul>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Preview Text</h3>
        <p className="text-sm text-neutral-700 leading-relaxed">
          The next phase of AI agents isn't smarter reasoning. It's economic autonomy.
        </p>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Body Copy</h3>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`Here's a problem nobody talks about enough:

AI agents are getting genuinely capable. They can browse the web,
write code, execute tasks, manage files, coordinate with other agents.
But every time one of them needs to access a paid service — an API,
a data provider, a specialized model — the whole thing breaks down
into a human-in-the-loop problem.

The agent has to stop. Ask for approval. Wait for a human to type
in a credit card. Then continue.

That's not autonomy. That's a very elaborate to-do list.

The reason this hasn't been solved is that payments were designed
for humans. Credit cards need a cardholder. Bank transfers need an
account holder. Even crypto payments require wallets and keys that
someone has to manage.

What you need for truly autonomous agents is a payment primitive
that works machine-to-machine. Something the agent can execute
without calling a human, without managing private keys, and without
creating a security hole you'll regret later.

There's a protocol called x402 that does exactly this. The short
version: it uses a gasless USDC transfer mechanism (EIP-3009, if
you want to look it up) where the agent signs a payment authorization
that a facilitator executes on-chain. The user sets a spending budget
upfront — called an AP2 mandate — and the agent draws from that budget
autonomously, within the defined limits, without ever asking again.

Think of it like a corporate card with automatic spending rules.
You give your agent a $50/month budget for data APIs. It spends up
to that limit on its own. When it hits the ceiling, payments stop.
No card numbers. No human approvals mid-task. No runaway spend.

P402 is building the infrastructure for this. It's primarily an AI
payment router today — routes your LLM calls across 13+ providers,
handles caching, cuts costs — but it also implements the x402 protocol
natively. Which means if you're building agents today, you can start
wiring up proper payment rails instead of duct-taping credit cards
to your automation flows.

Worth exploring if you're serious about autonomous systems: [YOUR_LINK]

– [Your name]

P.S. The AP2 mandate concept (spend governance for agents) is
particularly interesting for anyone building multi-agent pipelines.
Happy to go deeper on that in a future issue if there's interest.`}</code></pre>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Customization Notes</h3>
        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>This edition works for any audience interested in AI futures — even non-technical readers track with the "corporate card" analogy.</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>If your audience is more technical, add one sentence: "The settlement happens on Base L2, so gas is negligible."</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>The P.S. is an engagement hook — if you get replies about mandates, that's a great signal for your next issue.</span></li>
        </ul>

        {/* ---- EDITION C ---- */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Edition C — "The OpenAI Trap and How to Escape It"
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Audience: broader builder/maker audience, product teams, non-specialist AI adopters. Angle: vendor lock-in, 2-line migration.
        </p>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Subject Lines (pick one)</h3>
        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Are you accidentally locked into one AI provider?</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>The 2-line code change that ended my OpenAI dependency</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Single-provider AI is the new single point of failure</span></li>
        </ul>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Preview Text</h3>
        <p className="text-sm text-neutral-700 leading-relaxed">
          If your entire AI product depends on one provider's pricing, uptime, and policy decisions — that's a risk most builders aren't pricing in.
        </p>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Body Copy</h3>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`Let me describe a situation that I suspect is common:

You built something with the OpenAI API. It works. Users like it.
You're somewhat invested in the sdk, the response format, the
function-calling interface, the rate limits you've negotiated around.

And somewhere in the back of your head, you know that if OpenAI
raises prices, changes a model, deprecates something, or has a bad
outage week — your product feels it immediately. You have no leverage
and no fallback. You are entirely downstream.

That's the trap. Not malicious. Not unusual. Just a technical debt
that accumulates invisibly until the moment it doesn't.

The hard part of escaping it is that every alternative requires
rewriting your integrations. Different SDKs. Different response
schemas. Different error handling. Different rate limit behavior.
Anthropic's API is not OpenAI's API. Gemini's API is not either.
You'd be rebuilding the same plumbing for every provider you add.

Unless you use something that sits in front of all of them and
presents a single, OpenAI-compatible interface regardless of which
model is actually running.

P402 does this. You change your base URL and your API key.
That's it. Your existing OpenAI SDK keeps working. Your prompts
stay the same. Your response handling stays the same. But now
instead of being locked to one provider, you have 13+ behind
a single endpoint — and a routing layer that picks the right one
based on cost, speed, or quality depending on what you configure.

If OpenAI goes down, traffic routes around it automatically.
If a cheaper model is good enough for a particular task category,
the router uses it. If you want the best available model for
critical queries, you set that preference and it's enforced.

This is what infrastructure should look like for AI products in 2025.
Provider-agnostic. Resilient. Cost-aware. And — critically —
not requiring you to rewrite everything to get there.

If you want to try it: [YOUR_LINK]

Free tier available. The 2-line migration is real — I tested it.

– [Your name]

P.S. The thing I didn't expect: the routing logs. Seeing which
provider handled which request, at what cost, with what latency —
that's genuinely useful data that I didn't have before.`}</code></pre>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Customization Notes</h3>
        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>The "2-line migration is real — I tested it" line in the P.S. should be TRUE before you send it. Spend 10 minutes verifying this yourself so you can say it authentically.</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>This edition converts well when it follows a news hook — a major OpenAI outage, pricing change, or deprecation announcement. Time it accordingly.</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>The routing logs P.S. is specific and true — it builds trust. Keep it.</span></li>
        </ul>

      </div>
    ),
  },

  // =========================================================================
  // 2. X / TWITTER THREADS
  // =========================================================================

  'x-twitter-threads': {
    title: 'X/Twitter Threads',
    category: 'Launch Campaigns',
    categorySlug: 'campaigns',
    updatedAt: 'April 2025',
    body: (
      <div className="space-y-6">

        <p className="text-sm text-neutral-700 leading-relaxed">
          Four complete threads plus five standalone tweets. Each thread is written to be posted as a numbered sequence.
          Keep tweet lengths under 280 characters. The character counts below are approximate — verify in a composer before posting.
        </p>

        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          Replace <strong>[YOUR_LINK]</strong> with your referral URL (p402.io/r/YOUR_CODE) in every tweet that contains it.
          Thread-closing tweets are the highest-converting placement — always include your link there.
        </div>

        {/* ---- THREAD A ---- */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Thread A — "The Cost of Building with AI"
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Audience: cost-aware developers, bootstrappers, indie hackers. Tone: honest, slightly frustrated, practical.
        </p>

        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Full Thread (post as sequence)</p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`1/7
Nobody talks about the real cost of building AI products.

Not the hype cost. The actual dollar cost.

Here's what I've learned after 6 months of shipping LLM-powered features 👇

---

2/7
Month one of my AI project: $47 in API costs. No big deal.

Month three: $190. Okay, it's growing.

Month five: $380. I started getting uncomfortable.

Month six: I sat down and actually analyzed the bills.

---

3/7
What I found:

• A significant chunk of requests were near-identical queries
  (same user, same intent, billed fresh each time)
• I was defaulting to GPT-4 for everything —
  including tasks where a cheaper model was fine
• I had no visibility into which requests were
  worth the premium vs. wasted

All of this was fixable. I just hadn't prioritized fixing it.

---

4/7
The fix I landed on: P402

It's an AI payment router. You point it at your existing
OpenAI integration (literally change 2 lines of code), and it:

→ Caches semantically similar requests (vector embedding, not exact match)
→ Routes to cheaper providers when the task allows it
→ Keeps a routing log so you can actually see what's happening

---

5/7
The part I didn't expect: semantic caching actually works.

"What's the weather like?" and "Is it raining right now?"
are different strings but similar intent. The cache handles that.

If you have a high-volume app with predictable query patterns,
the cache hit rate is higher than you'd think.

---

6/7
I'm not going to quote a specific savings % because it depends
entirely on your usage patterns.

What I will say: the combination of smart routing + semantic caching
hit my specific workload in a way that made a real difference.

And I didn't have to rewrite anything to get there.

---

7/7
If you're building with AI and your API bills are climbing:

→ Free to try: [YOUR_LINK]
→ Takes about 10 minutes to integrate
→ No commitment, no contract

The routing logs alone are worth it — visibility into what
you're actually spending and why.

RT if this is relevant to someone you know building with AI.`}</code></pre>

        {/* ---- THREAD B ---- */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Thread B — "How x402 Works" (Education Thread)
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Audience: crypto-curious builders, AI agent developers. Tone: clear, educational, forward-looking.
        </p>

        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Full Thread (post as sequence)</p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`1/8
AI agents will need to pay for things autonomously.

Not through your credit card. Not by asking a human for approval.
On their own. Machine-to-machine.

Here's how x402 makes that possible, explained plainly 👇

---

2/8
The problem:

Current AI agents hit a wall whenever they need to access
something that costs money. They have to stop, escalate to a human,
wait for payment, then resume.

That's not autonomy. That's a very polite chatbot with extra steps.

---

3/8
The root cause: payments were designed for humans.

Credit cards need cardholders.
Bank accounts need account holders.
Even crypto wallets need someone managing keys.

None of these primitives work natively for automated systems
operating without human supervision.

---

4/8
x402 is an HTTP payment protocol that treats payment as a
first-class part of the request lifecycle.

The short version:
• Your resource (API, data, service) returns HTTP 402 when payment is required
• The agent signs a gasless USDC authorization (EIP-3009)
• A facilitator executes the transfer on Base L2
• The resource delivers. No human involved.

---

5/8
The spending control layer is called an AP2 mandate.

Think of it like a corporate card limit enforced at the protocol level:

• You allocate a budget (e.g., $50/month for data APIs)
• The agent draws from that budget autonomously
• When it hits the ceiling, payments stop — automatically
• No runaway spend. No surprise bills.

---

6/8
Why Base L2?

Gas on Ethereum mainnet would make micropayments impractical.
Base keeps fees low enough that $0.01 payments are economically viable.

The user never pays gas — that's handled by the facilitator.
The agent just signs an authorization. The facilitator executes.

---

7/8
Who's building this infrastructure?

P402 is implementing x402 natively — it's already in production
as part of their AI routing platform. The same endpoint that routes
your LLM calls across 13+ providers also handles the payment rails
for autonomous agent spending.

---

8/8
We're early. But "agents with economic autonomy" is not a future thing.

The infrastructure exists now. The protocol is working.
The question is who starts building on top of it.

If you're building agents and want to explore this: [YOUR_LINK]

♻️ Repost if you know someone working on autonomous agent architectures.`}</code></pre>

        {/* ---- THREAD C ---- */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Thread C — "I Switched My AI Stack to P402"
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Audience: builders following you personally. Tone: narrative, first-person, honest about the experience.
          Write this as your genuine experience — adapt the specifics to match your actual use case.
        </p>

        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Full Thread (post as sequence)</p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`1/7
Two weeks ago I switched my AI project's LLM routing to P402.

Here's what actually changed (honest take, not a paid review) 👇

---

2/7
Background:

I've been building [describe your project briefly — chatbot,
coding tool, RAG pipeline, etc.] for about [X months].

It was running entirely on OpenAI. GPT-4o for most things,
GPT-3.5 when I remembered to route to it.

My API bill had crossed a number I wasn't comfortable with.

---

3/7
The migration:

I changed my base URL from api.openai.com to the P402 endpoint.
Swapped my API key.
Left everything else exactly as it was.

That's genuinely it. The OpenAI SDK kept working.
My prompts didn't change. My response handling didn't change.

Took maybe 15 minutes including reading the docs.

---

4/7
What changed immediately:

→ Routing logs. I could finally see which model handled which
  request, at what cost, with what latency.

That visibility alone was worth it. I had no idea how much
variance there was in my request patterns.

---

5/7
What changed over the next week:

→ The semantic cache started picking up repeated query patterns
  I hadn't noticed before. Users ask similar things in different
  ways — the vector-based cache handled that.

→ Cost-mode routing moved some of my lighter tasks to
  more cost-efficient providers. Quality on those tasks: fine.

---

6/7
What I'd do differently:

Start with the routing logs before changing any routing settings.
Understand your actual request patterns first.

The temptation is to immediately enable aggressive cost routing
everywhere. Don't. Read the logs first, then make deliberate choices
about which task categories can tolerate a different model.

---

7/7
Overall: it solved the problem I had without creating new ones.

The migration was easy. The visibility was immediately useful.
The cost impact was real on my specific workload.

If you want to try it yourself: [YOUR_LINK]

Happy to answer specific questions about the migration — reply or DM.`}</code></pre>

        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          Customization required for Thread C: Fill in your actual project description (tweet 2), your actual migration experience (tweet 3), and your genuine observations (tweets 4–6).
          This thread converts best when it's demonstrably personal. Do not post it verbatim without adapting it.
        </div>

        {/* ---- THREAD D ---- */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Thread D — "The Governance Problem with AI Agents"
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Audience: enterprise builders, CTOs, platform engineers. Tone: problem-forward, systems-thinking.
        </p>

        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Full Thread (post as sequence)</p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`1/6
The AI governance problem nobody's talking about:

You can set what your agent is allowed to *do*.
But you can't easily set what it's allowed to *spend*.

That's a serious gap for anyone deploying agents in production. 👇

---

2/6
Think about how you control human spending in a company:

• Expense policies with per-category limits
• Corporate cards with automatic rules
• Approval workflows above certain thresholds
• Audit trails for every transaction

None of this exists natively for AI agents.
An agent making API calls has no spending boundaries by default.

---

3/6
The current workarounds are bad:

Option A: Give the agent full access to a payment method (terrifying)
Option B: Require human approval for every payment (kills autonomy)
Option C: Hardcode limits in your application layer (brittle, not auditable)

None of these scale. None of them are the right abstraction.

---

4/6
The right abstraction: spending mandates at the protocol layer.

P402 implements something called AP2 mandates:

• A signed authorization from a user to an agent
• Defines max spend, allowed categories, expiry
• Enforced by the payment infrastructure — not your app code
• Auditable. Revocable. Composable with multi-agent pipelines.

---

5/6
This matters more as agents get more capable.

A research agent that can purchase data. A coding agent that
can spin up infrastructure. An orchestrator that delegates to
sub-agents with their own budgets.

The spending governance problem compounds fast.
The time to solve it is before you're in production, not after.

---

6/6
P402 is the platform building this infrastructure.

It's live. The mandate system is implemented.
The payment rails (x402, gasless USDC on Base) work.

If you're building agentic systems and want to explore the
governance layer: [YOUR_LINK]

This is infrastructure-level thinking for AI teams building seriously.`}</code></pre>

        {/* ---- STANDALONE TWEETS ---- */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Standalone Tweets (5)
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Post these individually, spaced at least 24 hours apart. Each is written to stand alone and drive clicks.
        </p>

        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Tweet 1 — Cost Hook</p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`LLM API costs are mostly a routing problem.

You're paying GPT-4 prices for tasks that don't need GPT-4.
You're paying inference costs for queries you've already answered.

P402 routes across 13+ providers + semantic caching, OpenAI-compatible.

Worth 15 minutes: [YOUR_LINK]`}</code></pre>

        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Tweet 2 — Migration Hook</p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`"Change 2 lines of code" is usually marketing language.

For P402 it's literally true: swap the base URL + API key,
your OpenAI SDK keeps working, you now have 13+ providers behind it.

Tried it. Confirmed. [YOUR_LINK]`}</code></pre>

        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Tweet 3 — x402 Hook</p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`AI agents will need to pay for things autonomously.

Not via your credit card. Not by asking a human.
Machine-to-machine, with spending limits enforced at the protocol level.

This infrastructure exists now. It's called x402.

P402 is building on it: [YOUR_LINK]`}</code></pre>

        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Tweet 4 — Vendor Lock-in Hook</p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`Hot take: single-provider LLM integration is the new single point of failure.

One pricing change. One bad outage week. One deprecation notice.
You feel all of it immediately.

P402 routes across 13+ providers — OpenAI SDK, zero rewrites.

Free to start: [YOUR_LINK]`}</code></pre>

        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Tweet 5 — Curiosity Hook</p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`The most underrated part of P402: the routing logs.

You get visibility into which model handled which request,
at what cost, with what latency.

I didn't know how much I didn't know about my own AI costs
until I saw this data.

[YOUR_LINK] — free tier available`}</code></pre>

      </div>
    ),
  },

  // =========================================================================
  // 3. YOUTUBE DESCRIPTION TEMPLATES
  // =========================================================================

  'youtube-description-template': {
    title: 'YouTube Description Template',
    category: 'Launch Campaigns',
    categorySlug: 'campaigns',
    updatedAt: 'April 2025',
    body: (
      <div className="space-y-6">

        <p className="text-sm text-neutral-700 leading-relaxed">
          Three complete YouTube description templates for the most common video types P402 partners create.
          Each includes title options, tags, FTC-compliant disclosure language, and pinned comment copy.
        </p>

        <div className="border-2 border-error px-4 py-3 text-sm text-error font-medium my-4">
          FTC Requirement: Any video where you may receive a commission for referrals MUST include an affiliate
          disclosure that is clear, conspicuous, and in plain language. Place it at or near the top of your description —
          not buried at the bottom. The templates below include compliant disclosure language. Do not remove it.
        </div>

        {/* ---- TYPE A ---- */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Type A — Tutorial Video
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Suggested angle: "How to reduce your OpenAI API costs" — demonstrates the P402 integration with real code.
        </p>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Title Options (A/B test these)</h3>
        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>How I Reduced My OpenAI API Costs (Without Changing My Code)</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Cut Your LLM API Bills With This 2-Line Code Change</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Route AI Requests Across 13 Providers With One Endpoint (P402 Tutorial)</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>AI Cost Optimization in 2025: Semantic Caching + Smart Routing Explained</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Stop Paying Full Price for Every LLM Call — Here's the Fix</span></li>
        </ul>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Full Description Template</h3>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`⚡ Affiliate disclosure: Links marked with * are referral links.
I may earn a commission if you sign up — at no extra cost to you.
I only recommend tools I've personally tested.

---

In this video I walk through how to set up P402 to route your LLM
requests across multiple AI providers — and what that actually does
to your API costs.

If you're building with OpenAI (or any LLM API) and your bills are
climbing, this is worth 15 minutes of your time.

---

⏱ TIMESTAMPS
00:00 — The LLM cost problem (why this matters)
02:30 — What P402 actually does (routing + caching explained)
05:45 — The 2-line integration (live demo)
09:20 — Routing modes: cost vs. quality vs. speed vs. balanced
13:00 — Semantic caching — how it works and when it helps
17:30 — Reading the routing logs
21:00 — My honest take: what it solves and what it doesn't

---

🔗 LINKS
→ P402 (free to start)*: [YOUR_LINK]
→ P402 docs: https://p402.io/docs
→ x402 protocol overview: https://p402.io/docs/router
→ [Your blog post or written version of this video, if applicable]
→ [Your GitHub repo with example code, if applicable]

---

📋 WHAT YOU'LL NEED
• An existing OpenAI API integration (any language/SDK)
• A P402 account (free tier available)
• About 10 minutes to complete the integration

---

💬 QUESTIONS?
Drop them in the comments below — I read everything and try
to respond to technical questions within 48 hours.

If you've already integrated P402, share your experience below.
Especially interested in what your cache hit rates look like.

---

🔔 SUBSCRIBE for more AI infrastructure and cost optimization content.

---

* Affiliate link — see disclosure at top of description.`}</code></pre>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Tags</h3>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`openai api, llm cost optimization, ai api costs, p402, llm routing, semantic caching, openai alternatives, ai infrastructure, reduce api costs, gpt-4 cost, llm providers, ai agent payments, openai tutorial, machine learning infrastructure, ai development 2025`}</code></pre>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Cards / End Screen Suggestions</h3>
        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>End screen card 1: Link to your next video (LLM comparison, agent architecture, etc.)</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>End screen card 2: Subscribe button</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Info card at the 2-line migration section: link to P402 docs</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Info card at timestamp where you explain semantic caching: link to caching explainer if you have one</span></li>
        </ul>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Pinned Comment Template</h3>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`📌 Quick links from this video:

→ P402 free signup (affiliate link — I earn a commission if you sign up): [YOUR_LINK]
→ Full docs: https://p402.io/docs
→ [Your GitHub code from this video, if applicable]

If you run into any issues with the integration, drop a comment
below with your setup (language, framework, what you're building)
and I'll help troubleshoot.`}</code></pre>

        {/* ---- TYPE B ---- */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Type B — Comparison / Review Video
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Suggested angle: "P402 vs. direct OpenAI API — honest comparison." Show real tradeoffs, not a puff piece.
          Honest reviews convert better and build more durable audience trust.
        </p>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Title Options</h3>
        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>P402 vs. Direct OpenAI API — Honest Review (With Real Benchmarks)</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>I Tested Every LLM Provider Through P402 — Here's What I Found</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Is P402 Worth It? Real Cost Data After 30 Days</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>AI Router Comparison: P402 vs. Building Your Own vs. Direct APIs</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>P402 Review: What Works, What Doesn't, and Who It's For</span></li>
        </ul>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Full Description Template</h3>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`⚡ Affiliate disclosure: This video contains referral links marked with *.
I may receive a commission if you sign up through my link — at no cost to you.
P402 did not pay me to make this review, and they have not reviewed
this content before publication. All opinions are my own.

---

In this video I compare using P402's AI routing platform vs. calling
provider APIs directly — using real data from my own projects.

This is an honest review. I'll cover what P402 does well,
where it adds genuine value, and where you'd be better served
building something yourself or using a different approach.

---

⏱ TIMESTAMPS
00:00 — What I'm testing and why
02:00 — What P402 actually is (quick primer)
05:00 — Setup comparison: P402 vs. direct API
09:00 — Cost comparison: my real numbers
14:00 — Latency: does routing add overhead?
18:00 — Semantic caching: real-world hit rates
22:30 — What P402 does better than DIY
26:00 — Where I'd still go direct
29:00 — Verdict: who should use this

---

🔗 LINKS
→ P402 (free to start)*: [YOUR_LINK]
→ P402 docs: https://p402.io/docs
→ [Your test methodology/GitHub if you're sharing data]
→ [Related videos you've made about LLM costs or API optimization]

---

📊 MY TEST SETUP
• [Describe your workload: # of requests, type of queries, model(s) used]
• [Duration of test]
• [Baseline: what you were comparing against]

Results will vary by workload — your numbers will be different from mine.

---

💬 HAVE YOU TRIED P402?
Drop your experience in the comments — I'm especially interested
in hearing from people with different workload types than what I tested.

---

🔔 Subscribe for more honest reviews of AI infrastructure tools.

---

* Affiliate link — see disclosure at top of this description.`}</code></pre>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Disclosure Language for Review Videos</h3>
        <p className="text-sm text-neutral-700 leading-relaxed">
          For the verbal disclosure in your video (say this in the first 30 seconds, not just in the description):
        </p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`"Quick note before we start: some links in the description are
affiliate links, which means I may earn a commission if you sign up
through them — at no extra cost to you. P402 didn't pay me to make
this video, and they didn't review it before I published.
Everything you're about to see is my genuine experience."`}</code></pre>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Pinned Comment Template</h3>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`📌 Pinned for clarity:

The link to P402 in the description is an affiliate link — I earn
a commission if you sign up. This didn't influence the review;
my data and opinions are my own.

If you have questions about my test methodology or want to see
more granular data, drop a comment and I'll share what I can.

→ P402 free signup: [YOUR_LINK]`}</code></pre>

        {/* ---- TYPE C ---- */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Type C — Educational / Explainer Video
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Suggested angle: "How AI agents pay for things with x402." Conceptual, not a product demo.
          Works well for audiences curious about AI infrastructure and agentic systems.
        </p>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Title Options</h3>
        <ul className="space-y-2 text-sm text-neutral-700 list-none">
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>How AI Agents Will Pay for Things (The x402 Protocol Explained)</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Autonomous AI Payments: How x402 Makes It Work Without Humans</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>The Missing Piece in Agentic AI: Machine-Native Payments</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>AI Spending Limits at the Protocol Level — AP2 Mandates Explained</span></li>
          <li className="flex items-start gap-2"><span className="text-primary font-black shrink-0">→</span><span>Why AI Agents Need Their Own Payment Rails (And What That Looks Like)</span></li>
        </ul>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Full Description Template</h3>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`⚡ Affiliate disclosure: Links marked * are referral links.
I may earn a commission at no cost to you.

---

If you're building autonomous AI agents, there's a problem you'll
hit eventually: how does the agent pay for things without a human
in the loop?

This video explains the x402 protocol — a machine-native payment
standard that gives AI agents real economic autonomy — and the
AP2 mandate system that keeps spending within defined limits.

No blockchain experience needed. This is about the concepts
and why they matter for the future of agentic AI.

---

⏱ TIMESTAMPS
00:00 — The problem: why agents can't pay for things today
03:30 — Why existing payment systems don't work for agents
07:00 — x402: HTTP-native payments explained plainly
12:00 — EIP-3009: gasless transfers on Base L2
16:30 — AP2 mandates: spend governance for agents
21:00 — Real-world example: an agent buying data autonomously
25:30 — Who's building this infrastructure (P402)
28:00 — Where this goes next

---

📚 DEEPER READING
→ x402 protocol docs: https://p402.io/docs/router
→ AP2 mandate overview: https://p402.io/docs/mandates
→ A2A protocol (agent-to-agent communication): https://p402.io/docs/a2a

🔗 TRY IT
→ P402 platform (free to start)*: [YOUR_LINK]

---

💬 QUESTIONS & DISCUSSION
I'm especially interested in hearing from people building
multi-agent pipelines — the governance question gets interesting
fast at that scale.

---

* Affiliate link — see disclosure above.`}</code></pre>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Community Post to Accompany the Video</h3>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Post this to your Community tab 24–48 hours before the video publishes to prime your audience:
        </p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`Quick question for the people building with AI:

When an autonomous agent needs to pay for something —
a data API, a specialized model, an external service —
how are you handling it today?

A) The agent has access to a credit card / payment method
B) It escalates to a human for approval every time
C) You avoid situations where the agent needs to pay
D) Something else (explain in comments)

Asking because I'm publishing a video this week about x402 —
a protocol that handles this machine-to-machine, with spending
limits enforced at the protocol level. Curious what problems
people are actually running into.

Video drops [day/time].`}</code></pre>

      </div>
    ),
  },

  // =========================================================================
  // 4. EMAIL SEQUENCES
  // =========================================================================

  'email-sequences': {
    title: 'Email Sequences',
    category: 'Launch Campaigns',
    categorySlug: 'campaigns',
    updatedAt: 'April 2025',
    body: (
      <div className="space-y-6">

        <p className="text-sm text-neutral-700 leading-relaxed">
          Two complete email sequences, five subject line formulas, three P.S. lines, and footer language.
          All sequences are written to be sent from a personal address, not a no-reply/bulk sender.
          Personalization tokens are marked <strong>[IN BRACKETS]</strong>.
        </p>

        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          Affiliate disclosure requirement: include a clear affiliate disclosure in every email that contains
          your referral link. The sequences below include compliant disclosure language in the P.S. of each email.
          Do not remove it.
        </div>

        {/* ---- SEQUENCE A ---- */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Sequence A — Cold/Warm Outreach (Agency Partners)
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Use this when reaching out to clients or prospects who are building AI-powered products and are likely
          experiencing LLM cost or vendor lock-in pain. Send from your personal address, not a marketing tool.
          Space emails 3–5 days apart.
        </p>

        {/* Email A1 */}
        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Email 1 of 3 — Intro</h3>

        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Subject</p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`Quick question about your AI API setup`}</code></pre>

        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Body</p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`Hi [First Name],

I've been following [Company/Project] for a while — [one genuine
specific observation about their work: recent launch, blog post,
talk, product feature you noticed].

I wanted to reach out because we're seeing a pattern with a lot of
teams building serious AI products: the LLM API bill becomes a real
constraint earlier than expected. Not catastrophic, but expensive
enough to limit what you can ship.

I've been working with a platform called P402 that addresses this
directly. It's an AI payment router — you point it at your existing
OpenAI integration (or whatever you're using), and it handles routing
across 13+ providers plus semantic caching. The migration is two
lines of code and the existing SDK keeps working.

I'm not pitching you on this cold — I genuinely don't know if it's
relevant to your current setup. But I thought it was worth asking:
is LLM API cost something you're actively thinking about right now,
or have you already solved for it?

Either answer is useful.

[Your name]

P.S. In the interest of transparency: I'm a P402 affiliate partner,
which means if you eventually sign up, I may receive a referral
commission. Happy to share more about the economics if that's useful
context.`}</code></pre>

        {/* Email A2 */}
        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Email 2 of 3 — Value</h3>

        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Subject</p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`Re: Quick question about your AI API setup`}</code></pre>

        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Body</p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`Hi [First Name],

Following up in case my last note got buried.

I wanted to share something more specific about what P402 does,
in case it's useful context regardless of whether we end up
working together on it.

The two things it does that most teams find immediately useful:

1. Semantic caching. Instead of exact-match caching, it uses
   vector embeddings to identify requests that are similar enough
   to return a cached result. In practice this means queries like
   "What's the weather in New York?" and "Is it raining in NYC?"
   can share a cache entry. For any product with predictable user
   behavior, the hit rate is typically meaningful.

2. Provider routing. When you need a live inference call, P402
   picks the right provider based on your routing mode (cost, speed,
   quality, or balanced). The same request might go to Groq for a
   latency-sensitive use case, or DeepSeek for a cost-sensitive batch
   job, or Claude for something requiring careful reasoning.
   All transparent to your application.

The key thing: it's OpenAI-compatible. If you're using the OpenAI
SDK today — in any language — the integration is changing your
base URL and API key. Nothing else breaks.

If it would be useful, I'm happy to walk through a quick look at
your current setup and give you a realistic sense of whether
the caching and routing would move the needle for your workload.

No obligation. 30 minutes if you want it.

[Your name]

P.S. Affiliate disclosure: I partner with P402 and may receive
a commission if you sign up. That said, I'd tell you if I didn't
think it was worth your time — my reputation matters more than
one referral commission.`}</code></pre>

        {/* Email A3 */}
        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Email 3 of 3 — Close</h3>

        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Subject</p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`Last note on this — then I'll leave you alone`}</code></pre>

        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Body</p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`Hi [First Name],

Last one — I promise.

If LLM API costs aren't a current priority, completely understood.
Timing matters and this may just not be the right moment.

If it is on your radar but you're not ready to evaluate something
new right now, the free tier at P402 is a genuine no-commitment
option. Sign up, integrate in 10 minutes, run it alongside your
existing setup for a few weeks, and see what the routing logs
tell you about your actual usage patterns. The data alone tends
to be useful even if you don't change anything else.

Link (affiliate, see disclosure): p402.io/r/[YOUR_CODE]

If you've already solved this with something else, I'd actually
love to know what you're using — genuinely useful for my own
thinking.

Either way, good luck with [Project/Company] —
[the specific thing you mentioned that you've been following].

[Your name]

P.S. Unsubscribing from my personal emails is awkward to implement,
but if you'd prefer I not send follow-ups like this in the future,
just reply "unsubscribe" and I'll remove you from my outreach list.
No hard feelings.`}</code></pre>

        {/* ---- SEQUENCE B ---- */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Sequence B — Post-Content Follow-Up (Developer Affiliates)
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Send to your newsletter list or email subscribers after you publish a tutorial, thread, or video about P402.
          Email 1 goes out same day as the content. Email 2 goes to non-openers / non-clickers 7 days later.
        </p>

        {/* Email B1 */}
        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Email 1 of 2 — Content Announcement</h3>

        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Subject</p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`New: [title of your article/video/thread]`}</code></pre>

        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Preview Text</p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`Plus the tool I've been testing for the past few weeks — and what I actually think of it.`}</code></pre>

        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Body</p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`Hey [First Name / "hey" if no first name],

Just published something I've been working on for a bit:

→ [Title of your content]
→ [Link to your content — article, YouTube video, Twitter thread]

The short version: [1-2 sentences summarizing what the content covers
and the key takeaway. Be specific. "How I integrated P402 into my
Next.js app to reduce LLM costs, with real routing logs and
cache hit data" is better than "a tutorial about AI costs."]

The tool at the center of it is P402 — an AI payment router that
sits in front of your LLM calls and handles provider routing
plus semantic caching. OpenAI-compatible, 2-line integration.

I've been testing it for [X weeks] and my genuine take is [your
honest 1-2 sentence assessment — positive but specific and honest].

If you want to try it yourself: [YOUR_LINK]
(Affiliate link — I earn a commission if you sign up.
Mentioned in the content as well.)

Let me know if you have questions about the integration —
happy to help.

– [Your name]

P.S. If you're not building with AI right now and these emails
aren't relevant, you can [unsubscribe link] — no hard feelings.
I'd rather have a smaller, engaged list than send to people
who don't find this useful.`}</code></pre>

        {/* Email B2 */}
        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Email 2 of 2 — 7-Day Follow-Up (Non-Clickers)</h3>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Send only to subscribers who did not click in Email 1. Use your email platform's segmentation to filter.
        </p>

        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Subject</p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`In case you missed it — [short description of your content]`}</code></pre>

        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Preview Text</p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`One more send on this — then I'll move on. Something specific I wanted to flag.`}</code></pre>

        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Body</p>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`Hey [First Name],

Sending this one more time in case last week's email got lost —
I know inboxes get busy.

[Title of your content]: [link]

The specific thing I wanted to flag that I didn't emphasize enough
last time: [one specific insight or finding from your content that
is genuinely interesting or surprising — e.g., "the semantic cache
hit rate on my workload was higher than I expected, and it kicked
in faster than I thought it would — within the first few hundred
requests"].

That's the part I keep thinking about. If you're paying for LLM
calls and a meaningful percentage of them are near-duplicates
of previous requests — which is more common than you'd expect —
that's a direct cost reduction with zero quality tradeoff.

The platform I was testing: P402. Free to start: [YOUR_LINK]

(Affiliate link — I receive a commission if you sign up.
My content and opinions are my own.)

That's the last email I'll send on this topic.
If the subject matter isn't relevant, [unsubscribe link].

– [Your name]`}</code></pre>

        {/* ---- FORMULAS ---- */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Subject Line Formulas
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Five formulas with worked examples. Adapt the examples to your audience and content.
        </p>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Formula 1 — The Honest Question</h3>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`Pattern: "Is [thing] a problem you're dealing with?"
Example: "Is your LLM API bill a problem you're actively thinking about?"
Example: "Is vendor lock-in with OpenAI something on your radar?"
Why it works: Qualifies the reader. Non-clickers self-select out.
Openers are already primed to care about the content.`}</code></pre>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Formula 2 — The Specific Number</h3>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`Pattern: "I [did specific thing] and found [specific result]"
Example: "I ran my RAG pipeline through P402 for 30 days — here's the routing data"
Example: "I analyzed 6 months of OpenAI bills — here's the waste breakdown"
Why it works: Specific and credible. Implies you have real data.
Avoid making claims you can't back up in the body copy.`}</code></pre>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Formula 3 — The Reframe</h3>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`Pattern: "[Common belief] is actually a [different thing]"
Example: "High LLM costs are mostly a routing problem, not a usage problem"
Example: "OpenAI dependency is a resilience risk, not just a cost issue"
Why it works: Challenges assumptions. Readers who disagree open to argue;
readers who agree open because you articulated something they felt.`}</code></pre>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Formula 4 — The Contrarian</h3>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`Pattern: "The [conventional approach] is [the wrong approach] — here's why"
Example: "Calling OpenAI directly is the wrong default for production AI"
Example: "Hardcoding LLM provider selection is technical debt in 2025"
Why it works: Slightly provocative without being dishonest. Works well
for technical audiences who have opinions.`}</code></pre>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Formula 5 — The Before/After</h3>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`Pattern: "Before: [bad state]. After: [better state]. How:"
Example: "Before: one provider, no fallback, climbing bills. After: 13 providers, routing logs, same SDK. How:"
Example: "Before: agents that pause for human approval. After: agents that pay autonomously within budget. Here's the infrastructure:"
Why it works: Makes the transformation concrete and immediate.
Best used when the "after" is something your reader genuinely wants.`}</code></pre>

        {/* ---- PS LINES ---- */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          P.S. Lines That Drive Clicks
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          P.S. lines are disproportionately read. Use one of these when your main CTA is mid-email and you want a second
          link at the bottom. Always include your disclosure language.
        </p>

        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`P.S. #1 — The curiosity P.S.
"P.S. The routing logs alone are worth setting up. Seeing which model
handled which request, at what cost, with what latency — I didn't
know I was flying blind until I had this data. [YOUR_LINK] (affiliate link)"

---

P.S. #2 — The low-commitment P.S.
"P.S. Free tier, no credit card, 2-line integration. The worst case
is you spend 15 minutes and it doesn't fit your workload.
[YOUR_LINK] (I earn a commission if you sign up — disclosed for transparency.)"

---

P.S. #3 — The social proof P.S.
"P.S. If you've already tried P402 or a similar routing layer,
I'd genuinely love to hear what your experience was —
hit reply. And if you haven't: [YOUR_LINK] (affiliate link)."`}</code></pre>

        {/* ---- FOOTER ---- */}
        <h2 className="text-lg font-black uppercase tracking-tight border-b-2 border-black pb-2 mt-8 mb-4">
          Unsubscribe-Friendly Footer Language
        </h2>
        <p className="text-sm text-neutral-700 leading-relaxed">
          Use one of these footers in every email. The language is designed to be honest and reduce resentment among
          subscribers who aren't interested, while keeping those who are.
        </p>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Option A — Warm / Personal</h3>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`You're getting this because you subscribed to [Your List Name].
If this isn't your thing anymore, unsubscribe here: [link]
No judgment — I'd rather you stay because the content is useful,
not out of inertia.

[Your name] · [City, if you share that] · [Website]`}</code></pre>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Option B — Clean / Minimal</h3>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`This email was sent to [email] because you subscribed to [List Name].
Unsubscribe: [link] · Update preferences: [link]

Affiliate disclosure: emails from [Your Name] may contain referral
links. I only recommend tools I've personally used and believe
are genuinely useful.

[Your Name] · [Address if required by CAN-SPAM/GDPR]`}</code></pre>

        <h3 className="text-sm font-black uppercase tracking-tight mt-6 mb-2">Option C — Developer Audience</h3>
        <pre className="code-block overflow-x-auto p-4 text-sm my-4 whitespace-pre-wrap"><code>{`[List Name] — sent to builders thinking about AI infrastructure.
Unsubscribe: [link]

Some links are affiliate links. I earn a small commission if you
purchase through them. This doesn't affect what I recommend —
my read rate and reputation matter more than referral commissions.`}</code></pre>

        <div className="border-l-4 border-primary bg-neutral-50 px-4 py-3 text-sm my-4">
          Legal note: CAN-SPAM (US) and GDPR (EU/UK) both require a physical mailing address in commercial emails
          and a functioning unsubscribe mechanism. If your list is over 1,000 subscribers, use a compliant ESP
          (Mailchimp, ConvertKit, Resend, etc.) that handles this automatically. Do not send bulk email from
          a personal Gmail account.
        </div>

      </div>
    ),
  },

}
