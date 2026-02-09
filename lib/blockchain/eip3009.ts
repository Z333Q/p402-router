import { ethers } from 'ethers';
import { P402_CONFIG } from '../constants';

export interface TransferAuthorization {
  from: string;
  to: string;
  value: string;
  validAfter: number;
  validBefore: number;
  nonce: string;
}

export interface EIP3009Signature {
  v: number;
  r: string;
  s: string;
}

export interface VerificationResult {
  verified: boolean;
  scheme: 'exact';
  paymentHash: string;
  amount: number;
  token: string;
  payer: string;
  signature?: EIP3009Signature;
  authorization?: TransferAuthorization;
  txHash?: string;
  error?: string;
}

/**
 * EIP-3009 Verifier for gasless USDC transfers
 *
 * This implements the "exact" payment scheme where:
 * 1. User signs an EIP-712 authorization for transferWithAuthorization
 * 2. P402 facilitator pays gas to execute the transfer
 * 3. USDC moves directly from user to treasury
 */
export class EIP3009Verifier {
  private provider: ethers.Provider;
  private usdcContract: ethers.Contract;

  constructor(usdcAddress: string, provider: ethers.Provider) {
    // USDC on Base supports EIP-3009 transferWithAuthorization
    const abi = [
      'function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) external',
      'function authorizationState(address authorizer, bytes32 nonce) external view returns (bool)',
      'function DOMAIN_SEPARATOR() external view returns (bytes32)',
      'function balanceOf(address account) external view returns (uint256)',
      'function decimals() external view returns (uint8)'
    ];

    this.provider = provider;
    this.usdcContract = new ethers.Contract(usdcAddress, abi, provider);
  }

  /**
   * Verify EIP-3009 signature without executing transaction
   */
  async verifySignature(
    authorization: TransferAuthorization,
    signature: EIP3009Signature
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      // Get USDC domain separator
      const domainSeparator = await this.usdcContract.getFunction('DOMAIN_SEPARATOR')();

      // Reconstruct EIP-712 typed data hash
      const typeHash = ethers.keccak256(
        ethers.toUtf8Bytes(
          'TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)'
        )
      );

      const abiCoder = ethers.AbiCoder.defaultAbiCoder();
      const structHash = ethers.keccak256(
        abiCoder.encode(
          ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256', 'bytes32'],
          [
            typeHash,
            authorization.from,
            authorization.to,
            authorization.value,
            authorization.validAfter,
            authorization.validBefore,
            authorization.nonce
          ]
        )
      );

      const digest = ethers.keccak256(
        ethers.solidityPacked(
          ['string', 'bytes32', 'bytes32'],
          ['\x19\x01', domainSeparator, structHash]
        )
      );

      // Recover signer
      const recoveredAddress = ethers.recoverAddress(digest, {
        v: signature.v,
        r: signature.r,
        s: signature.s
      });

      if (recoveredAddress.toLowerCase() !== authorization.from.toLowerCase()) {
        return { valid: false, error: 'Invalid signature - recovered address mismatch' };
      }

      // Check if authorization is still unused
      const isUsed = await this.usdcContract.getFunction('authorizationState')(
        authorization.from,
        authorization.nonce
      );

      if (isUsed) {
        return { valid: false, error: 'Authorization nonce already used' };
      }

      // Verify timing
      const now = Math.floor(Date.now() / 1000);
      if (now < authorization.validAfter) {
        return { valid: false, error: 'Authorization not yet valid' };
      }
      if (now > authorization.validBefore) {
        return { valid: false, error: 'Authorization expired' };
      }

      // Check balance
      const balance: bigint = await this.usdcContract.getFunction('balanceOf')(authorization.from);
      if (balance < BigInt(authorization.value)) {
        return { valid: false, error: 'Insufficient USDC balance' };
      }

      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Execute the gasless transfer using EIP-3009
   */
  async executeTransfer(
    authorization: TransferAuthorization,
    signature: EIP3009Signature,
    facilitatorSigner: ethers.Signer
  ): Promise<{ txHash: string; success: boolean; error?: string }> {
    try {
      // Verify signature first (prevents unnecessary gas usage)
      const verification = await this.verifySignature(authorization, signature);
      if (!verification.valid) {
        return { txHash: '', success: false, error: verification.error };
      }

      // Execute transferWithAuthorization (facilitator pays gas)
      const contractWithSigner = this.usdcContract.connect(facilitatorSigner) as ethers.Contract;

      const tx = await contractWithSigner.getFunction('transferWithAuthorization')(
        authorization.from,
        authorization.to,
        authorization.value,
        authorization.validAfter,
        authorization.validBefore,
        authorization.nonce,
        signature.v,
        signature.r,
        signature.s,
        {
          gasLimit: 150000, // Conservative gas limit for USDC transferWithAuthorization
        }
      );

      // Wait for confirmation
      const receipt = await tx.wait();

      if (receipt.status !== 1) {
        return {
          txHash: tx.hash,
          success: false,
          error: 'Transaction reverted'
        };
      }

      return {
        txHash: tx.hash,
        success: true
      };

    } catch (error: any) {
      // Common error cases
      if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        return {
          txHash: '',
          success: false,
          error: 'Transaction would fail - likely insufficient balance or invalid authorization'
        };
      }

      if (error.message?.includes('nonce already used')) {
        return {
          txHash: '',
          success: false,
          error: 'Authorization nonce already used (replay attack)'
        };
      }

      return {
        txHash: '',
        success: false,
        error: error.message || 'Transaction execution failed'
      };
    }
  }

