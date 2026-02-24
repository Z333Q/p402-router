'use client';

import { useState } from 'react';
import { useAccount, useSignTypedData } from 'wagmi';
import { initializeWalletSubscription } from '@/lib/actions/billing';
import { finalizeWalletSubscription } from '@/lib/actions/billing-finalize';
import { BASE_USDC_ADDRESS, SUBSCRIPTION_FACILITATOR_ADDRESS } from '@/lib/constants';
import { Loader2, ShieldCheck, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function WalletCheckoutPage() {
    const { address, chain } = useAccount();
    const { signTypedDataAsync } = useSignTypedData();
    const router = useRouter();

    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubscribe = async () => {
        if (!address || !chain) {
            setError('Please connect your wallet to the Base network first.');
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            // 1. Fetch Nonce & Deadlines from Server
            const initRes = await initializeWalletSubscription(address);
            if (!initRes.success || !initRes.nonce || !initRes.deadline || !initRes.allowanceAmount) {
                throw new Error(initRes.error || 'Initialization failed');
            }

            // 2. EIP-2612 Domain for Base USDC (Strictly version "2")
            const domain = {
                name: 'USD Coin',
                version: '2',
                chainId: chain.id,
                verifyingContract: BASE_USDC_ADDRESS as `0x${string}`,
            };

            const types = {
                Permit: [
                    { name: 'owner', type: 'address' },
                    { name: 'spender', type: 'address' },
                    { name: 'value', type: 'uint256' },
                    { name: 'nonce', type: 'uint256' },
                    { name: 'deadline', type: 'uint256' },
                ],
            };

            const message = {
                owner: address,
                spender: SUBSCRIPTION_FACILITATOR_ADDRESS as `0x${string}`,
                value: BigInt(initRes.allowanceAmount),
                nonce: BigInt(initRes.nonce),
                deadline: BigInt(initRes.deadline),
            };

            // 3. Request Signature via Viem v2.42+ (Requires explicit account)
            const signature = await signTypedDataAsync({
                account: address,
                domain,
                types,
                primaryType: 'Permit',
                message,
            });

            // 4. Pass signature to the Server Action for Gasless Execution
            const finalizeRes = await finalizeWalletSubscription({
                userAddress: address,
                allowanceAmount: initRes.allowanceAmount,
                deadline: initRes.deadline,
                signature,
            });

            if (!finalizeRes.success) throw new Error(finalizeRes.error);

            // 5. Success -> Redirect
            router.push('/dashboard/billing?success=true');

        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Subscription failed. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto mt-12 p-8 card bg-[var(--neutral-50)] text-black border-2 border-black">
            <div className="flex items-center gap-3 mb-6 border-b-2 border-black pb-4">
                <ShieldCheck className="w-8 h-8 text-[var(--success)]" />
                <h1 className="page-title !text-2xl">Pro Wallet Subscription</h1>
            </div>

            <p className="font-mono text-sm mb-6 text-[var(--neutral-700)]">
                Sign a gasless permit to authorize a 12-month allowance for the Pro Plan ($499/mo). You will only be charged once per month, and we pay the gas.
            </p>

            {error && (
                <div className="bg-[var(--error)] text-white p-3 font-mono text-sm mb-6 border-2 border-black">
                    {error}
                </div>
            )}

            <button
                onClick={handleSubscribe}
                disabled={isProcessing}
                className="btn bg-[var(--primary)] text-black font-black uppercase w-full flex justify-between items-center px-6 py-4 border-2 border-black hover:bg-[var(--primary-hover)] transition-colors"
            >
                <span>{isProcessing ? 'Processing on Base...' : 'Sign & Subscribe'}</span>
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
            </button>
        </div>
    );
}
