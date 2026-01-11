const GA4_MEASUREMENT_ID = process.env.GA4_MEASUREMENT_ID;
const GA4_API_SECRET = process.env.GA4_API_SECRET;

export interface GA4Event {
    name: string;
    params: Record<string, any>;
}

/**
 * Sends events to Google Analytics 4 via the Measurement Protocol.
 * @param events Array of GA4 events to send.
 * @param clientId Unique identifier for the client (e.g., tenant_id or user_id).
 */
export async function trackGA4Events(events: GA4Event[], clientId: string = 'internal_server') {
    if (!GA4_MEASUREMENT_ID || !GA4_API_SECRET) {
        console.warn("GA4_MEASUREMENT_ID or GA4_API_SECRET not set. Skipping analytics.");
        return;
    }

    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${GA4_API_SECRET}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({
                client_id: clientId,
                events: events.map(event => ({
                    name: event.name,
                    params: {
                        ...event.params,
                        engagement_time_msec: '100', // Optional: mimic user engagement
                    },
                })),
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`GA4 Analytics Error: ${response.status} ${errorText}`);
        }
    } catch (error) {
        console.error("Failed to send GA4 analytics:", error);
    }
}

/**
 * Convenience wrapper for P402 specific events.
 */
export const P402Analytics = {
    trackPlan: (route_id: string, facilitator_id: string, amount: string, tenant_id: string) => {
        return trackGA4Events([{
            name: 'p402_challenge_issued',
            params: { route_id, facilitator_id, amount }
        }], tenant_id);
    },

    trackPayment: (tx_hash: string, network: string, tenant_id: string) => {
        return trackGA4Events([{
            name: 'p402_payment_submitted',
            params: { tx_hash, network }
        }], tenant_id);
    },

    trackSettlement: (amount: string, asset: string, tenant_id: string) => {
        return trackGA4Events([{
            name: 'p402_purchase',
            params: { value: parseFloat(amount), currency: asset, items: [{ item_id: 'p402_service', item_name: 'P402 Routed Service' }] }
        }], tenant_id);
    },

    trackPolicyViolation: (reason_code: string, route_id: string, tenant_id: string) => {
        return trackGA4Events([{
            name: 'p402_policy_violation',
            params: { reason_code, route_id }
        }], tenant_id);
    }
};
