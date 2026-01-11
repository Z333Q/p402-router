import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth";
import pool from '@/lib/db';
import { z } from 'zod';

const ImportSchema = z.object({
    facilitatorId: z.string().min(1),
});

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as { tenantId?: string } | undefined;

        if (!user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { facilitatorId } = ImportSchema.parse(body);

        // 1. Fetch the source facilitator (must be Global type)
        const sourceResult = await pool.query(
            `SELECT * FROM facilitators WHERE facilitator_id = $1 AND type = 'Global'`,
            [facilitatorId]
        );

        if (sourceResult.rows.length === 0) {
            return NextResponse.json(
                { error: 'Facilitator not found or not available for import' },
                { status: 404 }
            );
        }

        const source = sourceResult.rows[0];

        // 2. Check if user already has this facilitator
        const existingResult = await pool.query(
            `SELECT facilitator_id FROM facilitators 
       WHERE tenant_id = $1 AND name = $2`,
            [user.tenantId, source.name]
        );

        if (existingResult.rows.length > 0) {
            return NextResponse.json(
                { error: 'You already have this facilitator in your account' },
                { status: 409 }
            );
        }

        // 3. Clone facilitator to user's tenant
        const newFacilitatorId = `fac_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        await pool.query(
            `INSERT INTO facilitators (
        facilitator_id, tenant_id, name, endpoint, auth_config, 
        networks, status, type
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)`,
            [
                newFacilitatorId,
                user.tenantId,
                source.name,
                source.endpoint,
                JSON.stringify(source.auth_config),
                source.networks,
                'active',
                'Private' // User's copy is Private, not Global
            ]
        );

        return NextResponse.json({
            success: true,
            facilitatorId: newFacilitatorId,
            message: 'Facilitator added to your account'
        });

    } catch (e: any) {
        if (e instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
        }
        console.error('Facilitator import failed:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
