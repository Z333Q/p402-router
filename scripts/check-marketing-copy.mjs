#!/usr/bin/env node
/**
 * 3S-0B — Marketing Copy Quality Guard (report-only)
 *
 * Scans the public marketing route surface for copy that violates the
 * 3S-0 standard in docs/internal/3S-public-buyer-surface.md:
 *
 *   - Banned punctuation: em dash, decorative arrow glyphs.
 *   - Banned hype words and phrases.
 *   - Banned unsupported claims (savings, runtime flip, Optimize,
 *     Cloudflare routing, "never store content").
 *
 * Report-only: always exits 0. Not a build gate. Promote to a CI gate
 * only after the canonical /meter buyer-page template has been
 * approved and the false-positive surface is understood.
 *
 * Run: node scripts/check-marketing-copy.mjs
 *   or: npm run check:marketing-copy
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const REPO_ROOT = process.cwd();

// ── Scope ────────────────────────────────────────────────────────────
// Only public marketing routes. Excludes /dashboard, /admin, /api,
// /docs, /partner (authenticated portal), and all non-route code.
// Add routes here as 3S sub-slices land (e.g., /monitor, /control,
// /optimize, /settle, /prove buyer pages from 3S-1B/1C; /enterprise,
// /developers hub, /ai-spend-audit from 3S-3/3S-4).
const SCOPE = [
    'app/page.tsx',
    'app/meter',
    'app/settle',
    'app/trust',
    'app/partners',
    'app/pricing',
    'app/product',
    'app/status',
    'app/changelog',
    'app/developers',
];

const FILE_EXTS = new Set(['.tsx', '.mdx', '.md']);

// Files inside scope dirs that should be skipped (tests, fixtures,
// generated data, demo store/data modules that aren't user-visible).
const SKIP_PATH_PARTS = new Set([
    '__tests__',
    '_demo',
    '_store',
    'fixtures',
    'node_modules',
]);

// ── Rules ────────────────────────────────────────────────────────────
// Each rule has an id, severity, description, and a `find(line)`
// function returning an array of { col, snippet } matches.

const RULES = [
    {
        id: 'em-dash',
        severity: 'error',
        desc: 'Em dash banned in marketing copy (3S-0 §5). Use colon, comma, period, or semicolon.',
        re: /—/g,
    },
    {
        id: 'arrow-right',
        severity: 'error',
        desc: 'Right-arrow glyph banned in marketing body copy (3S-0 §5).',
        re: /→/g,
    },
    {
        id: 'arrow-fat',
        severity: 'error',
        desc: 'Fat-arrow glyph banned in marketing body copy (3S-0 §5).',
        re: /⇒/g,
    },

    // Hype / filler word list from 3S-0 §6.
    // Word-bounded, case-insensitive. Allowlist of legitimate technical
    // terms (OpenRouter, etc.) does not overlap with these matches.
    {
        id: 'banned-hype-word',
        severity: 'warn',
        desc: 'Hype or filler word from 3S-0 §6 banned list.',
        re: new RegExp(
            '\\b(' + [
                'unlock', 'seamless', 'revolutionary', 'powerful', 'robust',
                'harness', 'utilize', 'delve', 'landscape', 'transformative',
                'world-class', 'best-in-class', 'crystal clear', 'reimagine',
                'skyrocket', 'supercharge', 'future-proof', 'effortless',
                'AI-native', 'frictionless', 'cutting edge', 'cutting-edge',
                'game changer', 'game-changer', 'ever-evolving',
                'agentic era', 'autonomous future',
            ].join('|') + ')\\b',
            'gi',
        ),
    },

    // Contextual banned claims. These are matched as phrases; humans
    // triage in case the surrounding sentence makes the claim legitimate
    // (e.g. a quoted FAQ answer that explicitly says "P402 does not say
    // 'compliant' without naming scope"). Severity 'warn' so the
    // marketing reviewer triages each finding rather than the script
    // claiming authority over copy intent.
    {
        id: 'unsupported-claim-compliant',
        severity: 'warn',
        desc: 'Unsupported claim: "compliant" without naming scope (3S-0 §6).',
        re: /\bcompliant\b/gi,
    },
    {
        id: 'unsupported-claim-secure',
        severity: 'warn',
        desc: 'Unsupported claim: "secure" without specific control (3S-0 §6).',
        re: /\bsecure\b/gi,
    },
    {
        id: 'unsupported-claim-enterprise-ready',
        severity: 'warn',
        desc: 'Unsupported claim: "enterprise-ready" without proof artifact (3S-0 §6).',
        re: /\benterprise[- ]ready\b/gi,
    },
    {
        id: 'unsupported-claim-scalable',
        severity: 'warn',
        desc: 'Unsupported claim: "scalable" without proof (3S-0 §6).',
        re: /\bscalable\b/gi,
    },

    // Hard claims that conflict with shipped reality.
    {
        id: 'forbidden-claim-runtime-live',
        severity: 'error',
        desc: 'Runtime flip is gated; do not claim it is live (3S-0 §0).',
        re: /\b(runtime (?:flip|enforcement) (?:is )?(?:live|enabled|on))\b/gi,
    },
    {
        id: 'forbidden-claim-optimize-live',
        severity: 'error',
        desc: 'Optimize recommendations are gated; do not claim live (3S-0 §0).',
        re: /\boptimize (?:recommendations|savings) (?:are )?(?:live|enabled|on)\b/gi,
    },
    {
        id: 'forbidden-claim-cloudflare-routing',
        severity: 'error',
        desc: 'Cloudflare routing is not enabled; do not claim otherwise (3S-0 §0).',
        re: /\bcloudflare (?:routing|traffic) (?:is )?(?:enabled|live|on)\b/gi,
    },
    {
        id: 'forbidden-claim-never-store-content',
        severity: 'error',
        desc: 'Privacy overclaim: "we never store content" is false in full-trace opt-in (3S-0 §6).',
        re: /\b(we|p402) never store(?:s)? (?:content|prompts|responses)\b/gi,
    },
];

// ── Scan ─────────────────────────────────────────────────────────────

/** @returns {string[]} absolute paths of files in scope */
function collectFiles() {
    const files = [];
    for (const entry of SCOPE) {
        const abs = join(REPO_ROOT, entry);
        let st;
        try {
            st = statSync(abs);
        } catch {
            // Scope entry does not exist yet (route not built). Skip silently.
            continue;
        }
        if (st.isFile()) {
            if (hasIncludedExt(abs)) files.push(abs);
            continue;
        }
        walk(abs, files);
    }
    return files;
}

