/**
 * CDP Client Singleton
 * ====================
 * Single CdpClient instance for the server process.
 * Lazy-initialised on first use so the module is safe to import in
 * environments where CDP credentials are not set (local dev, test).
 *
 * The CdpClient import is dynamic (not static) to prevent Next.js from
 * bundling @coinbase/cdp-sdk during build-time page-data collection.
 * The SDK transitively imports @solana/kit (ESM-only) which breaks the
 * standalone build when loaded at module parse time.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _cdpClient: any | null = null;

export async function getCdpClientAsync() {
    if (_cdpClient) return _cdpClient;

    const apiKeyId = process.env.CDP_API_KEY_ID;
    const apiKeySecret = process.env.CDP_API_KEY_SECRET;
    const walletSecret = process.env.CDP_WALLET_SECRET;

    if (!apiKeyId || !apiKeySecret || !walletSecret) {
        throw new Error(
            'CDP credentials not configured. ' +
            'Set CDP_API_KEY_ID, CDP_API_KEY_SECRET, and CDP_WALLET_SECRET, ' +
            'or set CDP_SERVER_WALLET_ENABLED=false to use legacy private-key mode.'
        );
    }

    const { CdpClient } = await import('@coinbase/cdp-sdk');
    _cdpClient = new CdpClient({ apiKeyId, apiKeySecret, walletSecret });
    return _cdpClient;
}

/**
 * Sync accessor — returns already-initialised client or throws.
 * Call getCdpClientAsync() first to initialise.
 */
export function getCdpClient() {
    if (!_cdpClient) {
        throw new Error(
            'CDP client not initialised. Call getCdpClientAsync() before getCdpClient().'
        );
    }
    return _cdpClient;
}

/**
 * Whether CDP Server Wallet is active for this deployment.
 * When false, code falls back to the legacy P402_FACILITATOR_PRIVATE_KEY path.
 */
export function isCdpEnabled(): boolean {
    return (
        process.env.CDP_SERVER_WALLET_ENABLED === 'true' &&
        Boolean(process.env.CDP_API_KEY_ID) &&
        Boolean(process.env.CDP_API_KEY_SECRET) &&
        Boolean(process.env.CDP_WALLET_SECRET)
    );
}

/** Reset the singleton — for use in tests only. */
export function _resetCdpClient(): void {
    _cdpClient = null;
}
