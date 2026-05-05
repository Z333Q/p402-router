import { NextResponse } from 'next/server';
import {
  isTempoSettlerEnabled,
  getSignerAddress,
  getUsdceBalance,
  formatUsdce,
  tempoExplorerAddressUrl,
} from '@/lib/meter/tempo-settler';
import { TEMPO_CHAIN_ID } from '@/lib/constants/tempo';

export const dynamic = 'force-dynamic';

// GET /api/meter/wallet
// Returns the Tempo settler wallet status: signer address, USDC.e balance, readiness.
// Replaces /api/meter/fund. No Circle DCW creation — settler wallet is pre-funded externally.
// Returns ready: false when TEMPO_TREASURY_PRIVATE_KEY is unset, triggering Proof Replay mode in the UI.
export async function GET() {
  const enabled = isTempoSettlerEnabled();

  if (!enabled) {
    return NextResponse.json({
      ready: false,
      chainId: TEMPO_CHAIN_ID,
      currency: 'USDC.e',
      message: 'TEMPO_TREASURY_PRIVATE_KEY is not set. Proof Replay mode will be used.',
    });
  }

  let signerAddress: string;
  try {
    signerAddress = getSignerAddress();
  } catch (err) {
    return NextResponse.json(
      { ready: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  let usdcBalance = '0 USDC.e';
  let usdcBalanceRaw = '0';
  let hasFunds = false;

  try {
    const raw = await getUsdceBalance(signerAddress);
    usdcBalance = formatUsdce(raw);
    usdcBalanceRaw = raw.toString();
    hasFunds = raw > 0n;
  } catch (err) {
    return NextResponse.json(
      {
        ready: false,
        signerAddress,
        chainId: TEMPO_CHAIN_ID,
        currency: 'USDC.e',
        error: `Balance check failed: ${err instanceof Error ? err.message : String(err)}`,
        explorerUrl: tempoExplorerAddressUrl(signerAddress),
      },
      { status: 200 }
    );
  }

  return NextResponse.json({
    ready: hasFunds,
    signerAddress,
    usdcBalance,
    usdcBalanceRaw,
    chainId: TEMPO_CHAIN_ID,
    currency: 'USDC.e',
    explorerUrl: tempoExplorerAddressUrl(signerAddress),
    message: hasFunds
      ? `Tempo settler ready. Address: ${signerAddress}, Balance: ${usdcBalance}`
      : `Settler wallet has zero USDC.e balance. Fund ${signerAddress} on Tempo mainnet (chain ${TEMPO_CHAIN_ID}).`,
  });
}
