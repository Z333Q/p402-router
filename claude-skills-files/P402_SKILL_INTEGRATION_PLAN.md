# P402 Skill: Integration Plan and Distribution Strategy

## Part 1: Website Integration (Claude Code Execution Plan)

This section is a step-by-step plan for Claude Code to integrate the skill files into the p402.io codebase. Every task includes the exact file paths, the rationale, and what Claude Code should produce.

---

### 1.1 Commit the Skill to the Repo

The skill files belong in the repository itself so they ship with every clone and fork.

**Action:** Create the following directory structure in the project root:

```
p402-router/
├── .claude/
│   └── skills/
│       └── p402/
│           ├── SKILL.md
│           └── references/
│               ├── api-reference.md
│               ├── routing-guide.md
│               ├── payment-flows.md
│               └── a2a-protocol.md
```

**Why `.claude/skills/`:** This is the Claude Code project-scoped skill path. Any developer who clones the P402 repo and opens it in Claude Code automatically gets the skill loaded. Zero configuration required. When they ask Claude Code "how do I add budget limits to my agent?" inside the P402 project, the skill triggers and gives P402-native answers.

**Claude Code command:**
```bash
mkdir -p .claude/skills/p402/references
cp skill-files/SKILL.md .claude/skills/p402/
cp skill-files/references/*.md .claude/skills/p402/references/
git add .claude/skills/
git commit -m "feat: add P402 Claude skill for AI-assisted integration"
```

---

### 1.2 Serve the Skill as a Download from p402.io

Create a static route that serves the packaged `.skill` file and the raw skill folder as a zip, so users who are NOT working inside the P402 repo can install it into their own projects or their global `~/.claude/skills/` directory.

**Action:** Add to `next.config.js` rewrites:

```javascript
// In the rewrites() function:
{
  source: '/skill/p402.skill',
  destination: '/downloads/p402.skill',
},
{
  source: '/skill/p402.zip',
  destination: '/downloads/p402.zip',
},
```

**Action:** Place the built artifacts in `public/downloads/`:

```
public/
└── downloads/
    ├── p402.skill          (packaged skill file)
    └── p402.zip            (zipped skill folder)
```

**Action:** Add a build script in `package.json`:

```json
{
  "scripts": {
    "build:skill": "cd .claude/skills && zip -r ../../public/downloads/p402.zip p402/ && cp ../../public/downloads/p402.zip ../../public/downloads/p402.skill"
  }
}
```

This makes the skill available at `https://p402.io/skill/p402.skill` and `https://p402.io/skill/p402.zip`.

---

### 1.3 Upgrade `public/llms.txt`

P402 already has an `llms.txt` at the root. It needs to be upgraded from a basic capability summary to a proper llms.txt-spec document that references the skill and the full markdown documentation, following the pattern used by Anthropic, Cloudflare, and Stripe.

**Action:** Replace `public/llms.txt` with:

```markdown
# P402.io

> Payment-aware AI orchestration layer. Routes LLM requests across 300+ models with cost optimization and settles payments in USDC on Base via the x402 protocol.

## Docs

- [API Reference](https://p402.io/docs/api): Full endpoint documentation for chat completions, sessions, providers, analytics
- [A2A Protocol](https://p402.io/docs/a2a): Google A2A integration with x402 payment extension
- [Router Guide](https://p402.io/docs/router): Routing modes, scoring algorithm, failover, model tiers
- [SDK Reference](https://p402.io/docs/sdk): TypeScript SDK, MCP server, CLI tools
- [Agent Discovery](https://p402.io/.well-known/agent.json): A2A agent card
- [OpenAPI Spec](https://p402.io/openapi.yaml): Machine-readable API specification

## Claude Skill

- [Install P402 Skill](https://p402.io/skill/p402.zip): Claude Code / Claude.ai skill for P402 integration
- [SKILL.md (raw)](https://p402.io/skill/SKILL.md): Skill source for manual installation

## Key Endpoints

- POST /api/v2/chat/completions: OpenAI-compatible routing endpoint
- POST /api/v2/sessions: Create budget-capped sessions
- POST /api/a2a: Google A2A JSON-RPC messaging
- GET /.well-known/agent.json: Agent discovery

## Integration

npm install @p402/sdk
npm install @p402/a2a-sdk

## Source

- [GitHub](https://github.com/Z333Q/p402-router)
```

