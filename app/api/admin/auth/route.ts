/**
 * POST /api/admin/auth        — login (email + password)
 * DELETE /api/admin/auth      — logout
 */
import { NextRequest, NextResponse } from 'next/server';
import {
    verifyAdminCredentials,
    createAdminSession,
    revokeAdminSession,
    bootstrapSuperAdmins,
    ADMIN_SESSION_COOKIE,
} from '@/lib/admin/auth';
import { checkAdminLoginRateLimit, clearAdminLoginRateLimit } from '@/lib/admin/rate-limit';
import { writeAuditLog, extractIP } from '@/lib/admin/audit';

export async function POST(req: NextRequest) {
    const ip = extractIP(req);
    const ua = req.headers.get('user-agent');

    // Rate limit by IP
    const rl = await checkAdminLoginRateLimit(ip ?? 'unknown');
    if (!rl.allowed) {
        return NextResponse.json(
            { error: 'Too many login attempts. Try again in 15 minutes.' },
            {
                status: 429,
                headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) },
            }
        );
    }

    const body = await req.json().catch(() => null);
    if (!body?.email || !body?.password) {
        return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Ensure env-listed super admins exist in DB
    await bootstrapSuperAdmins();

    const result = await verifyAdminCredentials(body.email, body.password);

    if (!result) {
        await writeAuditLog({
            adminEmail: body.email,
            action: 'session.login_failed',
            resourceType: 'admin_session',
            ipAddress: ip,
            userAgent: ua,
        });
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (result.requiresTOTP) {
        // Return a partial state — client must submit TOTP code next
        return NextResponse.json({ requiresTOTP: true, userId: result.user.id }, { status: 200 });
    }

    const rawToken = await createAdminSession(result.user.id, ip, ua);
    await clearAdminLoginRateLimit(ip ?? 'unknown');

    await writeAuditLog({
        adminUserId: result.user.id,
        adminEmail: result.user.email,
        action: 'session.login',
        resourceType: 'admin_session',
        ipAddress: ip,
        userAgent: ua,
    });

    const response = NextResponse.json({
        ok: true,
        admin: { id: result.user.id, email: result.user.email, name: result.user.name, role: result.user.role },
    });

    response.cookies.set(ADMIN_SESSION_COOKIE, rawToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 2 * 60 * 60, // 2 hours
    });

    return response;
}

export async function DELETE(req: NextRequest) {
    const rawToken = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (rawToken) {
        await revokeAdminSession(rawToken);
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.delete(ADMIN_SESSION_COOKIE);
    return response;
}
