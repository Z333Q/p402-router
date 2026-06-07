/**
 * Slice 3N — Cross-page forbidden-phrase scan.
 *
 * Reads the TSX source of every page we ship under the AI-spend-
 * accountability path and asserts none of the FORBIDDEN_PHRASES list
 * appears in user-facing prose. This is a copy-shape regression guard:
 * if a future edit drops "we recommend switching to model X" into a
 * page, the test goes red.
 *
 * The scan strips line comments (// ...) and block comments before
 * matching, so the FORBIDDEN_PHRASES constant itself (referenced in
 * documentation comments inside lib/dashboard/language.ts) does not
 * trip the check.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { FORBIDDEN_PHRASES } from '@/lib/dashboard/language';

/** Paths checked by the scan. Slice 3N-touched files first. */
const PAGE_PATHS = [
    'app/dashboard/prove/page.tsx',
    'app/dashboard/prove/event/[request_id]/page.tsx',
    'app/dashboard/prove/report/page.tsx',
    'app/dashboard/prove/outcomes/page.tsx',
    'app/dashboard/prove/outcomes/setup/page.tsx',
    'app/dashboard/accountability/page.tsx',
] as const;

function stripComments(src: string): string {
    return src
        // block comments
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // line comments
        .split('\n')
        .map((l) => l.replace(/\/\/.*$/, ''))
        .join('\n');
}

describe('Cross-page copy scan', () => {
    it.each(PAGE_PATHS.map((p) => [p]))(
        '%s contains no forbidden product phrases',
        (path) => {
            const src = stripComments(readFileSync(resolve(process.cwd(), path), 'utf8')).toLowerCase();
            for (const phrase of FORBIDDEN_PHRASES) {
                expect(
                    src,
                    `${path} must not contain the forbidden phrase '${phrase}'`,
                ).not.toContain(phrase);
            }
        },
    );

    it('every primary-path page imports a metadata-only or readiness disclaimer where appropriate', () => {
        // Spot check: every page in /dashboard/prove/outcomes (any depth)
        // and /dashboard/accountability must reference at least one
        // language constant from lib/dashboard/language.
        for (const path of [
            'app/dashboard/prove/outcomes/page.tsx',
            'app/dashboard/prove/outcomes/setup/page.tsx',
            'app/dashboard/accountability/page.tsx',
            'app/dashboard/prove/event/[request_id]/page.tsx',
            'app/dashboard/prove/report/page.tsx',
        ]) {
            const src = readFileSync(resolve(process.cwd(), path), 'utf8');
            expect(src, `${path} should import a shared disclaimer constant`)
                .toMatch(/from '@\/lib\/dashboard\/language'/);
        }
    });
});
