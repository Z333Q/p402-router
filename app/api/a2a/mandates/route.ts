
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { query } from '@/lib/db';
import { AP2Mandate } from '@/lib/a2a-types';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { mandate } = body;

        if (!mandate || !mandate.user_did || !mandate.agent_did || !mandate.constraints) {
            return NextResponse.json({ error: 'Invalid mandate structure' }, { status: 400 });
        }

        // In a real implementation, we would VERIFY the signature here.
        // verifyEIP712(mandate)

        const mandateId = `mnd_${uuidv4()}`; // Generate or use provided ID? Usually generate.

        await query(
            `INSERT INTO ap2_mandates (
            id, tenant_id, type, user_did, agent_did, constraints, 
            signature, public_key, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')`,
            [
                mandateId,
                null, // tenant_id, assume global or derived from context for now
                mandate.type || 'intent',
                mandate.user_did,
                mandate.agent_did,
                JSON.stringify(mandate.constraints),
                mandate.signature,
                mandate.public_key
            ]
        );

        return NextResponse.json({
            id: mandateId,
            status: 'active'
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
