
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { pushNotificationService } from '@/lib/push-service';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const history = req.nextUrl.searchParams.get('history') === 'true';

    try {
        // 1. Get Task
        const res = await query('SELECT * FROM a2a_tasks WHERE id = $1', [id]);
        if (res.rowCount === 0) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        const task = res.rows[0];

        // 2. Get History if requested
        let states = [];
        if (history) {
            const hRes = await query('SELECT * FROM a2a_task_states WHERE task_id = $1 ORDER BY timestamp ASC', [id]);
            states = hRes.rows;
        }

        return NextResponse.json({
            task,
            history: states
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    try {
        // 1. Get Task info first for notification
        const taskInfo = await query('SELECT tenant_id, context_id FROM a2a_tasks WHERE id = $1', [id]);

        // 2. Cancel task
        await query("UPDATE a2a_tasks SET state = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING id", [id]);

        // 3. Also record state transition
        await query("INSERT INTO a2a_task_states (task_id, state, reason) VALUES ($1, 'cancelled', 'User requested cancellation')", [id]);

        // 4. Notify via Push
        if (taskInfo.rowCount && taskInfo.rowCount > 0) {
            const { tenant_id, context_id } = taskInfo.rows[0];
            pushNotificationService.notifyTaskStateChange({
                task_id: id,
                context_id,
                tenant_id,
                state: 'cancelled'
            }).catch((err: any) => console.error('Push Notification Error:', err));
        }

        return NextResponse.json({ success: true, id });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
