# P402 Cloudflare Facilitator

Production-grade x402 facilitator running on Cloudflare Workers, leveraging $250k startup credits for global edge deployment.

## Architecture

- **Runtime**: Cloudflare Workers (V8 isolates)
- **Storage**: KV namespaces for receipts and rate limiting
- **Network**: Base L2 (Chain ID: 8453)
- **Token**: USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
- **Protocol**: x402 with EIP-3009 gasless payments

## Features

### Payment Schemes
- **Exact**: EIP-3009 transferWithAuthorization (gasless USDC)
- **Onchain**: Direct blockchain transaction verification
- **Receipt**: Reusable payment proofs for session continuity

### Global Edge Deployment
- **15 locations**: US, Europe, Asia, Oceania
- **Sub-50ms verification**: P95 latency guarantee
- **99.9% uptime**: SLA backed by Cloudflare infrastructure

### Security Features
- Rate limiting (100 requests/minute per IP)
- API key authentication for settlement endpoints
- Treasury address validation
- Replay protection via nonce checking
- Comprehensive health monitoring

## Endpoints

### Discovery
```bash
GET /.well-known/agent.json
# Returns facilitator capabilities and configuration
```

### Health Check
```bash
GET /health
# Returns system status and dependency checks
```

### Payment Verification
```bash
POST /verify
Content-Type: application/json

{
  "scheme": "exact",
  "payment": {
    "from": "0x...",
    "to": "0x...",
    "value": "1000000",
    "validAfter": 1705123200,
    "validBefore": 1705209600,
    "nonce": "0x...",
    "v": 27,
    "r": "0x...",
    "s": "0x..."
  }
}
```

### Payment Settlement
```bash
POST /settle
Authorization: Bearer p402_...
Content-Type: application/json

{
  "scheme": "exact",
  "payment": { /* EIP-3009 authorization */ }
}
```

### Receipt Generation
```bash
POST /receipt
Content-Type: application/json

{
  "txHash": "0x...",
  "sessionId": "session_123",
  "amount": 1.00
}
```

## Deployment

### Prerequisites
1. Install [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
2. Configure Cloudflare account
3. Set up KV namespaces

### Environment Setup
```bash
# Create KV namespaces
wrangler kv:namespace create "RECEIPTS_KV"
wrangler kv:namespace create "RECEIPTS_KV" --preview
wrangler kv:namespace create "RATE_LIMIT_KV"
wrangler kv:namespace create "RATE_LIMIT_KV" --preview

# Set secrets
wrangler secret put FACILITATOR_PRIVATE_KEY
wrangler secret put P402_TREASURY_ADDRESS
wrangler secret put BASE_RPC_URL
```

### Deploy to Production
```bash
npm install
npm run deploy
```

### Deploy to Staging
```bash
npm run deploy:staging
```

## Configuration

### Performance Limits
- **Max Amount**: $10,000 per transaction
- **Min Amount**: $0.01 per transaction
- **Rate Limit**: 100 requests/minute per IP
- **Facilitator Fee**: 1% (100 basis points)

### Cache TTL
- **Verification Cache**: 5 minutes
- **Receipt Storage**: 24 hours
- **Health Checks**: 1 minute

### Error Handling
All endpoints return structured JSON errors:
```json
{
  "verified": false,
  "error": "Insufficient USDC balance",
  "details": "Account balance: 0.5 USDC, required: 1.0 USDC"
}
```

## Monitoring

### Health Checks
The `/health` endpoint monitors:
- KV storage accessibility
- Base RPC connectivity
- Treasury wallet configuration
- Facilitator wallet status
- Response time performance

### Rate Limiting
- Per-IP sliding window (1 minute)
- Endpoint-specific limits
- Distributed across edge locations
- Automatic retry-after headers

### Analytics
Cloudflare Analytics Engine tracks:
- Request volume by location
- Error rates by endpoint
- Payment verification success
- Settlement execution metrics

## Security

### Authentication
Protected endpoints require Bearer token:
```bash
Authorization: Bearer p402_AbCdEf123...
```

### Treasury Validation
All payments must be directed to the configured P402 treasury address.

### Nonce Protection
EIP-3009 nonces are checked against USDC contract state to prevent replay attacks.

### Input Validation
- Address format validation
- Amount range checking
- Timing window enforcement
- Signature verification

## Integration

### Frontend Integration
```typescript
const facilitator = new P402Facilitator({
  endpoint: 'https://facilitator.p402.io',
  apiKey: 'p402_...'
});

const verification = await facilitator.verify({
  scheme: 'exact',
  payment: eip3009Authorization
});
```

### Backend Integration
```bash
curl -X POST https://facilitator.p402.io/verify \
  -H "Content-Type: application/json" \
  -d '{"scheme":"exact","payment":{...}}'
```

## Support

- **Documentation**: https://docs.p402.io/facilitators/cloudflare
- **Status Page**: https://status.p402.io
- **Contact**: facilitator@p402.io

---

**Production Deployment**: facilitator.p402.io
**Staging Environment**: staging-facilitator.p402.io
**Last Updated**: 2024-01-15