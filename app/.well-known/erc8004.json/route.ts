import { NextResponse } from 'next/server';

export async function GET() {
  const agentId = process.env.ERC8004_AGENT_ID || 'unregistered';
  const enableValidation = process.env.ERC8004_ENABLE_VALIDATION === 'true';

  const supportedTrust: string[] = ['reputation'];
  if (enableValidation) {
    supportedTrust.push('crypto-economic');
  }

  const registration = {
    type: 'erc8004-agent-v1',
    name: 'P402 Protocol Governor',
    description:
      'Autonomous policy governance, intelligent routing, and settlement layer for A2A commerce on Base.',
    image: 'https://p402.io/favicon.png',
    services: [
      { type: 'a2a-agent-card', uri: 'https://p402.io/.well-known/agent.json' },
      { type: 'x402-facilitator', uri: 'https://p402.io/.well-known/p402.json' },
    ],
    registrations: [
      {
        agentRegistry: `eip155:8453:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`,
        agentId,
      },
    ],
    supportedTrust,
  };

  return NextResponse.json(registration);
}
