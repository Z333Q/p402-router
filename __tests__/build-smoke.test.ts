import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('Build Smoke Test', () => {
  it('next build completes without error', () => {
    // This test is excluded from default vitest run
    // Run with: npm run test:build
    let exitCode = 0;
    try {
      execSync('npx next build', {
        cwd: ROOT,
        timeout: 120_000,
        stdio: 'pipe',
        env: {
          ...process.env,
          NODE_ENV: 'production',
        },
      });
    } catch (e: any) {
      exitCode = e.status ?? 1;
      // Log build output for debugging
      if (e.stdout) console.log(e.stdout.toString());
      if (e.stderr) console.log(e.stderr.toString());
    }

    expect(exitCode, 'next build failed — check TypeScript errors, route conflicts, or import issues').toBe(0);
  });
});