  /**
   * Full verification flow for P402 settlement
   */
  async verifyExactPayment(
    authorization: TransferAuthorization,
    signature: EIP3009Signature,
    expectedAmountUSD: number
  ): Promise<VerificationResult> {
    try {
      // 1. Verify recipient is P402 treasury
      if (authorization.to.toLowerCase() !== P402_CONFIG.TREASURY_ADDRESS.toLowerCase()) {
        return {
          verified: false,
          scheme: 'exact',
          paymentHash: '',
          amount: 0,
          token: 'USDC',
          payer: authorization.from,
          error: `Payment not addressed to P402 treasury. Expected: ${P402_CONFIG.TREASURY_ADDRESS}, got: ${authorization.to}`
        };
      }

      // 2. Verify signature
      const sigVerification = await this.verifySignature(authorization, signature);
      if (!sigVerification.valid) {
        return {
          verified: false,
          scheme: 'exact',
          paymentHash: '',
          amount: 0,
          token: 'USDC',
          payer: authorization.from,
          error: sigVerification.error
        };
      }

      // 3. Convert amount to USD (USDC has 6 decimals)
      const amountUSD = parseFloat(ethers.formatUnits(authorization.value, 6));

      // 4. Verify amount meets minimum
      if (amountUSD < expectedAmountUSD * 0.99) { // Allow 1% tolerance
        return {
          verified: false,
          scheme: 'exact',
          paymentHash: '',
          amount: amountUSD,
          token: 'USDC',
          payer: authorization.from,
          error: `Insufficient amount: ${amountUSD} USDC < ${expectedAmountUSD} USDC required`
        };
      }

      // 5. Generate unique payment hash for replay protection
      const abiCoder = ethers.AbiCoder.defaultAbiCoder();
      const paymentHash = ethers.keccak256(
        abiCoder.encode(
          ['address', 'bytes32', 'uint256'],
          [authorization.from, authorization.nonce, authorization.value]
        )
      );

      return {
        verified: true,
        scheme: 'exact',
        paymentHash,
        amount: amountUSD,
        token: 'USDC',
        payer: authorization.from,
        signature,
        authorization
      };

    } catch (error: any) {
      return {
        verified: false,
        scheme: 'exact',
        paymentHash: '',
        amount: 0,
        token: 'USDC',
        payer: authorization.from,
        error: error.message
      };
    }
  }
}

/**
 * Factory function to create EIP3009Verifier for P402
 */
export function createEIP3009Verifier(): EIP3009Verifier {
  const provider = new ethers.JsonRpcProvider(
    process.env.BASE_RPC_URL || 'https://mainnet.base.org'
  );

  return new EIP3009Verifier(P402_CONFIG.USDC_ADDRESS, provider);
}
