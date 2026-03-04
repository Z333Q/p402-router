/**
 * Facilitator Wallet
 * ==================
 * Abstracts the signing account used for on-chain EIP-3009 settlements.
 *
 * Mode A — CDP Server Wallet (recommended, default when CDP_SERVER_WALLET_ENABLED=true):
 *   Keys live in Coinbase CDP's AWS Nitro Enclave (TEE). Never exposed to the runtime.
 *   Wallet name is idempotent — the same account is reused across deployments.
 *
 * Mode B — Legacy private key (CDP_SERVER_WALLET_ENABLED != 'true'):
 *   Reads P402_FACILITATOR_PRIVATE_KEY from env. Maintained for backwards compat
 *   and local dev. Migrate to Mode A before exposing to production traffic.
 *
 * The public interface (FacilitatorWallet class + getFacilitatorWallet) is identical
 * in both modes so all call sites are unaffected.
 */

import {
    createWalletClient,
    createPublicClient,
    http,
    type Account,
    type Hash,
    type WalletClient,
    type PublicClient,
} from 'viem';
import { privateKeyToAccount, toAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import { type EIP3009Authorization } from './eip3009';
import { ApiError } from '@/lib/errors';
import { getCdpClientAsync, isCdpEnabled } from '@/lib/cdp-client';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? 'https://mainnet.base.org';
const MAX_GAS_PRICE_GWEI = BigInt(process.env.P402_MAX_GAS_PRICE_GWEI ?? '50');

const TRANSFER_WITH_AUTHORIZATION_ABI = {
    name: 'transferWithAuthorization',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
        { name: 'from',        type: 'address' },
        { name: 'to',          type: 'address' },
        { name: 'value',       type: 'uint256' },
        { name: 'validAfter',  type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce',       type: 'bytes32' },
        { name: 'v',           type: 'uint8'   },
        { name: 'r',           type: 'bytes32' },
        { name: 's',           type: 'bytes32' },
    ],
    outputs: [],
} as const;

// ---------------------------------------------------------------------------
// Internal: build the signing account for whichever mode is active
// ---------------------------------------------------------------------------

async function buildFacilitatorAccount(): Promise<Account> {
    if (isCdpEnabled()) {
        const cdp = await getCdpClientAsync();
        const walletName =
            process.env.CDP_FACILITATOR_WALLET_NAME ?? 'p402-facilitator';

        // getOrCreateAccount is idempotent — safe to call on every cold start
        const cdpAccount = await cdp.evm.getOrCreateAccount({ name: walletName });

        // toAccount wraps the CDP account behind a standard viem Account interface.
        // Signing happens in CDP's TEE; the private key is never in this process.
        return toAccount(cdpAccount as Parameters<typeof toAccount>[0]);
    }

    // Legacy path — raw private key in env var
    const privateKey = process.env.P402_FACILITATOR_PRIVATE_KEY;
    const signerAddress = process.env.P402_SIGNER_ADDRESS;

    if (!privateKey) {
        throw new Error(
            'Facilitator wallet not configured. ' +
            'Set CDP_SERVER_WALLET_ENABLED=true + CDP credentials (recommended), ' +
            'or set P402_FACILITATOR_PRIVATE_KEY for legacy mode.'
        );
    }

    const account = privateKeyToAccount(privateKey as `0x${string}`);

    if (
        signerAddress &&
        account.address.toLowerCase() !== signerAddress.toLowerCase()
    ) {
        throw new Error(
            `P402_SIGNER_ADDRESS mismatch. ` +
            `Derived: ${account.address}, expected: ${signerAddress}`
        );
    }

    return account;
}

// ---------------------------------------------------------------------------
// FacilitatorWallet — public class
// ---------------------------------------------------------------------------

export class FacilitatorWallet {
    private readonly _account: Account;
    private readonly _walletClient: WalletClient;
    private readonly _publicClient: PublicClient;
    private readonly _mode: 'cdp-server-wallet' | 'raw-private-key';

    private constructor(
        account: Account,
        walletClient: WalletClient,
        publicClient: PublicClient,
        mode: 'cdp-server-wallet' | 'raw-private-key',
    ) {
        this._account = account;
        this._walletClient = walletClient;
        this._publicClient = publicClient;
        this._mode = mode;
    }

    /**
     * Factory — async because CDP account creation is async.
     * Use getFacilitatorWallet() for the cached singleton.
     */
    static async create(): Promise<FacilitatorWallet> {
        const account = await buildFacilitatorAccount();
        const chain =
            process.env.NEXT_PUBLIC_CHAIN_ENV === 'testnet' ? baseSepolia : base;

        const publicClient = createPublicClient({
            chain,
            transport: http(RPC_URL),
        });

        const walletClient = createWalletClient({
            account,
            chain,
            transport: http(RPC_URL),
        });

        const mode = isCdpEnabled() ? 'cdp-server-wallet' : 'raw-private-key';
        return new FacilitatorWallet(account, walletClient as WalletClient, publicClient as PublicClient, mode);
    }

    get address(): string {
        return this._account.address;
    }

    /**
     * Executes an EIP-3009 transferWithAuthorization on the USDC contract.
     * The facilitator pays gas; the user's token transfer is gasless.
     */
    async executeSettlement(
        tokenAddress: string,
        auth: EIP3009Authorization,
        requestId: string,
    ): Promise<Hash> {
        // Gas price guard — prevents settlement during fee spikes
        const gasPrice = await this._publicClient.getGasPrice();
        const maxGasWei = MAX_GAS_PRICE_GWEI * BigInt(1e9);

        if (gasPrice > maxGasWei) {
            throw new ApiError({
                code: 'GAS_PRICE_TOO_HIGH',
                status: 503,
                message: `Gas price (${gasPrice} wei) exceeds limit (${maxGasWei} wei). Retry shortly.`,
                requestId,
            });
        }

        try {
            const { request } = await this._publicClient.simulateContract({
                account: this._account,
                address: tokenAddress as `0x${string}`,
                abi: [TRANSFER_WITH_AUTHORIZATION_ABI],
                functionName: 'transferWithAuthorization',
                args: [
                    auth.from,
                    auth.to,
                    BigInt(auth.value),
                    BigInt(auth.validAfter),
                    BigInt(auth.validBefore),
                    auth.nonce,
                    auth.v,
                    auth.r,
                    auth.s,
                ],
            });

            return await this._walletClient.writeContract(request);
        } catch (error: unknown) {
            const msg =
                error instanceof Error ? error.message : String(error);

            if (msg.includes('authorization is invalid')) {
                throw new ApiError({
                    code: 'INVALID_AUTHORIZATION',
                    status: 400,
                    message: 'The EIP-3009 authorization is invalid or has expired.',
                    requestId,
                });
            }

            if (msg.includes('authorization is used')) {
                throw new ApiError({
                    code: 'AUTHORIZATION_USED',
                    status: 409,
                    message: 'This authorization nonce has already been used on-chain.',
                    requestId,
                });
            }

            throw error;
        }
    }

    /** Health check — ETH balance must exceed 0.01 ETH to absorb gas costs. */
    async checkHealth(): Promise<{
        healthy: boolean;
        balance: string;
        address: string;
        mode: string;
    }> {
        const balance = await this._publicClient.getBalance({
            address: this._account.address as `0x${string}`,
        });
        const threshold = BigInt(1e16); // 0.01 ETH

        return {
            healthy: balance > threshold,
            balance: balance.toString(),
            address: this._account.address,
            mode: this._mode,
        };
    }
}

// ---------------------------------------------------------------------------
// Singleton — async; cached so CDP's getOrCreateAccount is called only once
// ---------------------------------------------------------------------------

let _walletPromise: Promise<FacilitatorWallet> | null = null;

export function getFacilitatorWallet(): Promise<FacilitatorWallet> {
    if (!_walletPromise) {
        _walletPromise = FacilitatorWallet.create().catch((err) => {
            // Allow retry on next call rather than caching a rejected promise
            _walletPromise = null;
            throw err;
        });
    }
    return _walletPromise;
}

/** Reset singleton — for use in tests only. */
export function _resetFacilitatorWallet(): void {
    _walletPromise = null;
}
