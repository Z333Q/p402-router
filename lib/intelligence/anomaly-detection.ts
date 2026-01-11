import pool from '@/lib/db'

export interface AnomalyAlert {
    type: 'COST_SPIKE' | 'VELOCITY_ALERT';
    tenantId: string;
    message: string;
    severity: 'high' | 'medium';
    details: any;
}

export class AnomalyDetection {
    /**
     * Checks for spend anomalies for a specific tenant.
     * Compares last hour's spend with the average hourly spend over the last 24 hours.
     */
    static async checkSpendAnomaly(tenantId: string): Promise<AnomalyAlert | null> {
        try {
            // 1. Get average hourly spend over last 24h
            const avgRes = await pool.query(`
                SELECT AVG(hourly_sum) as avg_hourly_spend
                FROM (
                    SELECT date_trunc('hour', timestamp) as hr, SUM(cost_usd) as hourly_sum
                    FROM router_decisions
                    WHERE tenant_id = $1 
                      AND timestamp > NOW() - INTERVAL '24 hours'
                    GROUP BY hr
                ) as hourly_stats
            `, [tenantId]);

            const averageHourly = parseFloat(avgRes.rows[0]?.avg_hourly_spend || '0');

            // 2. Get last hour's spend
            const lastHourRes = await pool.query(`
                SELECT SUM(cost_usd) as last_hour_spend
                FROM router_decisions
                WHERE tenant_id = $1
                  AND timestamp > NOW() - INTERVAL '1 hour'
            `, [tenantId]);

            const lastHourSpend = parseFloat(lastHourRes.rows[0]?.last_hour_spend || '0');

            // 3. Threshold check: if > 3x average and > $1 (to avoid small noise)
            if (averageHourly > 0 && lastHourSpend > (averageHourly * 3) && lastHourSpend > 1.00) {
                return {
                    type: 'COST_SPIKE',
                    tenantId,
                    message: `Significant cost spike detected: $${lastHourSpend.toFixed(2)} in the last hour compared to $${averageHourly.toFixed(2)} avg.`,
                    severity: 'high',
                    details: {
                        lastHourSpend,
                        averageHourly,
                        ratio: lastHourSpend / averageHourly
                    }
                };
            }

            return null;
        } catch (e) {
            console.error('[AnomalyDetection] Check failed:', e);
            return null;
        }
    }

    /**
     * Get all currently active anomalies for a specific tenant
     */
    static async getAnomaliesForTenant(tenantId: string): Promise<AnomalyAlert[]> {
        const alert = await this.checkSpendAnomaly(tenantId);
        return alert ? [alert] : [];
    }

    /**
     * Get all currently active anomalies (simplified for MVP)
     */
    static async getGlobalAnomalies(): Promise<AnomalyAlert[]> {
        const demoTenantId = '00000000-0000-0000-0000-000000000001';
        return this.getAnomaliesForTenant(demoTenantId);
    }
}
