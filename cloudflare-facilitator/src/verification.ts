/**
 * Payment Verification Handler for Cloudflare Workers
 * Supports onchain and receipt payment scheme verification
 */

import { P402Config } from './config';

export interface OnchainPayment {
  txHash: string;
  amount_usd: number;
  network: string;
  token: string;
}

export interface ReceiptPayment {
  receipt_id: string;
  session_id: string;
}

export class PaymentVerifier {
  /**
   * Verify onchain payment transaction
   */
  static async verifyOnchain(payment: OnchainPayment, env: any): Promise<Response> {
    try {
      // Basic validation
      if (!payment.txHash || !payment.amount_usd || payment.network !== 'base') {
        return new Response(JSON.stringify({
          verified: false,
          error: 'Invalid onchain payment parameters'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Check cache first
      const cacheKey = `onchain:${payment.txHash}`;
      const cached = await env.RECEIPTS_KV.get(cacheKey);
      if (cached) {
        return new Response(cached, {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Verify transaction on Base network
      const rpcUrl = env.BASE_RPC_URL || P402Config.DEFAULT_RPC_URLS[0];
      const txData = await this.getTransactionData(payment.txHash, rpcUrl);

      if (!txData) {
        return new Response(JSON.stringify({
          verified: false,
          error: 'Transaction not found'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Verify transaction details
      const verification = this.verifyTransactionDetails(txData, payment);
      if (!verification.valid) {
        const result = {
          verified: false,
          error: verification.error
        };

        // Cache negative result briefly
        await env.RECEIPTS_KV.put(cacheKey, JSON.stringify(result), {
          expirationTtl: 300 // 5 minutes
        });

        return new Response(JSON.stringify(result), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const result = {
        verified: true,
        scheme: 'onchain',
        amount_usd: payment.amount_usd,
        token: payment.token,
        network: payment.network,
        tx_hash: payment.txHash,
        block_number: txData.blockNumber,
        confirmations: txData.confirmations
      };

      // Cache positive result
      await env.RECEIPTS_KV.put(cacheKey, JSON.stringify(result), {
        expirationTtl: P402Config.VERIFICATION_CACHE_TTL
      });

      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: any) {
      console.error('Onchain verification error:', error);
      return new Response(JSON.stringify({
        verified: false,
        error: P402Config.ERRORS.VERIFICATION_FAILED,
        details: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Verify receipt payment (reuse existing payment)
   */
  static async verifyReceipt(payment: ReceiptPayment, env: any): Promise<Response> {
    try {
      if (!payment.receipt_id) {
        return new Response(JSON.stringify({
          verified: false,
          error: 'Receipt ID is required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Lookup receipt in KV store
      const receiptData = await env.RECEIPTS_KV.get(payment.receipt_id);
      if (!receiptData) {
        return new Response(JSON.stringify({
          verified: false,
          error: 'Receipt not found or expired'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const receipt = JSON.parse(receiptData);

      // Verify receipt is still valid
      if (new Date() > new Date(receipt.validUntil)) {
        return new Response(JSON.stringify({
          verified: false,
          error: 'Receipt has expired'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Optional: verify session_id matches if provided
      if (payment.session_id && receipt.sessionId !== payment.session_id) {
        return new Response(JSON.stringify({
          verified: false,
          error: 'Receipt session mismatch'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        verified: true,
        scheme: 'receipt',
        amount_usd: receipt.amount,
        receipt_id: payment.receipt_id,
        original_tx: receipt.txHash,
        valid_until: receipt.validUntil
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: any) {
      console.error('Receipt verification error:', error);
      return new Response(JSON.stringify({
        verified: false,
        error: P402Config.ERRORS.VERIFICATION_FAILED,
        details: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Get transaction data from Base RPC
   */
  private static async getTransactionData(txHash: string, rpcUrl: string): Promise<any> {
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getTransactionByHash',
          params: [txHash]
        })
      });

      const result = await response.json();
      return result.result;
    } catch (error) {
      console.warn('Transaction lookup failed:', error);
      return null;
    }
  }

  /**
   * Verify transaction details match payment requirements
   */
  private static verifyTransactionDetails(txData: any, payment: OnchainPayment): { valid: boolean; error?: string } {
    // Check transaction exists and is confirmed
    if (!txData || !txData.blockNumber) {
      return { valid: false, error: 'Transaction not confirmed' };
    }

    // Check if transaction is to USDC contract
    if (txData.to?.toLowerCase() !== P402Config.USDC_ADDRESS.toLowerCase()) {
      return { valid: false, error: 'Transaction not to USDC contract' };
    }

    // For full verification, would need to:
    // 1. Decode transaction data to verify transfer amount
    // 2. Check recipient is P402 treasury
    // 3. Verify amount matches expected payment
    // Simplified for demo

    return { valid: true };
  }
}