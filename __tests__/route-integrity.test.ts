import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const APP_DIR = path.resolve(__dirname, '../app');

/**
 * Recursively scan a directory and return all child directory names
 */
function getSubdirectories(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
}

/**
 * Recursively walk directory tree and collect all directories
 */
function walkDirs(dir: string): string[] {
  const result: string[] = [dir];
  const subdirs = getSubdirectories(dir);
  for (const sub of subdirs) {
    result.push(...walkDirs(path.join(dir, sub)));
  }
  return result;
}

/**
 * Check if a directory name is a dynamic route segment
 */
function isDynamicSegment(name: string): boolean {
  return name.startsWith('[') && name.endsWith(']');
}

/**
 * Check if a directory name is a catch-all route segment
 */
function isCatchAllSegment(name: string): boolean {
  return name.startsWith('[...') && name.endsWith(']');
}

/**
 * Extract param name from dynamic segment, e.g., [id] -> id, [...slug] -> ...slug
 */
function getParamName(segment: string): string {
  return segment.slice(1, -1);
}

describe('Route Integrity', () => {
  it('should not have conflicting dynamic route params at the same directory level', () => {
    const allDirs = walkDirs(APP_DIR);
    const conflicts: string[] = [];

    for (const dir of allDirs) {
      const subdirs = getSubdirectories(dir);
      const dynamicSegments = subdirs.filter(isDynamicSegment);

      if (dynamicSegments.length > 1) {
        const paramNames = dynamicSegments.map(getParamName);
        const unique = new Set(paramNames);
        if (unique.size > 1) {
          const relPath = path.relative(APP_DIR, dir);
          conflicts.push(
            `"${relPath}" has conflicting dynamic segments: ${dynamicSegments.join(', ')}`
          );
        }
      }
    }

    expect(conflicts, `Dynamic route conflicts found:\n${conflicts.join('\n')}`).toHaveLength(0);
  });

  it('should not have catch-all and regular dynamic segments at the same level', () => {
    const allDirs = walkDirs(APP_DIR);
    const conflicts: string[] = [];

    for (const dir of allDirs) {
      const subdirs = getSubdirectories(dir);
      const dynamicSegments = subdirs.filter(isDynamicSegment);
      const catchAlls = dynamicSegments.filter(isCatchAllSegment);
      const regulars = dynamicSegments.filter(d => !isCatchAllSegment(d));

      if (catchAlls.length > 0 && regulars.length > 0) {
        const relPath = path.relative(APP_DIR, dir);
        conflicts.push(
          `"${relPath}" has catch-all ${catchAlls.join(', ')} conflicting with ${regulars.join(', ')}`
        );
      }
    }

    expect(conflicts, `Catch-all conflicts found:\n${conflicts.join('\n')}`).toHaveLength(0);
  });

  it('should not have both route.ts and route.js in the same directory', () => {
    const allDirs = walkDirs(APP_DIR);
    const conflicts: string[] = [];

    for (const dir of allDirs) {
      const files = fs.existsSync(dir)
        ? fs.readdirSync(dir, { withFileTypes: true })
          .filter(f => f.isFile())
          .map(f => f.name)
        : [];

      const hasRouteTs = files.includes('route.ts');
      const hasRouteJs = files.includes('route.js');

      if (hasRouteTs && hasRouteJs) {
        const relPath = path.relative(APP_DIR, dir);
        conflicts.push(`"${relPath}" has both route.ts and route.js`);
      }
    }

    expect(conflicts, `Dual route files found:\n${conflicts.join('\n')}`).toHaveLength(0);
  });

  it('should not have duplicate dynamic segment names across nested levels on the same path', () => {
    // Walk the tree and for each route.ts, check the path for reused param names
    const allDirs = walkDirs(APP_DIR);
    const warnings: string[] = [];

    for (const dir of allDirs) {
      const files = fs.existsSync(dir)
        ? fs.readdirSync(dir).filter(f => f === 'route.ts' || f === 'route.js')
        : [];

      if (files.length === 0) continue;

      // Get the path segments from app/ to this directory
      const relPath = path.relative(APP_DIR, dir);
      const segments = relPath.split(path.sep);
      const dynamicParams = segments.filter(isDynamicSegment).map(getParamName);
      const seen = new Set<string>();

      for (const param of dynamicParams) {
        if (seen.has(param)) {
          warnings.push(`"${relPath}" has duplicate param name [${param}] in path`);
        }
        seen.add(param);
      }
    }

    expect(warnings, `Duplicate param names found:\n${warnings.join('\n')}`).toHaveLength(0);
  });
});
