import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireTenantAccess } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const access = await requireTenantAccess(req);
  if (access.error) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const tenantId = access.tenantId;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  try {
    // Check if any real data exists this month
    const countRes = await db.query(
      `SELECT COUNT(*) AS n FROM traffic_events
       WHERE tenant_id = $1 AND created_at >= $2
         AND event_type = 'chat_completion' AND status_code = 200`,
      [tenantId, monthStart],
    );
    const totalRows = parseInt(countRes.rows[0]?.n ?? '0');

    if (totalRows === 0) {
      return NextResponse.json({ hasRealData: false });
    }

    // ── Department aggregation ────────────────────────────────────────────────
    const deptRes = await db.query(
      `SELECT
         COALESCE(department, 'Unattributed')  AS department,
         COUNT(*)::int                          AS requests,
         COUNT(DISTINCT request_id)::int        AS sessions,
         COUNT(DISTINCT employee_id)::int       AS employees,
         COALESCE(SUM(cost_usd), 0)::float      AS spent_usd,
         COALESCE(SUM(tokens_in + tokens_out), 0)::bigint AS tokens,
         (SELECT model FROM traffic_events t2
          WHERE t2.tenant_id = t1.tenant_id
            AND COALESCE(t2.department, 'Unattributed') = COALESCE(t1.department, 'Unattributed')
            AND t2.created_at >= $2 AND t2.status_code = 200
          GROUP BY model ORDER BY COUNT(*) DESC LIMIT 1) AS top_model
       FROM traffic_events t1
       WHERE tenant_id = $1 AND created_at >= $2
         AND event_type = 'chat_completion' AND status_code = 200
       GROUP BY department
       ORDER BY spent_usd DESC`,
      [tenantId, monthStart],
    );

    // Fetch dept budgets (table may not exist if migration not yet applied)
    const budgetMap: Record<string, number> = {};
    try {
      const budgetRes = await db.query(
        `SELECT name, budget_usd FROM enterprise_departments WHERE tenant_id = $1`,
        [tenantId],
      );
      for (const row of budgetRes.rows) {
        budgetMap[row.name as string] = parseFloat(row.budget_usd ?? '0');
      }
    } catch {
      // migration pending — budgets default to 0
    }

    const departments = deptRes.rows.map((r) => ({
      name: r.department as string,
      budgetUsd: budgetMap[r.department as string] ?? 0,
      spentUsd: parseFloat(r.spent_usd),
      sessions: r.sessions as number,
      requests: r.requests as number,
      topModel: (r.top_model as string | null) ?? 'unknown',
      employeeCount: r.employees as number,
    }));

    // ── Employee aggregation ──────────────────────────────────────────────────
    const empRes = await db.query(
      `SELECT
         COALESCE(employee_id, 'unknown')      AS employee_id,
         COALESCE(department, 'Unattributed')  AS department,
         COALESCE(project_name, 'General')     AS project_name,
         COUNT(*)::int                         AS requests,
         COUNT(DISTINCT request_id)::int       AS sessions,
         COALESCE(SUM(cost_usd), 0)::float     AS spent_usd,
         COALESCE(SUM(tokens_in + tokens_out), 0)::bigint AS tokens
       FROM traffic_events
       WHERE tenant_id = $1 AND created_at >= $2
         AND event_type = 'chat_completion' AND status_code = 200
         AND employee_id IS NOT NULL
       GROUP BY employee_id, department, project_name
       ORDER BY spent_usd DESC
       LIMIT 50`,
      [tenantId, monthStart],
    );

    const employees = empRes.rows.map((r) => ({
      employeeId: r.employee_id as string,
      department: r.department as string,
      projectName: r.project_name as string,
      spentUsd: parseFloat(r.spent_usd),
      tokens: Number(r.tokens),
      sessions: r.sessions as number,
    }));

    // ── Project aggregation ───────────────────────────────────────────────────
    const projRes = await db.query(
      `SELECT
         COALESCE(project_name, 'General')    AS project_name,
         COALESCE(department, 'Unattributed') AS department,
         COUNT(*)::int                        AS requests,
         COUNT(DISTINCT request_id)::int      AS sessions,
         COALESCE(SUM(cost_usd), 0)::float    AS spent_usd
       FROM traffic_events
       WHERE tenant_id = $1 AND created_at >= $2
         AND event_type = 'chat_completion' AND status_code = 200
         AND project_name IS NOT NULL
       GROUP BY project_name, department
       ORDER BY spent_usd DESC
       LIMIT 20`,
      [tenantId, monthStart],
    );

    const projects = projRes.rows.map((r) => ({
      name: r.project_name as string,
      department: r.department as string,
      spentUsd: parseFloat(r.spent_usd),
      sessions: r.sessions as number,
    }));

    // ── Model mix ─────────────────────────────────────────────────────────────
    const modelRes = await db.query(
      `SELECT
         COALESCE(model, 'unknown') AS model,
         COUNT(*)::int              AS requests,
         COALESCE(SUM(cost_usd), 0)::float AS spent_usd
       FROM traffic_events
       WHERE tenant_id = $1 AND created_at >= $2
         AND event_type = 'chat_completion' AND status_code = 200
       GROUP BY model
       ORDER BY spent_usd DESC
       LIMIT 10`,
      [tenantId, monthStart],
    );

    const totalSpent = modelRes.rows.reduce((s, r) => s + parseFloat(r.spent_usd ?? '0'), 0);
    const modelMix = modelRes.rows.map((r) => ({
      model: r.model as string,
      spentUsd: parseFloat(r.spent_usd),
      requests: r.requests as number,
      pct: totalSpent > 0 ? Math.round((parseFloat(r.spent_usd) / totalSpent) * 100) : 0,
    }));

    // ── Recent sessions ───────────────────────────────────────────────────────
    const recentRes = await db.query(
      `SELECT
         COALESCE(employee_id, 'unknown')     AS employee_id,
         COALESCE(department, 'Unattributed') AS department,
         COALESCE(project_name, 'General')    AS project_name,
         COALESCE(model, 'unknown')           AS model,
         COALESCE(tokens_in + tokens_out, 0)::int AS tokens,
         COALESCE(cost_usd, 0)::float         AS cost_usd,
         created_at
       FROM traffic_events
       WHERE tenant_id = $1 AND created_at >= $2
         AND event_type = 'chat_completion' AND status_code = 200
       ORDER BY created_at DESC
       LIMIT 20`,
      [tenantId, monthStart],
    );

    const recentSessions = recentRes.rows.map((r) => ({
      employeeId: r.employee_id as string,
      department: r.department as string,
      projectName: r.project_name as string,
      model: r.model as string,
      tokens: r.tokens as number,
      costUsd: parseFloat(r.cost_usd),
      createdAt: (r.created_at as Date).toISOString(),
    }));

    const orgSpent = departments.reduce((s, d) => s + d.spentUsd, 0);
    const orgSessions = departments.reduce((s, d) => s + d.sessions, 0);
    const orgRequests = departments.reduce((s, d) => s + d.requests, 0);

    return NextResponse.json({
      hasRealData: true,
      period: {
        start: monthStart.toISOString(),
        end: now.toISOString(),
        days: dayOfMonth,
      },
      org: {
        totalSpentUsd: orgSpent,
        totalSessions: orgSessions,
        totalRequests: orgRequests,
        dayOfMonth,
        daysInMonth,
      },
      departments,
      employees,
      projects,
      modelMix,
      recentSessions,
    });
  } catch (error) {
    console.error('[enterprise/analytics]', error);
    return NextResponse.json({ error: 'Analytics query failed' }, { status: 500 });
  }
}
