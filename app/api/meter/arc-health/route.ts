import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import {
  ARC_TESTNET_RPC,
  ARC_TESTNET_RPC_FALLBACKS,
  ARC_TESTNET_CHAIN_ID,
  USDC_ARC_TESTNET,
} from '@/lib/chains/arc';

export const dynamic = 'force-dynamic';

const ERC20_ABI = ['function balanceOf(address owner) view returns (uint256)'];

// GET /api/meter/arc-health
// Diagnostic endpoint — checks ARC_PRIVATE_KEY, signer address, USDC balance, RPC connectivity.
export async function GET() {
  const privateKey = process.env.ARC_PRIVATE_KEY;
  const rpcUrl = process.env.ARC_RPC_URL ?? ARC_TESTNET_RPC;

  const report: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    arcPrivateKeySet: Boolean(privateKey),
    rpcUrl,
    chainId: ARC_TESTNET_CHAIN_ID,
    usdcAddress: USDC_ARC_TESTNET,
  };

  if (!privateKey) {
    report.status = 'no_key';
    report.message = 'ARC_PRIVATE_KEY is not set. Set it in Vercel env vars to enable live settlement.';
    return NextResponse.json(report);
  }

  // Derive signer address
  let signerAddress: string;
  try {
    const wallet = new ethers.Wallet(privateKey);
    signerAddress = wallet.address;
    report.signerAddress = signerAddress;
    report.arcscanUrl = `https://testnet.arcscan.app/address/${signerAddress}`;
  } catch (err) {
    report.status = 'invalid_key';
    report.message = `ARC_PRIVATE_KEY is set but invalid: ${err instanceof Error ? err.message : String(err)}`;
    return NextResponse.json(report);
  }

  // Test RPC connectivity and get USDC balance
  const rpcs = [rpcUrl, ...ARC_TESTNET_RPC_FALLBACKS];
  const rpcResults: Record<string, unknown>[] = [];

  for (const rpc of rpcs) {
    const result: Record<string, unknown> = { rpc };
    try {
      const provider = new ethers.JsonRpcProvider(rpc, ARC_TESTNET_CHAIN_ID);

      // Network check
      const network = await provider.getNetwork();
      result.networkChainId = network.chainId.toString();
      result.chainIdMatch = network.chainId === BigInt(ARC_TESTNET_CHAIN_ID);

      // Block number
      result.blockNumber = await provider.getBlockNumber();

      // USDC balance
      const usdc = new ethers.Contract(USDC_ARC_TESTNET, ERC20_ABI, provider);
      const balance = await usdc.getFunction('balanceOf')(signerAddress) as bigint;
      result.usdcBalanceRaw = balance.toString();
      result.usdcBalanceFormatted = `${(Number(balance) / 1_000_000).toFixed(6)} USDC`;
      result.hasFunds = balance > 0n;
      result.status = 'ok';

      rpcResults.push(result);
      break; // First working RPC is enough
    } catch (err) {
      result.status = 'error';
      result.error = err instanceof Error ? err.message : String(err);
      rpcResults.push(result);
    }
  }

  report.rpcResults = rpcResults;

  const workingRpc = rpcResults.find((r) => r.status === 'ok');
  if (!workingRpc) {
    report.status = 'rpc_unreachable';
    report.message = 'All Arc testnet RPC endpoints failed. Check network connectivity from Vercel.';
  } else if (!workingRpc.hasFunds) {
    report.status = 'no_funds';
    report.message = `Signer wallet (${signerAddress}) has zero USDC balance on Arc testnet. Get testnet USDC from https://faucet.circle.com`;
  } else {
    report.status = 'ready';
    report.message = `Arc settler is ready. Signer: ${signerAddress}, Balance: ${workingRpc.usdcBalanceFormatted}`;
  }

  return NextResponse.json(report, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
