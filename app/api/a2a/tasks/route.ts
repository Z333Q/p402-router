
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const state = searchParams.get('state');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Basic query
    let sql = 'SELECT * FROM a2a_tasks';
    const params: any[] = [];

    if (state) {
        sql += ' WHERE state = $1';
        params.push(state);
    }

    sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    try {
        const res = await query(sql, params);
        return NextResponse.json({ tasks: res.rows });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
