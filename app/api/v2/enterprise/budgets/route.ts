import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireTenantAccess } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const access = await requireTenantAccess(req);
  if (access.error) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const res = await db.query(
      `SELECT id, name, budget_usd FROM enterprise_departments
       WHERE tenant_id = $1 ORDER BY name`,
      [access.tenantId],
    );
    return NextResponse.json({
      departments: res.rows.map((r) => ({
        id: r.id as string,
        name: r.name as string,
        budgetUsd: parseFloat(r.budget_usd ?? '0'),
      })),
    });
  } catch {
    return NextResponse.json({ departments: [] });
  }
}

export async function POST(req: NextRequest) {
  const access = await requireTenantAccess(req);
  if (access.error) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: { department?: string; budget_usd?: number };
  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.department || typeof body.budget_usd !== 'number' || body.budget_usd < 0) {
    return NextResponse.json({ error: 'department and budget_usd required' }, { status: 400 });
  }

  try {
    const res = await db.query(
      `INSERT INTO enterprise_departments (tenant_id, name, budget_usd, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (tenant_id, name)
       DO UPDATE SET budget_usd = $3, updated_at = NOW()
       RETURNING id, name, budget_usd`,
      [access.tenantId, body.department, body.budget_usd],
    );
    const row = res.rows[0];
    if (!row) return NextResponse.json({ error: 'Upsert failed' }, { status: 500 });
    return NextResponse.json({
      department: {
        id: row.id as string,
        name: row.name as string,
        budgetUsd: parseFloat(row.budget_usd ?? '0'),
      },
    });
  } catch (error) {
    console.error('[enterprise/budgets]', error);
    return NextResponse.json({ error: 'Budget update failed' }, { status: 500 });
  }
}
