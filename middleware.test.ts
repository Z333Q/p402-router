import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware, config } from './middleware';

function makeReq(
  path: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
  } = {}
) {
  const { method = 'GET', headers = {}, cookies = {} } = options;
  const url = new URL(path, 'https://p402.io');
  const req = new NextRequest(url, { method, headers });
  for (const [k, v] of Object.entries(cookies)) {
    req.cookies.set(k, v);
  }
  return req;
}

// ===========================================================================
// CORS Preflight
// ===========================================================================
describe('Middleware — CORS Preflight', () => {
  it('OPTIONS on /api/* returns 204', () => {
    const res = middleware(makeReq('/api/v2/sessions', { method: 'OPTIONS' }));
    expect(res.status).toBe(204);
  });

  it('sets correct Allow-Methods and Allow-Headers', () => {
    const res = middleware(makeReq('/api/test', { method: 'OPTIONS' }));
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe(
      'GET, POST, PUT, DELETE, PATCH, OPTIONS'
    );
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('X-P402-Session');
  });

  it('sets Max-Age to 86400', () => {
    const res = middleware(makeReq('/api/test', { method: 'OPTIONS' }));
    expect(res.headers.get('Access-Control-Max-Age')).toBe('86400');
  });

  it('returns specific origin for allowed origin (p402.io)', () => {
    const res = middleware(
      makeReq('/api/test', { method: 'OPTIONS', headers: { origin: 'https://p402.io' } })
    );
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://p402.io');
  });

  it('returns * for unknown origin', () => {
    const res = middleware(
      makeReq('/api/test', { method: 'OPTIONS', headers: { origin: 'https://evil.com' } })
    );
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('allows .p402.io subdomains', () => {
    const res = middleware(
      makeReq('/api/test', { method: 'OPTIONS', headers: { origin: 'https://staging.p402.io' } })
    );
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://staging.p402.io');
  });
});

// ===========================================================================
// Protected Paths — Auth
// ===========================================================================
describe('Middleware — Protected Paths', () => {
  it('returns 401 on /api/v2/chat without session', () => {
    const res = middleware(makeReq('/api/v2/chat/completions'));
    expect(res.status).toBe(401);
  });

  it('passes with x-p402-session header', () => {
    const res = middleware(
      makeReq('/api/v2/chat/completions', {
        headers: { 'x-p402-session': 'sess_abc123' },
      })
    );
    // Should be a next() response, not 401
    expect(res.status).not.toBe(401);
  });

  it('passes with Bearer auth header', () => {
    const res = middleware(
      makeReq('/api/v2/chat/completions', {
        headers: { authorization: 'Bearer some-token' },
      })
    );
    expect(res.status).not.toBe(401);
  });

  it('passes with next-auth session cookie for internal paths', () => {
    const res = middleware(
      makeReq('/api/v2/analytics/dashboard', {
        cookies: { 'next-auth.session-token': 'some-session' },
      })
    );
    expect(res.status).not.toBe(401);
  });

  it('rejects session not starting with sess_', () => {
    const res = middleware(
      makeReq('/api/v2/chat/completions', {
        headers: { 'x-p402-session': 'bad_format_123' },
      })
    );
    expect(res.status).toBe(401);
    // Check the error code
  });

  it('returns MISSING_SESSION code when no session provided', async () => {
    const res = middleware(makeReq('/api/v2/chat/completions'));
    const body = await res.json();
    expect(body.error.code).toBe('MISSING_SESSION');
  });

  it('returns INVALID_SESSION code for bad session format', async () => {
    const res = middleware(
      makeReq('/api/v2/chat/completions', {
        headers: { 'x-p402-session': 'invalid_123' },
      })
    );
    const body = await res.json();
    expect(body.error.code).toBe('INVALID_SESSION');
  });
});

// ===========================================================================
// Security Headers
// ===========================================================================
describe('Middleware — Security Headers', () => {
  it('sets HSTS header', () => {
    const res = middleware(makeReq('/dashboard'));
    expect(res.headers.get('Strict-Transport-Security')).toContain('max-age=63072000');
    expect(res.headers.get('Strict-Transport-Security')).toContain('includeSubDomains');
  });

  it('sets X-Frame-Options SAMEORIGIN', () => {
    const res = middleware(makeReq('/dashboard'));
    expect(res.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
  });

  it('sets X-Content-Type-Options nosniff', () => {
    const res = middleware(makeReq('/dashboard'));
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('sets Content-Security-Policy', () => {
    const res = middleware(makeReq('/dashboard'));
    expect(res.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
  });

  it('sets Referrer-Policy', () => {
    const res = middleware(makeReq('/dashboard'));
    expect(res.headers.get('Referrer-Policy')).toBe('origin-when-cross-origin');
  });

  it('sets Permissions-Policy', () => {
    const res = middleware(makeReq('/dashboard'));
    expect(res.headers.get('Permissions-Policy')).toContain('camera=()');
  });

  it('sets X-DNS-Prefetch-Control', () => {
    const res = middleware(makeReq('/dashboard'));
    expect(res.headers.get('X-DNS-Prefetch-Control')).toBe('on');
  });
});

// ===========================================================================
// Request ID
// ===========================================================================
describe('Middleware — Request ID', () => {
  it('sets X-P402-Request-ID as UUID format', () => {
    const res = middleware(makeReq('/api/v1/test'));
    const requestId = res.headers.get('X-P402-Request-ID');
    expect(requestId).toBeTruthy();
    // UUID v4 format: 8-4-4-4-12
    expect(requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });
});

// ===========================================================================
// CORS for non-preflight API requests
// ===========================================================================
describe('Middleware — CORS on normal API requests', () => {
  it('sets CORS headers for API routes', () => {
    const res = middleware(
      makeReq('/api/v1/test', { headers: { origin: 'https://mini.p402.io' } })
    );
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://mini.p402.io');
  });

  it('sets * for unknown origin on API routes', () => {
    const res = middleware(
      makeReq('/api/v1/test', { headers: { origin: 'https://unknown.com' } })
    );
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});

// ===========================================================================
// Config Matcher
// ===========================================================================
describe('Middleware — Config', () => {
  it('has a matcher pattern defined', () => {
    expect(config.matcher).toBeDefined();
    expect(config.matcher.length).toBeGreaterThan(0);
  });

  it('matcher pattern contains negative lookahead for api/auth', () => {
    const pattern = config.matcher[0] as string;
    expect(pattern).toContain('api/auth');
  });

  it('matcher pattern contains negative lookahead for _next/static', () => {
    const pattern = config.matcher[0] as string;
    expect(pattern).toContain('_next/static');
  });

  it('matcher pattern contains negative lookahead for favicon.ico', () => {
    const pattern = config.matcher[0] as string;
    expect(pattern).toContain('favicon.ico');
  });

  it('matcher pattern contains negative lookahead for _next/image', () => {
    const pattern = config.matcher[0] as string;
    expect(pattern).toContain('_next/image');
  });
});
