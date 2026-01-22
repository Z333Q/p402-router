
import { describe, it, expect } from 'vitest';

/**
 * Privacy Scrubbing Logic (as implemented in code-audit/route.ts)
 * Logic: code.substring(0, 100).replace(/sk-[a-zA-Z0-9]{20,}/g, "sk-REDACTED")
 */
function scrubCode(code: string): string {
    return code.substring(0, 100).replace(/sk-[a-zA-Z0-9]{20,}/g, "sk-REDACTED");
}

describe('Privacy Scrubbing (Agent #3 Security Policy)', () => {
    it('should redact OpenAI-style API keys', () => {
        const input = "const key = 'sk-abcdefghijklmnopqrstuvwxyz1234567890';\nconsole.log(key);";
        const result = scrubCode(input);

        expect(result).toContain('sk-REDACTED');
        expect(result).not.toContain('abcdefghijklmnopqrstuvwxyz');
    });

    it('should handle code without keys', () => {
        const input = "function hello() { console.log('world'); }";
        const result = scrubCode(input);

        expect(result).toBe(input);
    });

    it('should only redact keys starting with sk- and followed by 20+ chars', () => {
        // Too short
        const short = "sk-123";
        expect(scrubCode(short)).toBe(short);

        // Not sk-
        const other = "pk-abcdefghijklmnopqrstuvwxyz1234567890";
        expect(scrubCode(other)).toBe(other);
    });

    it('should respect the 100 char limit for the preview', () => {
        const long = "A".repeat(150);
        const result = scrubCode(long);
        expect(result.length).toBe(100);
    });
});