**Action:** Also create `public/llms-full.txt` that concatenates the SKILL.md body and all four reference files into a single markdown document. This is the llms.txt "full" variant that tools like LLMTEXT MCP and Context7 ingest for deep context retrieval.

**Claude Code command:**
```bash
cat .claude/skills/p402/SKILL.md > public/llms-full.txt
echo -e "\n---\n" >> public/llms-full.txt
cat .claude/skills/p402/references/api-reference.md >> public/llms-full.txt
echo -e "\n---\n" >> public/llms-full.txt
cat .claude/skills/p402/references/routing-guide.md >> public/llms-full.txt
echo -e "\n---\n" >> public/llms-full.txt
cat .claude/skills/p402/references/payment-flows.md >> public/llms-full.txt
echo -e "\n---\n" >> public/llms-full.txt
cat .claude/skills/p402/references/a2a-protocol.md >> public/llms-full.txt
```

This gives AI agents a choice: `llms.txt` for the overview, `llms-full.txt` for everything.

---

### 1.4 Serve Raw Skill Markdown via API

Add a simple API route so the individual skill files are accessible as raw markdown over HTTP. This enables tools, MCP servers, and other agents to fetch specific reference files on demand rather than downloading the entire package.

**Action:** Create `app/skill/[...path]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const SKILL_BASE = join(process.cwd(), '.claude', 'skills', 'p402');

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const filePath = join(SKILL_BASE, ...params.path);

  // Security: prevent path traversal
  if (!filePath.startsWith(SKILL_BASE)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const content = readFileSync(filePath, 'utf-8');
  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
```

This enables:
- `https://p402.io/skill/SKILL.md` (core skill)
- `https://p402.io/skill/references/api-reference.md` (API docs)
- `https://p402.io/skill/references/routing-guide.md` (routing deep dive)
- `https://p402.io/skill/references/payment-flows.md` (x402 flows)
- `https://p402.io/skill/references/a2a-protocol.md` (A2A protocol)

---

### 1.5 Add a Docs Page for the Skill

Create a dedicated page at `/docs/skill` that explains what the skill is, shows installation methods, and provides download links. This page matches the existing P402 docs design (neo-brutalist, `border-4 border-black`, `shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]`, uppercase headings).

**Action:** Create `app/docs/skill/page.tsx` with:

- Hero section: "CLAUDE SKILL" title, one-line description
- Three installation cards:
  - **Claude Code (Project):** `git clone` and it works automatically
  - **Claude Code (Global):** `cp -r` to `~/.claude/skills/p402/`
  - **Claude.ai:** Upload via Settings > Capabilities > Skills
- Download buttons: `.skill` file and `.zip`
- "What It Does" section: brief summary of the 5 integration patterns
- Link to the raw SKILL.md for preview

**Action:** Add this page to the docs navigation in `app/docs/page.tsx` alongside the existing cards (A2A Protocol, AI Router, SDKs & Tools). New card:

```tsx
<Link href="/docs/skill" className="group block p-10 border-4 border-black bg-white hover:bg-primary transition-all hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
  <div className="flex items-center gap-4 mb-6">
    <span className="text-4xl">🧩</span>
    <h2 className="text-2xl font-black uppercase italic group-hover:text-black">Claude Skill</h2>
  </div>
  <p className="text-sm font-bold text-neutral-600 mb-8 min-h-[48px] uppercase tracking-tight">
    Install P402 in Claude Code or Claude.ai. Get AI-assisted integration, routing guidance, and code generation.
  </p>
  <span className="font-black text-xs uppercase tracking-widest border-b-2 border-black inline-block">Install Skill &rarr;</span>
</Link>
```

---

### 1.6 Add Skill Reference to `agent.json`

The existing `app/.well-known/agent.json/route.ts` already broadcasts P402's capabilities. Add the skill as a discoverable resource so other agents can find and install it programmatically.

**Action:** Add to the agent card's `skills` array:

```typescript
{
  id: "claude-skill",
  name: "P402 Claude Skill",
  description: "Installable skill package for Claude Code and Claude.ai with full API reference, routing guide, payment flows, and A2A protocol documentation.",
  tags: ["skill", "claude", "documentation", "integration"]
}
```

And add a `resources` field (or extend `endpoints`):

