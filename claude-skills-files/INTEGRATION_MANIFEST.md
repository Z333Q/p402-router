# P402 Skill Integration Manifest
## Complete File Map

Every file in this package and exactly where it goes in the P402 repo.

### Direct Copy (drop in as-is)

| Source File | Destination in Repo | Action |
|-------------|-------------------|--------|
| `.claude/skills/p402/SKILL.md` | `.claude/skills/p402/SKILL.md` | Create directory, copy |
| `.claude/skills/p402/references/api-reference.md` | `.claude/skills/p402/references/api-reference.md` | Copy |
| `.claude/skills/p402/references/routing-guide.md` | `.claude/skills/p402/references/routing-guide.md` | Copy |
| `.claude/skills/p402/references/payment-flows.md` | `.claude/skills/p402/references/payment-flows.md` | Copy |
| `.claude/skills/p402/references/a2a-protocol.md` | `.claude/skills/p402/references/a2a-protocol.md` | Copy |
| `public/llms.txt` | `public/llms.txt` | **Replace** existing file |
| `public/llms-full.txt` | `public/llms-full.txt` | Create new file |
| `app/skill/[...path]/route.ts` | `app/skill/[...path]/route.ts` | Create new route |
| `app/docs/skill/page.tsx` | `app/docs/skill/page.tsx` | Create new page |
| `app/.well-known/agent.json/route.ts` | `app/.well-known/agent.json/route.ts` | **Replace** existing file |
| `skills-index.json` | `skills-index.json` (repo root) | Create new file |
| `scripts/build-skill.sh` | `scripts/build-skill.sh` | Create, `chmod +x` |

### Snippets (merge into existing files)

| Snippet File | Target File | How to Apply |
|-------------|------------|--------------|
| `DOCS_INDEX_CARD.tsx.snippet` | `app/docs/page.tsx` | Add the `<Link>` JSX block into the existing grid of doc cards |
| `NEXTCONFIG_ADDITIONS.js.snippet` | `next.config.js` | Add rewrites to `rewrites()` return array, add headers to `headers()` return array |
| `README_ADDITION.md.snippet` | `README.md` | Add the markdown section after "Integration Guide", before "Supported Providers" |
| `CLAUDE_MD_ADDITION.md.snippet` | `CLAUDE.md` | Append section (or create CLAUDE.md if it does not exist) |
| `PACKAGE_JSON_ADDITION.js.snippet` | `package.json` | Add scripts to "scripts" object |

### Generated (created by build-skill.sh)

| Generated File | When | Source |
|---------------|------|--------|
| `public/downloads/p402.zip` | `npm run build:skill` | Zipped from `.claude/skills/p402/` |
| `public/downloads/p402.skill` | `npm run build:skill` | Copy of p402.zip with .skill extension |
| `public/llms-full.txt` | `npm run build:skill` | Concatenation of all skill markdown files |

### Marketplace PRs (external submissions)

| PR Template | Target Repository | Priority |
|------------|-------------------|----------|
| `marketplace/PR_ANTHROPICS_SKILLS.md` | `github.com/anthropics/skills` | High - official Anthropic marketplace |
| `marketplace/PR_AWESOME_CLAUDE_SKILLS.md` | `github.com/travisvn/awesome-claude-skills` | High - most-starred curated list |
| `marketplace/PR_LLMS_TXT_HUB.md` | `github.com/thedaviddias/llms-txt-hub` | Medium - llms.txt directory |

### Manual Submissions (no PR template needed)

| Platform | URL | What to Submit |
|----------|-----|---------------|
| SkillsMP | skillsmp.com | GitHub repo URL for indexing |
| GetClaudeSkills | getclaudeskills.com | .skill file + description |
| LLMTEXT MCP | llmtext.com | p402.io domain for llms.txt MCP generation |

---

## Execution Order

```
Phase 1: Core Integration (commit to repo)
  1. mkdir -p .claude/skills/p402/references
  2. Copy all skill files
  3. Replace public/llms.txt
  4. Create scripts/build-skill.sh && chmod +x
  5. Run ./scripts/build-skill.sh (generates downloads + llms-full.txt)
  6. Create app/skill/[...path]/route.ts
  7. Create app/docs/skill/page.tsx
  8. Replace app/.well-known/agent.json/route.ts
  9. Create skills-index.json at repo root
  10. Apply all snippets (next.config, docs index, README, CLAUDE.md, package.json)
  11. git add -A && git commit -m "feat: add P402 Claude skill with full distribution"

Phase 2: Deploy and Verify
  12. Push to main (Vercel deploys automatically)
  13. Verify: https://p402.io/llms.txt
  14. Verify: https://p402.io/llms-full.txt
  15. Verify: https://p402.io/skill/SKILL.md
  16. Verify: https://p402.io/skill/p402.zip
  17. Verify: https://p402.io/docs/skill
  18. Verify: https://p402.io/.well-known/agent.json (check skill in endpoints)

Phase 3: External Distribution
  19. Submit PR to anthropics/skills
  20. Submit PR to awesome-claude-skills
  21. Submit PR to llms-txt-hub
  22. Submit to SkillsMP for indexing
  23. Submit to GetClaudeSkills marketplace
  24. Register p402.io with LLMTEXT MCP
```
