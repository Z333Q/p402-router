import { createPublicClient, http, encodeFunctionData, parseUnits, Hash } from 'viem';

export type Network = 'eip155:8453' | 'eip155:84532' | 'eip155:1';

// --- Error Handling ---
export class P402Error extends Error {
    constructor(
        public code: 'INVALID_INPUT' | 'POLICY_DENIED' | 'TRANSACTION_FAILED' | 'SETTLEMENT_FAILED' | 'NETWORK_ERROR',
        message: string,
        public details?: any
    ) {
        super(message);
        this.name = 'P402Error';
    }
}

// --- Configuration ---
export interface P402Config {
    routerUrl?: string; // Default: https://p402.io
    debug?: boolean;    // Default: false
}

// --- Token Types ---
export interface TokenConfig {
    address: string;
    decimals: number;
    symbol: string;
    eip712?: {
        name: string;
        version: string;
    };
}

export const PRESET_TOKENS: Record<string, Record<Network, TokenConfig>> = {
    USDC: {
        'eip155:8453': {
            address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            decimals: 6,
            symbol: 'USDC',
            eip712: { name: 'USD Coin', version: '2' }
        },
        'eip155:84532': {
            address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
            decimals: 6,
            symbol: 'USDC',
            eip712: { name: 'USD Coin', version: '2' }
        },
        'eip155:1': {
            address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            decimals: 6,
            symbol: 'USDC',
            eip712: { name: 'USD Coin', version: '2' }
        }
    }
};

export interface PaymentRequest {
    amount: string;
    token?: TokenConfig;
    network?: Network;
}

export interface PaymentResult {
    success: boolean;
    txHash?: string;
    receipt?: any;
    error?: P402Error;
}

const ERC20_ABI = [
    {
        name: 'transfer',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
        outputs: [{ type: 'bool' }]
    }
] as const;

export class P402Client {
    private routerUrl: string;
    private debug: boolean;

    constructor(config: P402Config = {}) {
        this.routerUrl = (config.routerUrl || 'https://p402.io').replace(/\/$/, '');
        this.debug = config.debug || false;
    }

    private log(msg: string, data?: any) {
        if (this.debug) {
            console.log(`[P402 SDK] ${msg}`, data || '');
        }
    }

    /**
     * Complete checkout flow: Plan -> Pay (Externally) -> Settle
     */
    async checkout(
        request: PaymentRequest,
        signerCallback: (to: string, data: string, value: bigint) => Promise<string>
    ): Promise<PaymentResult> {
        try {
            this.log('Starting checkout', request);

            const network = request.network || 'eip155:8453';
            if (Number(request.amount) <= 0) {
                throw new P402Error('INVALID_INPUT', 'Amount must be greater than 0');
            }

            // Get token config
            const usdc = PRESET_TOKENS.USDC;
            const token = request.token || (usdc ? usdc[network] : undefined);

            if (!token || !token.eip712) {
                throw new P402Error('INVALID_INPUT', 'Token configuration missing or invalid (EIP-712 required)');
            }

            // 1. PLAN
            this.log('Requesting Router Plan...');
            const planRes = await fetch(`${this.routerUrl}/api/v1/router/plan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    payment: {
                        amount: request.amount,
                        asset: token.symbol,
                        network: network
                    }
                })
            });

            if (!planRes.ok) throw new P402Error('NETWORK_ERROR', `Router plan failed: ${planRes.statusText}`);
            const plan = await planRes.json();

            if (!plan.allow) {
                throw new P402Error('POLICY_DENIED', 'Router policy denied the transaction', plan.policy?.reasons);
            }

            const candidate = plan.candidates?.[0];
            const treasury = candidate?.payment?.treasuryAddress;
            if (!treasury) {
                throw new P402Error('NETWORK_ERROR', 'No valid facilitator or treasury address found');
            }

            // 2. CONSTRUCT & SIGN
            this.log(`Facilitator Selected: ${candidate.name}, Treasury: ${treasury}`);
            const weiAmount = parseUnits(request.amount, token.decimals);

            const data = encodeFunctionData({
                abi: ERC20_ABI,
                functionName: 'transfer',
                args: [treasury as `0x${string}`, weiAmount]
            });

            // 3. EXECUTE
            this.log('Requesting signature...');
            const txHash = await signerCallback(token.address, data, BigInt(0));
            this.log('Transaction sent', txHash);

            // 4. SETTLE
            this.log('Verifying settlement...');
            const settleRes = await fetch(`${this.routerUrl}/api/v1/router/settle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    txHash,
                    amount: request.amount,
                    asset: token.symbol
                })
            });

            const settleData = await settleRes.json();
            if (!settleData.settled) {
                throw new P402Error('SETTLEMENT_FAILED', settleData.message || 'Verification failed');
            }

            this.log('Checkout complete!');
            return { success: true, txHash, receipt: settleData.receipt };

        } catch (e: any) {
            this.log('Checkout failed', e);
            const error = e instanceof P402Error ? e : new P402Error('TRANSACTION_FAILED', e.message);
            return { success: false, error };
        }
    }
}
