import { NextRequest } from 'next/server';
import { vi } from 'vitest';

/**
 * Create a NextRequest for testing API routes
 */
export function createRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {}
): NextRequest {
  const { method = 'GET', headers = {}, body } = options;
  const init: RequestInit = { method, headers };
  if (body) init.body = body;
  return new NextRequest(new URL(url, 'http://localhost:3000'), init);
}

/**
 * Create a NextRequest with JSON body
 */
export function createJsonRequest(
  url: string,
  body: Record<string, unknown>,
  options: {
    method?: string;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  const { method = 'POST', headers = {} } = options;
  return createRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

/**
 * Chain mockResolvedValueOnce calls on a pool.query mock
 */
export function mockDbQuery(
  mockPool: { query: ReturnType<typeof vi.fn> },
  ...results: Array<{ rows: unknown[]; rowCount?: number }>
) {
  for (const result of results) {
    mockPool.query.mockResolvedValueOnce({
      rows: result.rows,
      rowCount: result.rowCount ?? result.rows.length,
    });
  }
}

/**
 * Parse JSON from a NextResponse
 */
export async function parseResponse(response: Response) {
  return response.json();
}
