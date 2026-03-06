import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import type { AuthStateResponse } from '@/lib/hooks/useAuthState';

function respond(payload: AuthStateResponse) {
    return NextResponse.json(payload);
}

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        return respond({ state: 'visitor', walletAddress: null });
    }

    const email = session.user.email;

    // CDP wallet users: email is {address}@wallet.p402.io — wallet IS their identity
    if (email.endsWith('@wallet.p402.io')) {
        const address = email.replace('@wallet.p402.io', '');
        return respond({ state: 'wallet_linked', walletAddress: address });
    }

    // Google/other users: check if they've linked an external wallet
    try {
        const result = await pool.query(
            'SELECT owner_wallet FROM tenants WHERE owner_email = $1 LIMIT 1',
            [email]
        );
        const row = result.rows[0] as { owner_wallet: string | null } | undefined;
        const walletAddress = row?.owner_wallet ?? null;

        if (!walletAddress) {
            return respond({ state: 'identity_only', walletAddress: null });
        }

        return respond({ state: 'wallet_linked', walletAddress });
    } catch {
        return respond({ state: 'identity_only', walletAddress: null });
    }
}
