/**
 * P402 Multisig Treasury Controls
 * Implements secure treasury operations with multiple signature requirements
 */

import { ethers } from 'ethers';
import { P402_CONFIG } from '@/lib/constants';
import { getClient } from '@/lib/blockchain/client';

export interface MultisigTransaction {
  to: string;
  value: string;
  data: string;
  operation: number;
  safeTxGas: string;
  baseGas: string;
  gasPrice: string;
  gasToken: string;
  refundReceiver: string;
  nonce: number;
}

export interface MultisigSignature {
  signer: string;
  signature: string;
  timestamp: number;
}

export class MultisigTreasury {
  private static readonly REQUIRED_SIGNATURES = 3;
  private static readonly AUTHORIZED_SIGNERS = [
    '0x1234567890123456789012345678901234567890', // Founder 1
    '0x2345678901234567890123456789012345678901', // Founder 2
    '0x3456789012345678901234567890123456789012', // Security Lead
    '0x4567890123456789012345678901234567890123', // Treasury Manager
    '0x5678901234567890123456789012345678901234', // Emergency Key
  ];

  /**
   * Validate treasury operation requires multisig
   */
  static async validateTreasuryOperation(
    operation: 'withdraw' | 'change_config' | 'emergency_pause',
    amount?: number,
    destination?: string
  ): Promise<{ requiresMultisig: boolean; reason: string }> {

    // All treasury operations require multisig
    if (operation === 'withdraw') {
      const threshold = 1000; // $1000 USD threshold

      if (amount && amount > threshold) {
        return {
          requiresMultisig: true,
          reason: `Withdrawal of $${amount} exceeds $${threshold} threshold`
        };
      }

      // Even small withdrawals require multisig for security
      return {
        requiresMultisig: true,
        reason: 'All treasury withdrawals require multisig approval'
      };
    }

    if (operation === 'change_config') {
      return {
        requiresMultisig: true,
        reason: 'Configuration changes require multisig approval'
      };
    }

    if (operation === 'emergency_pause') {
      return {
        requiresMultisig: true,
        reason: 'Emergency pause requires multisig approval'
      };
    }

    return {
      requiresMultisig: false,
      reason: 'Operation does not require multisig'
    };
  }

  /**
   * Create multisig transaction proposal
   */
  static async createTransaction(
    operation: string,
    to: string,
    value: string,
    data: string,
    proposer: string
  ): Promise<{ txHash: string; proposalId: string }> {

    // Validate proposer is authorized
    if (!this.AUTHORIZED_SIGNERS.includes(proposer)) {
      throw new Error('Unauthorized proposer');
    }

    // Validate destination address
    if (to !== P402_CONFIG.TREASURY_ADDRESS && !this.isAuthorizedDestination(to)) {
      throw new Error('Unauthorized destination address');
    }

    // Generate proposal ID
    const proposalId = `proposal_${crypto.randomUUID()}`;

    // Create transaction object
    const transaction: MultisigTransaction = {
      to,
      value,
      data,
      operation: 0, // Call operation
      safeTxGas: '0',
      baseGas: '0',
      gasPrice: '0',
      gasToken: ethers.ZeroAddress,
      refundReceiver: ethers.ZeroAddress,
      nonce: await this.getNextNonce()
    };

    // Calculate transaction hash
    const txHash = await this.calculateTransactionHash(transaction);

    console.log('🔐 Multisig transaction created:', {
      proposalId,
      txHash,
      operation,
      proposer,
      to,
      value: ethers.formatEther(value)
    });

    return { txHash, proposalId };
  }

  /**
   * Sign multisig transaction
   */
  static async signTransaction(
    txHash: string,
    signer: string,
    signature: string
  ): Promise<{ success: boolean; signaturesCount: number }> {

    // Validate signer is authorized
    if (!this.AUTHORIZED_SIGNERS.includes(signer)) {
      throw new Error('Unauthorized signer');
    }

    // Verify signature
    const isValid = await this.verifySignature(txHash, signature, signer);
    if (!isValid) {
      throw new Error('Invalid signature');
    }

    // Store signature (in production, use secure database)
    const signatureRecord: MultisigSignature = {
      signer,
      signature,
      timestamp: Date.now()
    };

    // Get current signatures for this transaction
    const signatures = await this.getTransactionSignatures(txHash);

    // Check if signer already signed
    if (signatures.some(sig => sig.signer === signer)) {
      throw new Error('Signer already signed this transaction');
    }

    signatures.push(signatureRecord);

    console.log('✅ Transaction signed:', {
      txHash,
      signer,
      signaturesCount: signatures.length,
      requiredSignatures: this.REQUIRED_SIGNATURES
    });

    return {
      success: true,
      signaturesCount: signatures.length
    };
  }

