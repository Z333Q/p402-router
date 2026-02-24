import { Page } from '@playwright/test';

export async function injectMockWallet(page: Page, mockAddress: string = '0x1234567890123456789012345678901234567890') {
    await page.addInitScript((address) => {
        (window as any).ethereum = {
            isMetaMask: true,
            request: async ({ method, params }: { method: string; params: any[] }) => {
                if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [address];
                if (method === 'eth_chainId') return '0x2105'; // Base Mainnet

                if (method === 'eth_signTypedData_v4') {
                    // Parse the payload to ensure it's requesting our EIP-2612 Permit
                    const payload = JSON.parse(params[1]);
                    if (payload.primaryType === 'Permit' && payload.domain.name === 'USD Coin') {
                        return '0xmocked_eip2612_signature_string_0000000000000000000000000000000';
                    }
                    return '0xmockedsignature';
                }
                return null;
            },
        };
    }, mockAddress);
}
