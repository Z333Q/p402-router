'use client';

import { useState, useEffect } from 'react';
import { Card, Button } from '@/app/dashboard/_components/ui';
import { usePayment } from '@/lib/hooks/usePayment';
import { P402_CONFIG } from '@/lib/constants';

interface DemoStep {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  details?: string;
}

export default function PaymentFlowDemoPage() {
  const [steps, setSteps] = useState<DemoStep[]>([
    {
      id: 1,
      title: 'Connect Wallet',
      description: 'Connect your wallet with USDC on Base network',
      status: 'pending'
    },
    {
      id: 2,
      title: 'Check USDC Balance',
      description: 'Verify you have sufficient USDC for the demo payment',
      status: 'pending'
    },
    {
      id: 3,
      title: 'Sign Payment Authorization',
      description: 'Create EIP-3009 transferWithAuthorization signature',
      status: 'pending'
    },
    {
      id: 4,
      title: 'Verify Payment',
      description: 'P402 facilitator verifies the payment authorization',
      status: 'pending'
    },
    {
      id: 5,
      title: 'Execute Settlement',
      description: 'Gasless settlement executed by facilitator',
      status: 'pending'
    },
    {
      id: 6,
      title: 'Generate Receipt',
      description: 'Create reusable payment receipt for future sessions',
      status: 'pending'
    }
  ]);

  const [demoAmount] = useState(1.0); // $1 USDC demo
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [transactionHash, setTransactionHash] = useState<string>('');
  const [receiptId, setReceiptId] = useState<string>('');

  const {
    account,
    isConnected,
    balance,
    connect,
    signPayment,
    isLoading
  } = usePayment();

  const updateStepStatus = (stepId: number, status: DemoStep['status'], details?: string) => {
    setSteps(prev => prev.map(step =>
      step.id === stepId ? { ...step, status, details } : step
    ));
  };

  const runDemo = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    if (!balance || balance < demoAmount) {
      alert(`Insufficient USDC balance. Need at least $${demoAmount} USDC on Base network.`);
      return;
    }

    setIsRunning(true);
    setCurrentStep(1);

    try {
      // Step 1: Wallet already connected
      updateStepStatus(1, 'completed', `Connected: ${account?.slice(0, 6)}...${account?.slice(-4)}`);
      setCurrentStep(2);

      // Step 2: Balance already checked
      updateStepStatus(2, 'completed', `Balance: ${balance} USDC`);
      setCurrentStep(3);
      await delay(1000);

      // Step 3: Sign payment authorization
      updateStepStatus(3, 'active', 'Requesting signature...');

      const authorization = await signPayment({
        to: P402_CONFIG.TREASURY_ADDRESS,
        value: (demoAmount * 1e6).toString(), // Convert to 6 decimals
        validAfter: Math.floor(Date.now() / 1000) - 300, // Valid from 5 minutes ago
        validBefore: Math.floor(Date.now() / 1000) + 3600, // Valid for 1 hour
      });

      updateStepStatus(3, 'completed', 'Authorization signed successfully');
      setCurrentStep(4);
      await delay(1000);

      // Step 4: Verify payment
      updateStepStatus(4, 'active', 'Verifying with P402 facilitator...');

      const verifyResponse = await fetch('/api/v1/router/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment: {
            scheme: 'exact',
            authorization
          }
        })
      });

      const verifyResult = await verifyResponse.json();

      if (!verifyResult.verified) {
        throw new Error(`Verification failed: ${verifyResult.error}`);
      }

      updateStepStatus(4, 'completed', 'Payment verified by facilitator');
      setCurrentStep(5);
      await delay(1000);

      // Step 5: Execute settlement
      updateStepStatus(5, 'active', 'Executing gasless settlement...');

      const settleResponse = await fetch('/api/v1/router/settle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer demo_api_key_12345' // Demo API key
        },
        body: JSON.stringify({
          payment: {
            scheme: 'exact',
            authorization
          }
        })
      });

      const settleResult = await settleResponse.json();

      if (!settleResult.success) {
        throw new Error(`Settlement failed: ${settleResult.error}`);
      }

      setTransactionHash(settleResult.txHash);
      updateStepStatus(5, 'completed', `Settlement executed: ${settleResult.txHash}`);
      setCurrentStep(6);
      await delay(1000);

      // Step 6: Generate receipt
      updateStepStatus(6, 'active', 'Generating reusable receipt...');

      const receiptResponse = await fetch('/api/v1/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash: settleResult.txHash,
          sessionId: `demo_session_${Date.now()}`,
          amount: demoAmount
        })
      });

      const receiptResult = await receiptResponse.json();

      if (!receiptResult.success) {
        throw new Error(`Receipt generation failed: ${receiptResult.error}`);
      }

      setReceiptId(receiptResult.receiptId);
      updateStepStatus(6, 'completed', `Receipt created: ${receiptResult.receiptId}`);

    } catch (error: any) {
      console.error('Demo error:', error);
      updateStepStatus(currentStep, 'error', error.message);
    } finally {
      setIsRunning(false);
    }
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black uppercase tracking-tighter text-black">
          End-to-End Payment Demo
        </h1>
        <p className="text-neutral-600 font-medium mt-2">
          Complete demonstration of P402 payment flow with real USDC on Base network
        </p>
      </div>

      {/* Demo Setup */}
      <Card title="Demo Setup" className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-bold text-neutral-900 mb-2">Network Requirements</h4>
            <ul className="space-y-1 text-sm text-neutral-600">
              <li>• Base mainnet (Chain ID: 8453)</li>
              <li>• USDC balance: minimum $1.00</li>
              <li>• MetaMask or compatible wallet</li>
              <li>• Small ETH for gas (if needed)</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-neutral-900 mb-2">Demo Parameters</h4>
            <ul className="space-y-1 text-sm text-neutral-600">
              <li>• Payment amount: ${demoAmount} USDC</li>
              <li>• Treasury: {P402_CONFIG.TREASURY_ADDRESS.slice(0, 10)}...</li>
              <li>• Scheme: EIP-3009 exact</li>
              <li>• Gasless execution</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4">
          {!isConnected ? (
            <Button onClick={connect} disabled={isLoading}>
              {isLoading ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          ) : (
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="text-green-600">✓</span> Connected: {account?.slice(0, 6)}...{account?.slice(-4)}
              </div>
              <div className="text-sm">
                Balance: {balance} USDC
              </div>
            </div>
          )}

          <Button
            onClick={runDemo}
            disabled={!isConnected || isRunning || (balance && balance < demoAmount)}
            variant="primary"
          >
            {isRunning ? 'Running Demo...' : 'Start Payment Demo'}
          </Button>
        </div>
      </Card>

      {/* Demo Steps */}
      <Card title="Payment Flow Steps" className="p-6">
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`
                flex items-start gap-4 p-4 rounded-lg border-2 transition-all duration-300
                ${step.status === 'active' ? 'border-blue-500 bg-blue-50' :
                  step.status === 'completed' ? 'border-green-500 bg-green-50' :
                  step.status === 'error' ? 'border-red-500 bg-red-50' :
                  'border-neutral-200 bg-neutral-50'}
              `}
            >
              <div className="flex-shrink-0 mt-1">
                {step.status === 'completed' && (
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
                {step.status === 'active' && (
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                    <span className="text-white text-xs">{step.id}</span>
                  </div>
                )}
                {step.status === 'error' && (
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">!</span>
                  </div>
                )}
                {step.status === 'pending' && (
                  <div className="w-6 h-6 bg-neutral-300 rounded-full flex items-center justify-center">
                    <span className="text-neutral-600 text-xs">{step.id}</span>
                  </div>
                )}
              </div>

              <div className="flex-1">
                <h4 className="font-bold text-neutral-900">{step.title}</h4>
                <p className="text-sm text-neutral-600">{step.description}</p>
                {step.details && (
                  <p className="text-xs text-neutral-500 mt-1 font-mono">{step.details}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Results */}
      {(transactionHash || receiptId) && (
        <Card title="Demo Results" className="p-6">
          <div className="space-y-4">
            {transactionHash && (
              <div>
                <h4 className="font-bold text-neutral-900 mb-2">Settlement Transaction</h4>
                <div className="bg-neutral-100 p-4 rounded border font-mono text-sm break-all">
                  {transactionHash}
                </div>
                <a
                  href={`https://basescan.org/tx/${transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  View on Basescan →
                </a>
              </div>
            )}

            {receiptId && (
              <div>
                <h4 className="font-bold text-neutral-900 mb-2">Payment Receipt</h4>
                <div className="bg-neutral-100 p-4 rounded border font-mono text-sm break-all">
                  {receiptId}
                </div>
                <p className="text-sm text-neutral-600 mt-2">
                  This receipt can be reused for future payments without additional signatures.
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Integration Guide */}
      <Card title="Integration Guide" className="p-6">
        <div className="space-y-6">
          <div>
            <h4 className="font-bold text-neutral-900 mb-2">Frontend Integration</h4>
            <pre className="bg-neutral-100 p-4 rounded text-sm overflow-x-auto">{`// 1. Install P402 SDK
npm install @p402/sdk

// 2. Initialize client
import { P402Client } from '@p402/sdk';

const p402 = new P402Client({
  network: 'base',
  facilitator: 'https://facilitator.p402.io'
});

// 3. Process payment
const payment = await p402.createPayment({
  amount: 1.0,
  token: 'USDC',
  scheme: 'exact'
});

await payment.sign();
await payment.execute();`}</pre>
          </div>

          <div>
            <h4 className="font-bold text-neutral-900 mb-2">Backend Integration</h4>
            <pre className="bg-neutral-100 p-4 rounded text-sm overflow-x-auto">{`// Verify payment server-side
const verification = await fetch('https://facilitator.p402.io/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    scheme: 'exact',
    payment: signedAuthorization
  })
});

const result = await verification.json();
if (result.verified) {
  // Payment is valid, proceed with service
  await provideAIService(sessionId, result.amount_usd);
}`}</pre>
          </div>

          <div>
            <h4 className="font-bold text-neutral-900 mb-2">Key Benefits Demonstrated</h4>
            <ul className="space-y-2 text-sm text-neutral-600">
              <li>✓ <strong>Gasless payments:</strong> Users don't pay gas fees for USDC transfers</li>
              <li>✓ <strong>Instant verification:</strong> Sub-100ms payment verification</li>
              <li>✓ <strong>Global facilitator:</strong> Edge deployment for low latency worldwide</li>
              <li>✓ <strong>Receipt reuse:</strong> One payment enables multiple AI sessions</li>
              <li>✓ <strong>Production ready:</strong> Real USDC on Base mainnet</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}