```typescript
endpoints: {
  a2a: {
    jsonrpc: "https://p402.io/api/a2a",
    stream: "https://p402.io/api/a2a/stream"
  },
  skill: {
    download: "https://p402.io/skill/p402.zip",
    manifest: "https://p402.io/skill/SKILL.md"
  }
}
```

---

### 1.7 Add One-Click Install to README.md

Add an "AI-Assisted Development" section to the repo README near the top, right after the integration guide:

```markdown
## 🧩 Claude Skill

P402 ships with a Claude Skill that gives Claude Code deep knowledge of the P402 API, routing engine, payment flows, and A2A protocol. When you open this repo in Claude Code, the skill loads automatically.

**Already cloned?** The skill is in `.claude/skills/p402/` -- it just works.

**Using Claude.ai?** Download and upload via Settings > Capabilities > Skills:
- [Download p402.skill](https://p402.io/skill/p402.skill)

**Global install for Claude Code:**
```bash
cp -r .claude/skills/p402 ~/.claude/skills/p402
```
```

---

## Part 2: Distribution Strategy

The ideal P402 skill user exists in three concentric rings. The distribution strategy targets all three.

### Ring 1: Developers Already in the P402 Repo (Highest Intent)

These developers have cloned the repo or are actively building on P402. They need the skill to work without any extra steps.

**Channel:** `.claude/skills/` in the repository (Section 1.1)

This is the zero-friction path. Clone, open in Claude Code, start asking questions. No marketplace, no download, no configuration. This alone covers the most valuable users.

### Ring 2: AI/Crypto Developers Who Do Not Know P402 Yet (Category Discovery)

These developers are asking questions like "how do I add spending limits to my AI agent" or "multi-provider LLM routing" or "USDC micropayments for API calls." They are in Claude Code or Claude.ai working on their own projects, and the P402 skill should surface as an answer.

**Channels:**

#### 2a. GitHub: `anthropics/skills` Repository (Official Anthropic Marketplace)

This is the canonical skill distribution point. Anthropic's own repo at `github.com/anthropics/skills` contains the skills that ship with Claude.ai and can be installed as Claude Code plugins.

**Action:** Submit a PR to `anthropics/skills` adding P402 to the community/contributed skills section. The PR should include the full `p402/` folder matching the structure they expect. Reference that P402 implements protocols (x402, A2A) co-founded by Coinbase and Cloudflare, which are Anthropic ecosystem partners. This adds legitimacy and increases merge likelihood.

**Plugin install command (once merged):**
```
/plugin install p402@anthropic-agent-skills
```

#### 2b. GitHub: `travisvn/awesome-claude-skills` (Curated Community List)

The most-starred curated list of Claude skills. Being listed here puts P402 in front of developers browsing for useful skills.

**Action:** Submit a PR adding P402 under an "AI Infrastructure" or "API & Integration" category. Include:
- Name: P402 -- Payment-Aware AI Orchestration
- Description: Cost-optimized multi-provider LLM routing with x402 stablecoin micropayments
- Link: `https://github.com/Z333Q/p402-router/tree/main/.claude/skills/p402`

#### 2c. GitHub: `alirezarezvani/claude-skills` (53-Skill Collection + Plugin Marketplace)

This collection supports Claude Code plugin marketplace registration and installs via `/plugin install`. It also supports Codex CLI and the universal `agent-skills-cli`.

**Action:** Either submit a PR to include P402 in their engineering skills category, or register the P402 repo itself as a standalone plugin marketplace:

```
/plugin marketplace add Z333Q/p402-router
/plugin install p402@p402-router
```

To enable this, add a `skills-index.json` to the repo root:

```json
{
  "name": "p402-skills",
  "version": "1.0.0",
  "skills": [
    {
      "name": "p402",
      "path": ".claude/skills/p402",
      "description": "Payment-aware AI orchestration with multi-provider routing and x402 settlement",
      "tags": ["ai", "payments", "routing", "x402", "agents"]
    }
  ]
}
```

#### 2d. SkillsMP.com (Agent Skills Marketplace)

SkillsMP indexes public GitHub repositories that contain skill folders. Once the skill is committed to the P402 GitHub repo, submit it for indexing at `skillsmp.com`.

**Action:** Ensure the `.claude/skills/p402/SKILL.md` follows the standard format (it does). Submit the repository URL to SkillsMP for inclusion.

#### 2e. GetClaudeSkills.com (Marketplace + Blog)

Another marketplace that hosts downloadable skills and accepts seller submissions.

