import pool from '@/lib/db'
import { BazaarResource } from './types'

export interface ScanResult {
    safe: boolean;
    riskScore: number; // 0-10
    flags: string[];
    recommendation: 'approve' | 'quarantine' | 'reject';
}

interface FacilitatorIdentity {
    erc8004_verified: boolean;
    erc8004_reputation_cached: number | null;
}

export class SafetyScanner {
    /**
     * Evaluate a bazaar resource before it enters the registry.
     * Checks are ordered by cost (cheap first, expensive last).
     * On any scanner error, returns approve-by-default to avoid blocking sync.
     */
    static async scan(resource: Partial<BazaarResource>, facilitatorId: string): Promise<ScanResult> {
        try {
            return await this.performScan(resource, facilitatorId);
        } catch (err) {
            console.error('[SafetyScanner] Scan failed, approving by default:', err);
            return { safe: true, riskScore: 0, flags: ['scanner_error'], recommendation: 'approve' };
        }
    }

    private static async performScan(
        resource: Partial<BazaarResource>,
        facilitatorId: string
    ): Promise<ScanResult> {
        const flags: string[] = [];
        let riskScore = 0;

        // 1. Publisher Identity — Is the source facilitator ERC-8004 verified?
        const identity = await this.checkPublisherIdentity(facilitatorId);

        if (!identity.erc8004_verified) {
            flags.push('no_identity');
            riskScore += 3;

            if (process.env.SAFETY_REQUIRE_IDENTITY === 'true') {
                return {
                    safe: false,
                    riskScore: Math.min(riskScore, 10),
                    flags,
                    recommendation: 'quarantine',
                };
            }
        }

        // 2. Reputation Threshold
        const minReputation = parseInt(process.env.SAFETY_MIN_REPUTATION || '30', 10);
        if (identity.erc8004_reputation_cached !== null && identity.erc8004_reputation_cached < minReputation) {
            flags.push('low_reputation');
            riskScore += 2;
        }

        // 3. Pricing Sanity
        const pricingAmount = this.extractPricingAmount(resource.pricing);
        if (pricingAmount !== null) {
            if (pricingAmount < 0.001) {
                flags.push('suspicious_pricing_low');
                riskScore += 2;
            }
            if (pricingAmount > 100) {
                flags.push('suspicious_pricing_high');
                riskScore += 2;
            }
        }

        // 4. Duplicate Detection
        if (resource.canonicalRouteId) {
            const dupCheck = await pool.query(
                `SELECT source_facilitator_id FROM bazaar_resources
                 WHERE canonical_route_id = $1 AND source_facilitator_id != $2
                 LIMIT 1`,
                [resource.canonicalRouteId, facilitatorId]
            );
            if (dupCheck.rows.length > 0) {
                flags.push('duplicate_route');
                riskScore += 1;
            }
        }

        // 5. AI Risk Scan (optional, behind feature flag)
        if (process.env.SAFETY_AI_SCAN === 'true') {
            const aiFlags = await this.aiRiskScan(resource);
            flags.push(...aiFlags);
            riskScore += aiFlags.length;
        }

        riskScore = Math.min(riskScore, 10);

        // Determine recommendation
        let recommendation: ScanResult['recommendation'] = 'approve';
        if (riskScore >= 7) {
            recommendation = 'reject';
        } else if (riskScore >= 4) {
            recommendation = 'quarantine';
        }

        return {
            safe: recommendation === 'approve',
            riskScore,
            flags,
            recommendation,
        };
    }

    private static async checkPublisherIdentity(facilitatorId: string): Promise<FacilitatorIdentity> {
        try {
            const res = await pool.query(
                `SELECT erc8004_verified, erc8004_reputation_cached
                 FROM facilitators WHERE facilitator_id = $1`,
                [facilitatorId]
            );
            if (res.rows.length === 0) {
                return { erc8004_verified: false, erc8004_reputation_cached: null };
            }
            return {
                erc8004_verified: res.rows[0].erc8004_verified ?? false,
                erc8004_reputation_cached: res.rows[0].erc8004_reputation_cached ?? null,
            };
        } catch {
            return { erc8004_verified: false, erc8004_reputation_cached: null };
        }
    }

    private static extractPricingAmount(pricing: any): number | null {
        if (!pricing) return null;
        if (typeof pricing === 'object' && pricing.amount) {
            const n = parseFloat(pricing.amount);
            return isNaN(n) ? null : n;
        }
        return null;
    }

    private static async aiRiskScan(resource: Partial<BazaarResource>): Promise<string[]> {
        const flags: string[] = [];
        try {
            const apiKey = process.env.GOOGLE_API_KEY;
            if (!apiKey) return flags;

            const { GoogleGenerativeAI } = await import('@google/generative-ai');
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

            const prompt = `You are a security scanner for an AI service marketplace. Analyze this resource listing for risks.
Return ONLY a JSON array of risk flag strings (e.g. ["prompt_injection_risk", "misleading_description"]).
Return [] if no risks found. No explanation, just the JSON array.

Resource:
- Title: ${resource.title || 'unknown'}
- Route: ${resource.routePath || 'unknown'}
- Description: ${resource.description || 'none'}
- Pricing: ${JSON.stringify(resource.pricing || {})}`;

            const result = await model.generateContent(prompt);
            const text = result.response.text().trim();

            // Parse the JSON array from response
            const match = text.match(/\[.*\]/s);
            if (match) {
                const parsed = JSON.parse(match[0]);
                if (Array.isArray(parsed)) {
                    flags.push(...parsed.map((f: any) => `ai_${String(f)}`));
                }
            }
        } catch (err) {
            console.error('[SafetyScanner] AI scan failed (non-blocking):', err);
        }
        return flags;
    }
}

/**
 * Insert a resource into the quarantine table.
 */
export async function quarantineResource(
    resource: Partial<BazaarResource>,
    facilitatorId: string,
    scanResult: ScanResult
): Promise<void> {
    await pool.query(
        `INSERT INTO bazaar_quarantine (
            resource_id, source_facilitator_id, canonical_route_id,
            resource_data, scan_result, status
        ) VALUES ($1, $2, $3, $4, $5, 'quarantined')`,
        [
            resource.resourceId || crypto.randomUUID(),
            facilitatorId,
            resource.canonicalRouteId || 'unknown',
            JSON.stringify(resource),
            JSON.stringify(scanResult),
        ]
    );
}
