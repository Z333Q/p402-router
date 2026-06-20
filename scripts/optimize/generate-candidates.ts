/* eslint-disable no-console */
import { readFileSync } from 'node:fs';
import { runCandidatePipeline } from '../../lib/optimize/candidates';
import type { GeneratorInput } from '../../lib/optimize/candidates';

const FIXTURE_FLAG = '--fixture';
const ALLOW_PROD_FLAG = '--allow-production';

function usage(): never {
  console.error('Usage: tsx scripts/optimize/generate-candidates.ts --fixture <path-to-json>');
  console.error('');
  console.error('Phase 1 is internal-only and runs against fixture data by default.');
  console.error('Production execution is intentionally disabled in this slice.');
  process.exit(2);
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.includes(ALLOW_PROD_FLAG)) {
    console.error('REFUSED: production execution is not permitted in Phase 1.');
    console.error('A later approved slice must explicitly enable read-only production data.');
    process.exit(3);
  }

  const fxIdx = args.indexOf(FIXTURE_FLAG);
  if (fxIdx === -1 || !args[fxIdx + 1]) usage();
  const path = args[fxIdx + 1] as string;

  const raw = readFileSync(path, 'utf8');
  const input = JSON.parse(raw) as GeneratorInput;

  const candidates = runCandidatePipeline(input);
  console.log(JSON.stringify({ count: candidates.length, candidates }, null, 2));
}

main();
