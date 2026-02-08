import { Suspense } from 'react';
import { Card, Badge, Button } from '../_components/ui';
import { getCurrentTenantId, getSettlements } from '@/lib/db/queries';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { P402_CONFIG } from '@/lib/constants';

interface TransactionRowProps {
  settlement: {
    id: string;
    scheme: 'exact' | 'onchain' | 'receipt';
    tx_hash?: string;
    payment_hash?: string;
    amount_usd: number;
    payer: string;
    verified_at: string;
    session_id: string;
  };
}

function TransactionRow({ settlement }: TransactionRowProps) {
  const getSchemeColor = (scheme: string) => {
    switch (scheme) {
      case 'exact': return 'bg-green-100 text-green-800 border-green-200';
      case 'onchain': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'receipt': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSchemeLabel = (scheme: string) => {
    switch (scheme) {
      case 'exact': return 'EIP-3009 Gasless';
      case 'onchain': return 'On-Chain Verification';
      case 'receipt': return 'Receipt Reuse';
      default: return scheme;
    }
  };

  const basescanUrl = settlement.tx_hash
    ? `https://basescan.org/tx/${settlement.tx_hash}`
    : null;

  return (
    <tr className="border-b border-neutral-200 hover:bg-neutral-50">
      <td className="px-6 py-4 text-sm font-medium text-neutral-900">
        {formatDistanceToNow(new Date(settlement.verified_at), { addSuffix: true })}
      </td>

      <td className="px-6 py-4">
        <div className="flex items-center">
          <span className="text-lg font-bold text-green-600">
            ${settlement.amount_usd.toFixed(2)}
          </span>
          <span className="ml-1 text-sm text-neutral-500">USDC</span>
        </div>
      </td>

      <td className="px-6 py-4">
        <Badge className={`text-xs font-medium ${getSchemeColor(settlement.scheme)}`}>
          {getSchemeLabel(settlement.scheme)}
        </Badge>
      </td>

      <td className="px-6 py-4 text-sm text-neutral-600 font-mono">
        {settlement.session_id}
      </td>

      <td className="px-6 py-4">
        {settlement.payer !== 'unknown' && (
          <div className="text-sm text-neutral-600 font-mono">
            {settlement.payer.slice(0, 6)}...{settlement.payer.slice(-4)}
          </div>
        )}
      </td>

      <td className="px-6 py-4">
        {basescanUrl ? (
          <Link
            href={basescanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-sm font-mono hover:underline"
          >
            {settlement.tx_hash!.slice(0, 10)}...{settlement.tx_hash!.slice(-8)}
          </Link>
        ) : (
          <span className="text-neutral-400 text-sm">
            {settlement.payment_hash ? 'Authorization' : 'Pending'}
          </span>
        )}
      </td>
    </tr>
  );
}

function TransactionsTableSkeleton() {
  return (
    <div className="animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <tr key={i} className="border-b border-neutral-200">
          <td className="px-6 py-4">
            <div className="h-4 bg-neutral-200 rounded w-24"></div>
          </td>
          <td className="px-6 py-4">
            <div className="h-4 bg-neutral-200 rounded w-16"></div>
          </td>
          <td className="px-6 py-4">
            <div className="h-6 bg-neutral-200 rounded w-20"></div>
          </td>
          <td className="px-6 py-4">
            <div className="h-4 bg-neutral-200 rounded w-32"></div>
          </td>
          <td className="px-6 py-4">
            <div className="h-4 bg-neutral-200 rounded w-20"></div>
          </td>
          <td className="px-6 py-4">
            <div className="h-4 bg-neutral-200 rounded w-28"></div>
          </td>
        </tr>
      ))}
    </div>
  );
}

async function TransactionsTable() {
  const tenantId = await getCurrentTenantId();
  const settlementsResult = await getSettlements(tenantId, 100);
  const settlements = settlementsResult.rows;

  if (settlements.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>

        <h3 className="text-lg font-bold text-neutral-900 mb-2">No Transactions Yet</h3>
        <p className="text-neutral-600 mb-6">
          Make your first payment through the P402 router to see transactions here.
        </p>

        <div className="flex gap-3 justify-center">
          <Link href="/docs/api">
            <Button variant="primary">View API Docs</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="secondary">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-white border-2 border-black">
      <table className="min-w-full divide-y divide-neutral-200">
        <thead className="bg-neutral-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Time
            </th>
            <th className="px-6 py-3 text-left text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Amount
            </th>
            <th className="px-6 py-3 text-left text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Scheme
            </th>
            <th className="px-6 py-3 text-left text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Session
            </th>
            <th className="px-6 py-3 text-left text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Payer
            </th>
            <th className="px-6 py-3 text-left text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Transaction
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-neutral-200">
          {settlements.map((settlement) => (
            <TransactionRow key={settlement.id} settlement={settlement} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function TransactionsPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-black">
            Transaction History
          </h1>
          <p className="text-neutral-600 font-medium mt-2">
            All USDC settlements processed through P402 on Base L2
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href={`https://basescan.org/address/${P402_CONFIG.TREASURY_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="secondary" className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View Treasury
            </Button>
          </Link>
        </div>
      </div>

      {/* Treasury Info Card */}
      <Card className="p-6 bg-gradient-to-r from-green-50 to-blue-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-neutral-900 mb-2">P402 Treasury</h3>
            <div className="font-mono text-sm text-neutral-600 bg-white px-3 py-2 rounded border inline-block">
              {P402_CONFIG.TREASURY_ADDRESS}
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-neutral-600">Network</div>
            <div className="font-bold">Base L2 (Chain {P402_CONFIG.CHAIN_ID})</div>

            <div className="text-sm text-neutral-600 mt-2">Asset</div>
            <div className="font-bold">USDC</div>
          </div>
        </div>
      </Card>

      {/* Transactions Table */}
      <Card title="All Settlements" className="p-0">
        <Suspense fallback={
          <table className="min-w-full">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-neutral-900 uppercase">Time</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-neutral-900 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-neutral-900 uppercase">Scheme</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-neutral-900 uppercase">Session</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-neutral-900 uppercase">Payer</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-neutral-900 uppercase">Transaction</th>
              </tr>
            </thead>
            <tbody>
              <TransactionsTableSkeleton />
            </tbody>
          </table>
        }>
          <TransactionsTable />
        </Suspense>
      </Card>

      {/* Info Footer */}
      <div className="bg-neutral-50 border-2 border-black p-4 text-sm text-neutral-600">
        <p className="font-medium mb-2">About Transaction History:</p>
        <ul className="space-y-1 text-xs">
          <li>• <strong>EIP-3009 Gasless:</strong> User signs authorization, P402 pays gas</li>
          <li>• <strong>On-Chain Verification:</strong> User broadcasts transaction, P402 verifies</li>
          <li>• <strong>Receipt Reuse:</strong> Previous payment applied to new request</li>
          <li>• All transactions are cryptographically verified on Base L2</li>
        </ul>
      </div>
    </div>
  );
}