**Action:** Create a listing for P402 with the `.skill` file as the downloadable artifact, plus a description page that mirrors the `/docs/skill` page content.

#### 2f. Claude Code Plugin Registry (`claude-plugins` NPM package)

The `claude-plugins` and `skills-installer` NPM packages power a registry that indexes GitHub repos.

**Action:** Ensure the repo structure is compatible:
- `SKILL.md` at `.claude/skills/p402/SKILL.md`
- `skills-index.json` at repo root (created in 2c)

Once indexed, users can install via:
```bash
npx skills-installer install p402 --from Z333Q/p402-router
```

---

### Ring 3: All AI Agents and LLMs (Maximum Reach)

These are not human developers installing a skill. These are AI systems (ChatGPT, Perplexity, Claude web search, Gemini, coding agents) that encounter P402 while answering questions or building code. The goal is that when any AI is asked about cost-aware AI routing or micropayments for agents, it finds P402's documentation.

**Channels:**

#### 3a. `llms.txt` and `llms-full.txt` (Section 1.3)

Already covered in the site integration plan. The `llms.txt` serves as the index and `llms-full.txt` as the full context. Combined, these make P402 discoverable by any LLM that checks for `llms.txt` (Perplexity, Claude web search, LLMTEXT MCP, and increasingly ChatGPT).

#### 3b. LLMTEXT MCP Registration

LLMTEXT (llmtext.com) turns any `llms.txt` into a dedicated MCP server. Once P402's `llms.txt` is live and spec-compliant, register it so developers can install P402 context as an MCP:

```
// claude_desktop_config.json
{
  "mcpServers": {
    "p402-docs": {
      "url": "https://mcp.llmtext.com/p402.io"
    }
  }
}
```

This means any Claude Desktop or Claude Code user who adds this MCP gets P402 documentation as live context without even installing the skill.

**Action:** After upgrading `llms.txt`, submit `p402.io` to the LLMTEXT registry.

#### 3c. `/.well-known/agent.json` (Already Live)

P402 already serves this. The upgrade in Section 1.6 adds the skill as a discoverable resource. Any A2A-compliant agent that discovers P402 now also discovers the skill package.

#### 3d. llms-txt-hub (GitHub Directory)

The `thedaviddias/llms-txt-hub` repository catalogs websites that have implemented `llms.txt`.

**Action:** Submit a PR adding P402 to the hub. This gets P402 indexed by every tool that consumes the hub as a data source.

#### 3e. OpenAI Codex CLI Compatibility

The Agent Skills standard is cross-platform. The same `SKILL.md` format works in OpenAI's Codex CLI at `~/.codex/skills/`. The P402 skill works there without modification.

**Action:** Add installation instructions for Codex to the README and docs page:
```bash
cp -r .claude/skills/p402 ~/.codex/skills/p402
```

This doubles the addressable market with zero additional work.

---

## Part 3: Execution Sequence

Ordered by effort-to-impact ratio, highest first:

| Priority | Action | Effort | Impact | Why First |
|----------|--------|--------|--------|-----------|
| 1 | Commit to `.claude/skills/` in repo | 5 min | Immediate for all repo users | Zero-friction, ships with every clone |
| 2 | Upgrade `llms.txt` + create `llms-full.txt` | 15 min | All AI agents that visit p402.io | Already have the file, just needs content upgrade |
| 3 | Add `public/downloads/` with `.skill` + `.zip` | 10 min | Enables all downstream distribution | Other channels need a download URL |
| 4 | Create `/docs/skill` page | 30 min | Converts site visitors to skill users | Marketing surface for the skill |
| 5 | Update README with skill section | 10 min | GitHub visitors see it immediately | README is the most-read file in any repo |
| 6 | PR to `anthropics/skills` | 30 min | Official Anthropic marketplace listing | Highest-authority distribution channel |
| 7 | PR to `awesome-claude-skills` | 15 min | Curated community visibility | Most-starred skills list on GitHub |
| 8 | Add `skills-index.json` for plugin registry | 10 min | Plugin install + NPM registry support | Enables `/plugin install` one-liner |
| 9 | Submit to SkillsMP + GetClaudeSkills | 20 min | Two more marketplace listings | Incremental reach |
| 10 | Register with LLMTEXT MCP | 10 min | MCP-based discovery for all LLM users | Passive distribution, no user action needed |
| 11 | Submit to llms-txt-hub | 10 min | Indexed by all llms.txt aggregators | One PR, permanent listing |
| 12 | Upgrade `agent.json` with skill reference | 5 min | A2A agents discover the skill | Already serving the endpoint |
| 13 | Create `/skill/[...path]` API route | 20 min | Programmatic access to individual files | Enables MCP and agent-fetched docs |

