import { describe, it, expect, vi } from 'vitest';
import type { TransferAuthorization, EIP3009Signature } from '../eip3009';

// Mock ethers to avoid real network calls
// Must use function (not arrow) for Contract since it's called with `new`
vi.mock('ethers', () => {
    const mockContractInstance = {
        getFunction: vi.fn(() => vi.fn()),
        connect: vi.fn(function (this: any) { return this; })
    };
    function MockContract() { return mockContractInstance; }
    MockContract.prototype = mockContractInstance;

    function MockJsonRpcProvider() {}

    return {
        ethers: {
            Contract: MockContract,
            JsonRpcProvider: MockJsonRpcProvider,
            Provider: vi.fn(),
            keccak256: vi.fn(() => '0x' + 'a'.repeat(64)),
            toUtf8Bytes: vi.fn(() => new Uint8Array()),
            AbiCoder: {
                defaultAbiCoder: vi.fn(() => ({
                    encode: vi.fn(() => '0x')
                }))
            },
            solidityPacked: vi.fn(() => '0x'),
            recoverAddress: vi.fn(() => '0x1234567890123456789012345678901234567890'),
            formatUnits: vi.fn(() => '10.0')
        }
    };
});

vi.mock('@/lib/constants', () => ({
    P402_CONFIG: {
        TREASURY_ADDRESS: '0xb23f146251e3816a011e800bcbae704baa5619ec',
        USDC_ADDRESS: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        CHAIN_ID: 8453,
        NETWORK: 'base'
    }
}));

// Import after mocks
import { EIP3009Verifier, createEIP3009Verifier } from '../eip3009';

describe('EIP3009Verifier', () => {
    const mockProvider = {} as any;
    const usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

    const mockAuth: TransferAuthorization = {
        from: '0x1234567890123456789012345678901234567890',
        to: '0xb23f146251e3816a011e800bcbae704baa5619ec',
        value: '10000000',
        validAfter: 0,
        validBefore: Math.floor(Date.now() / 1000) + 3600,
        nonce: '0x' + 'a'.repeat(64)
    };

    const mockSig: EIP3009Signature = {
        v: 27,
        r: '0x' + 'b'.repeat(64),
        s: '0x' + 'c'.repeat(64)
    };

    it('should construct with USDC address and provider', () => {
        const verifier = new EIP3009Verifier(usdcAddress, mockProvider);
        expect(verifier).toBeDefined();
    });

    describe('verifyExactPayment', () => {
        it('should reject payment not addressed to treasury', async () => {
            const verifier = new EIP3009Verifier(usdcAddress, mockProvider);
            const badAuth = { ...mockAuth, to: '0x0000000000000000000000000000000000000000' };

            const result = await verifier.verifyExactPayment(badAuth, mockSig, 10);

            expect(result.verified).toBe(false);
            expect(result.error).toContain('not addressed to P402 treasury');
        });

        it('should include payer address in rejection result', async () => {
            const verifier = new EIP3009Verifier(usdcAddress, mockProvider);
            const badAuth = { ...mockAuth, to: '0x0000000000000000000000000000000000000000' };

            const result = await verifier.verifyExactPayment(badAuth, mockSig, 10);

            expect(result.payer).toBe(mockAuth.from);
            expect(result.scheme).toBe('exact');
        });
    });

    describe('TransferAuthorization interface', () => {
        it('should have all required fields', () => {
            expect(mockAuth.from).toBeDefined();
            expect(mockAuth.to).toBeDefined();
            expect(mockAuth.value).toBeDefined();
            expect(mockAuth.validAfter).toBeDefined();
            expect(mockAuth.validBefore).toBeDefined();
            expect(mockAuth.nonce).toBeDefined();
        });

        it('should have proper address format', () => {
            expect(mockAuth.from).toMatch(/^0x[a-fA-F0-9]{40}$/);
            expect(mockAuth.to).toMatch(/^0x[a-fA-F0-9]{40}$/);
        });

        it('should have proper nonce format', () => {
            expect(mockAuth.nonce).toMatch(/^0x[a-fA-F0-9]{64}$/);
        });
    });

    describe('EIP3009Signature interface', () => {
        it('should have v, r, s components', () => {
            expect(mockSig.v).toBe(27);
            expect(mockSig.r).toMatch(/^0x[a-f0-9]{64}$/);
            expect(mockSig.s).toMatch(/^0x[a-f0-9]{64}$/);
        });
    });
});

describe('createEIP3009Verifier', () => {
    it('should create a verifier instance', () => {
        const verifier = createEIP3009Verifier();
        expect(verifier).toBeInstanceOf(EIP3009Verifier);
    });
});
