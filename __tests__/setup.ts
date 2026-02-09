import { afterEach, beforeEach, vi } from 'vitest';

// Suppress console.error and console.warn during tests
let originalError: typeof console.error;
let originalWarn: typeof console.warn;

beforeEach(() => {
  originalError = console.error;
  originalWarn = console.warn;
  console.error = vi.fn();
  console.warn = vi.fn();
});

afterEach(() => {
  console.error = originalError;
  console.warn = originalWarn;
  vi.restoreAllMocks();
});
