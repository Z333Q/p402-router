/**
 * Authentication Middleware for Cloudflare Workers
 * Handles API key validation and request authorization
 */

export class AuthHandler {
  /**
   * Authentication middleware for protected endpoints
   */
  static async middleware(request: Request, env: any, ctx: ExecutionContext): Promise<Response | null> {
    try {
      // Get authorization header
      const authHeader = request.headers.get('Authorization');

      if (!authHeader) {
        return new Response(JSON.stringify({
          error: 'Missing Authorization header',
          message: 'Protected endpoint requires authentication'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Parse bearer token
      const [scheme, token] = authHeader.split(' ');

      if (scheme !== 'Bearer' || !token) {
        return new Response(JSON.stringify({
          error: 'Invalid Authorization format',
          message: 'Use Bearer token authentication'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Validate token
      const isValid = await AuthHandler.validateToken(token, env);

      if (!isValid) {
        return new Response(JSON.stringify({
          error: 'Invalid or expired token',
          message: 'Authentication failed'
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Add authenticated context to request
      (request as any).auth = {
        authenticated: true,
        tokenHash: AuthHandler.hashToken(token)
      };

      return null; // Continue to next handler
    } catch (error) {
      console.error('Auth middleware error:', error);
      return new Response(JSON.stringify({
        error: 'Authentication service unavailable',
        message: 'Please try again later'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Validate API token
   */
  private static async validateToken(token: string, env: any): Promise<boolean> {
    try {
      // For MVP, use simple token validation
      // In production, this would check against a database or JWT validation

      // Check if token matches expected format (API key)
      if (!token.match(/^p402_[a-zA-Z0-9]{32,}$/)) {
        return false;
      }

      // For demo purposes, accept any well-formed token
      // In production, validate against registered API keys
      return true;

    } catch (error) {
      console.warn('Token validation failed:', error);
      return false;
    }
  }

  /**
   * Hash token for logging (don't log raw tokens)
   */
  private static hashToken(token: string): string {
    // Simple hash for logging purposes
    const start = token.substring(0, 8);
    const end = token.substring(token.length - 4);
    return `${start}...${end}`;
  }

  /**
   * Generate secure API key
   */
  static generateAPIKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'p402_';

    // Generate 32 character suffix
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
  }

  /**
   * Optional: Session-based authentication
   */
  static async validateSession(sessionId: string, env: any): Promise<boolean> {
    try {
      const session = await env.RECEIPTS_KV.get(`session:${sessionId}`);

      if (!session) {
        return false;
      }

      const sessionData = JSON.parse(session);
      const now = Date.now();

      // Check if session is expired
      if (sessionData.expiresAt && now > sessionData.expiresAt) {
        // Clean up expired session
        await env.RECEIPTS_KV.delete(`session:${sessionId}`);
        return false;
      }

      return true;
    } catch (error) {
      console.warn('Session validation failed:', error);
      return false;
    }
  }

  /**
   * Create authenticated session
   */
  static async createSession(userId: string, ttlSeconds: number, env: any): Promise<string> {
    const sessionId = crypto.randomUUID();
    const sessionData = {
      userId,
      createdAt: Date.now(),
      expiresAt: Date.now() + (ttlSeconds * 1000)
    };

    await env.RECEIPTS_KV.put(
      `session:${sessionId}`,
      JSON.stringify(sessionData),
      { expirationTtl: ttlSeconds }
    );

    return sessionId;
  }
}