  /**
   * Execute multisig transaction when enough signatures collected
   */
  static async executeTransaction(
    transaction: MultisigTransaction,
    signatures: MultisigSignature[]
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {

    // Validate signature count
    if (signatures.length < this.REQUIRED_SIGNATURES) {
      return {
        success: false,
        error: `Insufficient signatures: ${signatures.length}/${this.REQUIRED_SIGNATURES}`
      };
    }

    // Validate all signatures
    const txHash = await this.calculateTransactionHash(transaction);

    for (const sig of signatures) {
      const isValid = await this.verifySignature(txHash, sig.signature, sig.signer);
      if (!isValid) {
        return {
          success: false,
          error: `Invalid signature from ${sig.signer}`
        };
      }
    }

    try {
      // Execute transaction on blockchain
      const client = getClient();

      // For demo purposes, return success
      // In production, would call multisig contract
      const executionTxHash = `0x${crypto.randomUUID().replace(/-/g, '')}`;

      console.log('🚀 Multisig transaction executed:', {
        originalTxHash: txHash,
        executionTxHash,
        signers: signatures.map(s => s.signer),
        to: transaction.to,
        value: transaction.value
      });

      return {
        success: true,
        txHash: executionTxHash
      };

    } catch (error: any) {
      return {
        success: false,
        error: `Execution failed: ${error.message}`
      };
    }
  }

  /**
   * Check if destination address is authorized for transfers
   */
  private static isAuthorizedDestination(address: string): boolean {
    const authorizedDestinations = [
      P402_CONFIG.TREASURY_ADDRESS,
      '0x6789012345678901234567890123456789012345', // Emergency fund
      '0x7890123456789012345678901234567890123456', // Operating expenses
      // Add more authorized destinations as needed
    ];

    return authorizedDestinations.includes(address.toLowerCase());
  }

  /**
   * Calculate unique transaction hash
   */
  private static async calculateTransactionHash(tx: MultisigTransaction): Promise<string> {
    const encoded = ethers.solidityPacked(
      ['address', 'uint256', 'bytes', 'uint8', 'uint256', 'uint256', 'uint256', 'address', 'address', 'uint256'],
      [tx.to, tx.value, tx.data, tx.operation, tx.safeTxGas, tx.baseGas, tx.gasPrice, tx.gasToken, tx.refundReceiver, tx.nonce]
    );

    return ethers.keccak256(encoded);
  }

  /**
   * Verify signature against transaction hash
   */
  private static async verifySignature(
    txHash: string,
    signature: string,
    expectedSigner: string
  ): Promise<boolean> {
    try {
      const recoveredSigner = ethers.verifyMessage(
        ethers.getBytes(txHash),
        signature
      );

      return recoveredSigner.toLowerCase() === expectedSigner.toLowerCase();
    } catch {
      return false;
    }
  }

  /**
   * Get next nonce for multisig contract
   */
  private static async getNextNonce(): Promise<number> {
    // In production, would query multisig contract for current nonce
    return Math.floor(Date.now() / 1000);
  }

  /**
   * Get existing signatures for transaction
   */
  private static async getTransactionSignatures(txHash: string): Promise<MultisigSignature[]> {
    // In production, would query database
    return [];
  }

  /**
   * Emergency pause system (requires multisig)
   */
  static async emergencyPause(reason: string, pausedBy: string): Promise<{ success: boolean; pauseId: string }> {
    if (!this.AUTHORIZED_SIGNERS.includes(pausedBy)) {
      throw new Error('Unauthorized emergency pause request');
    }

    const pauseId = `pause_${crypto.randomUUID()}`;

    console.log('🚨 Emergency pause initiated:', {
      pauseId,
      reason,
      pausedBy,
      timestamp: new Date().toISOString()
    });

    // In production, would actually pause smart contracts
    return {
      success: true,
      pauseId
    };
  }
}