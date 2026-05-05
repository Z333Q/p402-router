import { NextResponse } from 'next/server';
import {
  isTempoSettlerEnabled,
  getSignerAddress,
  getUsdceBalance,
  formatUsdce,
  tempoExplorerAddressUrl,
} from '@/lib/meter/tempo-settler';
import { TEMPO_CHAIN_ID, TEMPO_RPC_URL } from '@/lib/constants/tempo';
import { createPublicClient, http } from 'viem';
import { tempo } from 'viem/chains';

export const dynamic = 'force-dynamic';

// GET /api/meter/health
// Diagnostic endpoint — checks TEMPO_TREASURY_PRIVATE_KEY, signer address,
// USDC.e balance, and Tempo RPC connectivity.
// Replaces /api/meter/arc-health.
export async function GET() {
  const report: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    tempoPrivateKeySet: isTempoSettlerEnabled(),
    rpcUrl: TEMPO_RPC_URL,
    chainId: TEMPO_CHAIN_ID,
  };

  if (!isTempoSettlerEnabled()) {
    report.status = 'no_key';
    report.message = 'TEMPO_TREASURY_PRIVATE_KEY is not set. Set it to enable live Tempo settlement.';
    return NextResponse.json(report);
  }

  let signerAddress: string;
  try {
    signerAddress = getSignerAddress();
    report.signerAddress = signerAddress;
    report.explorerUrl = tempoExplorerAddressUrl(signerAddress);
  } catch (err) {
    report.status = 'invalid_key';
    report.message = `TEMPO_TREASURY_PRIVATE_KEY is set but invalid: ${err instanceof Error ? err.message : String(err)}`;
    return NextResponse.json(report);
  }

  // Test RPC connectivity and USDC.e balance
  try {
    const client = createPublicClient({
      chain: { ...tempo, id: TEMPO_CHAIN_ID },
      transport: http(TEMPO_RPC_URL),
    });

    const blockNumber = await client.getBlockNumber();
    report.blockNumber = Number(blockNumber);
    report.rpcStatus = 'ok';

    const raw = await getUsdceBalance(signerAddress);
    report.usdcBalanceRaw = raw.toString();
    report.usdcBalance = formatUsdce(raw);
    report.hasFunds = raw > 0n;

    if (!report.hasFunds) {
      report.status = 'no_funds';
      report.message = `Signer (${signerAddress}) has zero USDC.e balance on Tempo mainnet. Fund via explore.tempo.xyz.`;
    } else {
      report.status = 'ready';
      report.message = `Tempo settler ready. Signer: ${signerAddress}, Balance: ${report.usdcBalance}`;
    }
  } catch (err) {
    report.rpcStatus = 'error';
    report.rpcError = err instanceof Error ? err.message : String(err);
    report.status = 'rpc_unreachable';
    report.message = `Tempo RPC (${TEMPO_RPC_URL}) unreachable: ${report.rpcError}`;
  }

  return NextResponse.json(report, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