function walk(dir, out) {
    let entries;
    try {
        entries = readdirSync(dir, { withFileTypes: true });
    } catch {
        return;
    }
    for (const ent of entries) {
        if (SKIP_PATH_PARTS.has(ent.name)) continue;
        const abs = join(dir, ent.name);
        if (ent.isDirectory()) {
            walk(abs, out);
        } else if (ent.isFile() && hasIncludedExt(abs)) {
            out.push(abs);
        }
    }
}

function hasIncludedExt(p) {
    const dot = p.lastIndexOf('.');
    if (dot < 0) return false;
    return FILE_EXTS.has(p.slice(dot));
}

function scanFile(abs) {
    const findings = [];
    const text = readFileSync(abs, 'utf8');
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip pure-code lines that obviously aren't user-visible copy:
        // imports, type-only lines, JSX attribute-only lines. Cheap heuristic.
        if (/^\s*(import|export\s+\{|type\s|const\s+\w+\s*=\s*[a-zA-Z_]|\}\)?;?\s*$)/.test(line)) {
            continue;
        }
        for (const rule of RULES) {
            // Use matchAll on a fresh regex (rule.re is global; need
            // lastIndex reset is implicit with matchAll).
            const ms = [...line.matchAll(rule.re)];
            for (const m of ms) {
                findings.push({
                    file: relative(REPO_ROOT, abs),
                    line: i + 1,
                    col: (m.index ?? 0) + 1,
                    ruleId: rule.id,
                    severity: rule.severity,
                    desc: rule.desc,
                    snippet: line.slice(Math.max(0, (m.index ?? 0) - 20), (m.index ?? 0) + 60).trim(),
                });
            }
        }
    }
    return findings;
}

// ── Main ─────────────────────────────────────────────────────────────

const files = collectFiles();
const allFindings = [];
for (const f of files) {
    const fs = scanFile(f);
    if (fs.length) allFindings.push(...fs);
}

// Group by file for readable output.
allFindings.sort((a, b) =>
    a.file.localeCompare(b.file) || a.line - b.line || a.col - b.col,
);

// Per-rule counts.
const ruleCounts = new Map();
const sevCounts = { error: 0, warn: 0 };
for (const f of allFindings) {
    ruleCounts.set(f.ruleId, (ruleCounts.get(f.ruleId) ?? 0) + 1);
    sevCounts[f.severity] = (sevCounts[f.severity] ?? 0) + 1;
}

// Output.
let lastFile = '';
for (const f of allFindings) {
    if (f.file !== lastFile) {
        if (lastFile) process.stdout.write('\n');
        process.stdout.write(f.file + '\n');
        lastFile = f.file;
    }
    process.stdout.write(
        `  ${String(f.line).padStart(4)}:${String(f.col).padStart(3)}  ` +
        `[${f.severity.toUpperCase().padEnd(5)}] ${f.ruleId.padEnd(34)}  ${f.snippet}\n`,
    );
}

if (allFindings.length) process.stdout.write('\n');

process.stdout.write('── 3S-0B Marketing Copy Quality Guard ──\n');
process.stdout.write(`Scope:    ${SCOPE.join(', ')}\n`);
process.stdout.write(`Files scanned: ${files.length}\n`);
process.stdout.write(`Findings:      ${allFindings.length}  (errors: ${sevCounts.error}, warnings: ${sevCounts.warn})\n`);

if (ruleCounts.size) {
    process.stdout.write('By rule:\n');
    const sortedRules = [...ruleCounts.entries()].sort((a, b) => b[1] - a[1]);
    for (const [id, n] of sortedRules) {
        process.stdout.write(`  ${id.padEnd(36)}  ${n}\n`);
    }
}

process.stdout.write('\nReport-only. Always exits 0. Promote to build gate after /meter (3S-1A) ships.\n');

process.exit(0);
