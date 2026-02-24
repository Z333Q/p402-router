# Claude Code Integration Prompt

Copy and paste this entire block into Claude Code when you are inside the p402-router project directory. It will execute all Phase 1 steps from the Integration Manifest.

---

```
I need you to integrate the P402 Claude Skill into this repository. I have all the files prepared. Here is exactly what to do:

## Step 1: Create the skill directory and files

Create .claude/skills/p402/ with the skill files. I will paste the content of each file when you are ready, OR you can download them:

curl -sL https://p402.io/skill/p402.zip -o /tmp/p402.zip
unzip /tmp/p402.zip -d .claude/skills/

If the download is not yet live, create the files manually from the content I provide.

## Step 2: Replace public/llms.txt

Replace the existing public/llms.txt with an upgraded version that follows the llms.txt spec. It should include:
- One-line description of P402
- A paragraph explaining what P402 does and why (micropayment economics)
- Docs section linking to /docs/api, /docs/a2a, /docs/router, /docs/sdk, /llms-full.txt
- Claude Skill section linking to /skill/p402.zip, /skill/SKILL.md, and each reference file
- Key Endpoints section listing POST /api/v2/chat/completions, POST /api/v2/sessions, POST /api/a2a, GET /.well-known/agent.json
- Agent Discovery section linking to agent.json and openapi.yaml
- Integration section showing npm install commands
- Source section linking to GitHub and Twitter

## Step 3: Create scripts/build-skill.sh

Create a bash script at scripts/build-skill.sh that:
1. Validates .claude/skills/p402/SKILL.md exists
2. Creates public/downloads/ directory
3. Zips .claude/skills/p402/ into public/downloads/p402.zip
4. Copies as public/downloads/p402.skill
5. Concatenates SKILL.md + all 4 reference files into public/llms-full.txt with --- separators
6. Reports file sizes

Make it executable with chmod +x.

## Step 4: Run the build script

Execute ./scripts/build-skill.sh to generate the download artifacts and llms-full.txt.

## Step 5: Create app/skill/[...path]/route.ts

Create a Next.js API route that serves individual skill markdown files. It should:
- Whitelist only the 5 known files (SKILL.md + 4 references)
- Return Content-Type: text/markdown with CORS headers
- Prevent path traversal with resolve() check
- Cache for 1 hour (Cache-Control: public, max-age=3600)
- Return 404 with list of available files if path not found

## Step 6: Create app/docs/skill/page.tsx

Create the skill documentation page following the existing neo-brutalist design pattern:
- Use TopNav and Footer components
- border-4 border-black cards with shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]
- Uppercase italic headings, text-6xl for page title
- Three installation method cards: Clone Repo, Global Install, Claude.ai Upload
- Download buttons for .skill and .zip files
- Cross-platform section (Codex CLI, Plugin Marketplace)
- Contents section listing all 5 files with line counts and descriptions
- Use #B6FF2E for primary actions and code block accents
- Code blocks: bg-[#141414] with text-[#B6FF2E]

## Step 7: Add skill card to docs index

In app/docs/page.tsx, add a new card to the grid alongside the existing A2A Protocol, AI Router, and SDKs & Tools cards:
- Emoji: puzzle piece
- Title: "Claude Skill"
- Description: "Install P402 in Claude Code or Claude.ai. Get AI-assisted integration, routing guidance, and code generation."
- Link to /docs/skill

## Step 8: Replace app/.well-known/agent.json/route.ts

Update the agent card to include:
- A "claude-skill" entry in the skills array
- A "skill" object in endpoints with download and manifest URLs
- A "llms" object in endpoints with index and full URLs
- "schemes" array in the x402 extension config

## Step 9: Create skills-index.json at repo root

Create the plugin marketplace manifest with:
- name: "p402-skills"
- One skill entry pointing to .claude/skills/p402 with full description and tags

## Step 10: Update next.config.js

Add to the rewrites() array:
- /skill/p402.skill -> /downloads/p402.skill
- /skill/p402.zip -> /downloads/p402.zip

Add to the headers() array:
- /llms.txt and /llms-full.txt with Content-Type text/markdown, CORS, and Cache-Control

## Step 11: Update package.json

Add scripts:
- "build:skill": "chmod +x scripts/build-skill.sh && ./scripts/build-skill.sh"
- "prebuild": "npm run build:skill"

## Step 12: Update README.md

Add a "Claude Skill" section after the Integration Guide with:
- What the skill does
- Installation methods (auto in repo, Claude.ai upload, global install, Codex CLI, plugin marketplace)
- Table of skill contents with file names, line counts, and coverage areas

## Step 13: Create or update CLAUDE.md

Add a "P402 Skill" section explaining:
- The skill location and auto-loading behavior
- When the skill triggers
- How to maintain the skill files
- Key file paths

## Step 14: Commit

Stage everything and commit:
git add -A
git commit -m "feat: add P402 Claude skill with full website integration and distribution

- Add Claude skill to .claude/skills/p402/ (auto-loads in Claude Code)
- Upgrade public/llms.txt with full doc index and skill references
- Add llms-full.txt (1,985 lines of concatenated skill documentation)
- Create /skill/ API route for serving individual markdown files
- Create /docs/skill page with installation methods and downloads
- Add skill card to docs index
- Upgrade agent.json with skill discovery endpoints
- Add skills-index.json for plugin marketplace compatibility
- Add build-skill.sh for packaging automation
- Update next.config.js with skill file serving rewrites and headers"

Commit each logical unit separately if you prefer, using conventional commit messages.
```
