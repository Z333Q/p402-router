import { keccak256, toBytes, encodeAbiParameters, parseAbiParameters, type Address, type Hash, type Hex } from 'viem';

// EIP-712 Domain Separator Type
export const EIP712_DOMAIN_TYPE = [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
];

// TransferWithAuthorization Type (matches USDC contract)
export const TRANSFER_WITH_AUTHORIZATION_TYPE = [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
];

// TypeHash helpers
export const TRANSFER_WITH_AUTHORIZATION_TYPEHASH = keccak256(
    toBytes("TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)")
);

export interface EIP3009Authorization {
    from: Address;
    to: Address;
    value: bigint | string; // Handle both for API convenience
    validAfter: number | string;
    validBefore: number | string;
    nonce: Hex; // bytes32
    v: number;
    r: Hex;
    s: Hex;
}

/**
 * Validates the structure of an incoming EIP-3009 authorization payload.
 * Does not check signature validity (handled by contract simulation) or business rules.
 */
export function validateAuthorizationStructure(auth: any): auth is EIP3009Authorization {
    if (!auth) return false;

    // Basic structural checks
    if (typeof auth.from !== 'string' || !auth.from.startsWith('0x')) return false;
    if (typeof auth.to !== 'string' || !auth.to.startsWith('0x')) return false;

    // Value check (string or valid number/bigint representation)
    if (!auth.value) return false;

    // Time checks
    if (auth.validAfter === undefined || auth.validAfter === null) return false;
    if (auth.validBefore === undefined || auth.validBefore === null) return false;

    // Nonce check
    if (typeof auth.nonce !== 'string' || !auth.nonce.startsWith('0x') || auth.nonce.length !== 66) return false;

    // Signature components
    if (typeof auth.v !== 'number') return false;
    if (typeof auth.r !== 'string' || !auth.r.startsWith('0x')) return false;
    if (typeof auth.s !== 'string' || !auth.s.startsWith('0x')) return false;

    return true;
}

/**
 * ABI for the transferWithAuthorization function on USDC
 */
export const USDC_EIP3009_ABI = parseAbiParameters(
    'address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s'
);
