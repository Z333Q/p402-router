import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const APP_DIR = path.resolve(__dirname, '../app');
const VALID_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];

/**
 * Recursively find all route.ts files under app/api/
 */
function findRouteFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findRouteFiles(fullPath));
    } else if (entry.name === 'route.ts' || entry.name === 'route.js') {
      results.push(fullPath);
    }
  }
  return results;
}

describe('API Route Exports', () => {
  const apiDir = path.join(APP_DIR, 'api');
  const routeFiles = findRouteFiles(apiDir);

  it('finds at least one route file', () => {
    expect(routeFiles.length).toBeGreaterThan(0);
  });

  it.each(routeFiles.map(f => [path.relative(APP_DIR, f), f]))(
    '%s exports at least one valid HTTP method',
    (_relPath, filePath) => {
      const content = fs.readFileSync(filePath as string, 'utf-8');
      const hasExportedMethod = VALID_METHODS.some(method => {
        // Match `export async function GET`, `export function GET`, `export const GET`,
        // or `export { handler as GET }` (used by NextAuth and similar)
        const patterns = [
          new RegExp(`export\\s+(async\\s+)?function\\s+${method}\\b`),
          new RegExp(`export\\s+const\\s+${method}\\b`),
          new RegExp(`export\\s+\\{[^}]*\\bas\\s+${method}\\b`),
        ];
        return patterns.some(p => p.test(content));
      });

      expect(
        hasExportedMethod,
        `${_relPath} does not export any valid HTTP method handler (${VALID_METHODS.join(', ')})`
      ).toBe(true);
    }
  );

  it.each(routeFiles.map(f => [path.relative(APP_DIR, f), f]))(
    '%s does not use invalid default export',
    (_relPath, filePath) => {
      const content = fs.readFileSync(filePath as string, 'utf-8');
      // App Router API routes should NOT export default function as the handler
      // (export default is OK for config objects like `export const dynamic`)
      const hasDefaultHandler = /export\s+default\s+(async\s+)?function\s*\(/.test(content);

      expect(
        hasDefaultHandler,
        `${_relPath} uses "export default function" which is invalid for App Router API routes`
      ).toBe(false);
    }
  );
});