**Total estimated effort:** ~3.5 hours for complete rollout across all channels.

---

## Part 4: Where the Ideal User Is

### Primary Persona: "The AI App Builder"

Currently using OpenAI or Anthropic directly. Spending $200-2000/month on API calls. Probably has a single `OPENAI_API_KEY` hardcoded. Has not thought about multi-provider routing because the tooling did not exist in a way that was easy to adopt.

**Where they are right now:**
- In Claude Code, building their app, asking "how do I reduce my OpenAI costs"
- On GitHub, searching for "multi-model LLM routing" or "AI API cost optimization"
- In the OpenRouter Discord (37k members), discussing model pricing
- Reading Hacker News threads about AI infrastructure costs
- On X/Twitter, following AI infra accounts

**How P402 reaches them:**
- The skill's wide triggering description catches their intent queries in Claude Code/Claude.ai
- The `llms.txt` catches AI agents answering their questions
- GitHub marketplace listings catch their manual searches
- The repo-bundled skill catches them if they discover P402 through any other channel

### Secondary Persona: "The Agent Economy Builder"

Building autonomous agents that need to spend money programmatically. Interested in A2A, x402, and the Coinbase/Base ecosystem. Likely in the Base/Coinbase developer community.

**Where they are right now:**
- Coinbase Developer Platform Discord
- Base ecosystem builder channels
- x402 Foundation discussions
- Google A2A protocol GitHub
- Farcaster developer channels

**How P402 reaches them:**
- The A2A protocol reference in the skill catches queries about "agent payment rails"
- `agent.json` discovery by their agents finds P402
- The Bazaar marketplace listing makes P402 visible as a service
- x402 Foundation membership (when approved) puts P402 in the facilitator registry

### Tertiary Persona: "The Claude Power User"

Uses Claude.ai daily. Browses skill marketplaces. Installs skills to customize their Claude experience. May not be building AI apps but is an influencer who recommends tools.

**Where they are right now:**
- Claude.ai Settings > Capabilities > Skills
- SkillsMP.com browsing categories
- GetClaudeSkills.com browsing listings
- Reddit r/ClaudeAI, r/ChatGPTCoding
- YouTube tutorials on Claude skills

**How P402 reaches them:**
- Marketplace listings on SkillsMP and GetClaudeSkills
- `.skill` file download from p402.io/docs/skill
- Word of mouth from developers who found the repo-bundled skill useful

---

## Part 5: Claude Code Prompt

Copy this entire block into Claude Code to execute priorities 1-5 and 8 in a single session:

```
Read the skill files in .claude/skills/p402/ (I've already placed them there).

1. Verify the skill structure is correct: SKILL.md with YAML frontmatter, 
   references/ directory with 4 markdown files.

2. Create public/downloads/ directory. Zip .claude/skills/p402/ into 
   public/downloads/p402.zip and copy it as public/downloads/p402.skill.

3. Replace public/llms.txt with the upgraded version that references 
   docs, skill download, key endpoints, and source. Also generate 
   public/llms-full.txt by concatenating SKILL.md and all reference files.

4. Add rewrite rules to next.config.js for /skill/p402.skill and 
   /skill/p402.zip pointing to the downloads directory.

5. Create app/skill/[...path]/route.ts that serves individual skill 
   markdown files from .claude/skills/p402/ with proper Content-Type 
   and CORS headers.

6. Create app/docs/skill/page.tsx following the existing docs page 
   design pattern (neo-brutalist: border-4 border-black, uppercase 
   italic headings, shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] cards, 
   primary color #B6FF2E). Include three installation method cards 
   and download buttons.

7. Add a skill card to the docs index page at app/docs/page.tsx.

8. Add a skills-index.json to the repo root for plugin marketplace 
   compatibility.

9. Update the agent card in app/.well-known/agent.json/route.ts to 
   include the skill as a discoverable resource.

10. Add an "AI-Assisted Development" section to README.md with 
    installation instructions for Claude Code and Claude.ai.

Commit each logical unit separately with conventional commit messages.
```
