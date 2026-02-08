# P402 End-to-End Payment Demo Recording Script

This document provides a comprehensive script for recording the P402 payment flow demonstration, showcasing real USDC payments on Base network.

## Recording Setup

### Prerequisites
- Screen recording software (Loom, OBS, or similar)
- Base network wallet with USDC balance
- Chrome/Brave browser with MetaMask
- Stable internet connection
- 1920x1080 recording resolution

### Demo Environment
- **URL**: `https://p402.io/demo/payment-flow`
- **Network**: Base mainnet (Chain ID: 8453)
- **Token**: USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
- **Amount**: $1.00 USDC
- **Duration**: ~3-4 minutes

## Recording Script

### Introduction (30 seconds)

> "Welcome to P402's end-to-end payment demonstration. Today I'll show you how P402 enables gasless USDC payments for AI services using the x402 protocol.

> We'll be using real USDC on Base mainnet to demonstrate a complete payment flow from wallet connection through settlement and receipt generation."

**On Screen**:
- P402 homepage showing "Real Payments for Real AI"
- Navigate to `/demo/payment-flow`

### Setup Phase (45 seconds)

> "First, let's review the demo setup. We need Base mainnet with at least $1 USDC. P402 uses EIP-3009 transferWithAuthorization for gasless payments, meaning users only need USDC - no ETH for gas fees."

**On Screen**:
- Show demo setup card
- Highlight network requirements
- Point out gasless nature of payments

> "Let me connect my wallet now."

**Actions**:
- Click "Connect Wallet"
- MetaMask popup appears
- Select account with USDC balance
- Confirm connection

### Payment Flow Demo (2.5 minutes)

#### Step 1: Wallet Connection (10 seconds)
> "Perfect! My wallet is connected and shows my USDC balance. The system automatically detected I have sufficient funds for this demo."

**On Screen**:
- Green checkmark for wallet connection
- USDC balance displayed
- Ready state indicated

#### Step 2: Start Payment Flow (5 seconds)
> "Now I'll start the payment demo by clicking 'Start Payment Demo'."

**Actions**:
- Click "Start Payment Demo" button
- Steps begin animating

#### Step 3: Payment Authorization Signing (30 seconds)
> "The first step is signing the EIP-3009 authorization. This creates a gasless payment instruction that P402's facilitator can execute on my behalf."

**On Screen**:
- Step 3 becomes active (blue)
- MetaMask signature request appears

> "Notice this is just a signature - not a transaction. No gas fees are required from the user."

**Actions**:
- Show MetaMask signature request
- Explain the authorization parameters
- Click "Sign" in MetaMask

> "Authorization signed successfully. This signature authorizes the transfer of 1 USDC to P402's treasury."

#### Step 4: Payment Verification (20 seconds)
> "Next, P402's facilitator verifies the payment authorization in real-time. This includes checking the signature, validating the nonce hasn't been used, and confirming I have sufficient USDC balance."

**On Screen**:
- Step 4 active with "Verifying with P402 facilitator..."
- Completion with checkmark

> "Verification complete! The facilitator confirmed this is a valid, unused payment authorization."

#### Step 5: Gasless Settlement (30 seconds)
> "Now comes the magic - gasless settlement execution. P402's facilitator submits the transferWithAuthorization transaction to the USDC contract, paying gas fees on my behalf."

**On Screen**:
- Step 5 active with "Executing gasless settlement..."
- Transaction hash appears when complete

> "Settlement executed successfully! Here's the transaction hash. You can see this is a real transaction on Base mainnet."

**Actions**:
- Hover over transaction hash
- Show it's clickable to Basescan

#### Step 6: Receipt Generation (20 seconds)
> "Finally, P402 generates a reusable payment receipt. This allows me to use the same payment for multiple AI sessions without signing additional authorizations."

**On Screen**:
- Step 6 completes
- Receipt ID displayed
- All steps show green checkmarks

> "Perfect! All six steps completed successfully."

### Results Review (45 seconds)

> "Let's review what we accomplished:"

**On Screen**:
- Scroll to "Demo Results" section
- Show transaction hash
- Show receipt ID

> "We have a real blockchain transaction on Base mainnet, moving 1 USDC from my wallet to P402's treasury. The transaction was executed by P402's facilitator, so I paid zero gas fees."

**Actions**:
- Click "View on Basescan" link
- Show Basescan transaction details in new tab
- Point out sender, receiver, amount

> "The receipt can now be reused for future AI sessions. This is particularly valuable for use cases like ongoing conversations or batch processing."

### Integration Overview (30 seconds)

> "For developers, P402 provides simple SDKs and APIs for integration."

**On Screen**:
- Scroll to "Integration Guide" section
- Highlight frontend and backend code examples

> "The frontend SDK handles wallet connection and payment signing, while the backend API verifies payments with P402's facilitator network."

### Key Benefits Summary (20 seconds)

> "To summarize the key benefits we demonstrated:"

**On Screen**:
- Show benefits list
- Highlight each point while reading

> "Gasless payments eliminate user friction, instant verification enables real-time AI access, global facilitator deployment ensures low latency worldwide, receipt reuse optimizes for ongoing sessions, and everything runs on production infrastructure with real USDC."

### Conclusion (15 seconds)

> "This completes our end-to-end payment demonstration. P402 transforms how users pay for AI services by eliminating gas fees, reducing payment friction, and enabling instant access to premium AI capabilities."

**On Screen**:
- Return to P402 homepage or pricing page

> "Visit p402.io to learn more about integrating x402 payments into your AI applications."

## Recording Checklist

### Pre-Recording
- [ ] Wallet has sufficient USDC balance (minimum $2)
- [ ] Base network is added to MetaMask
- [ ] P402 demo environment is accessible
- [ ] Screen recording software is configured
- [ ] Audio levels are tested
- [ ] Browser zoom is set to 100%

### During Recording
- [ ] Speak clearly and at moderate pace
- [ ] Wait for animations to complete
- [ ] Show MetaMask popups clearly
- [ ] Explain each step as it happens
- [ ] Highlight important UI elements
- [ ] Keep recording under 4 minutes

### Post-Recording
- [ ] Edit for smooth transitions
- [ ] Add captions/subtitles
- [ ] Include P402 branding overlay
- [ ] Export in 1080p quality
- [ ] Upload to appropriate platform
- [ ] Share with team for review

## Troubleshooting

### Common Issues
1. **Insufficient USDC**: Ensure wallet has at least $1 USDC
2. **Wrong network**: Switch to Base mainnet (Chain ID: 8453)
3. **MetaMask connection**: Refresh page and reconnect
4. **Signature rejection**: Re-attempt signing step
5. **Demo timeout**: Restart demo if steps don't advance

### Backup Plans
1. **Network issues**: Have pre-recorded screens as fallback
2. **Wallet problems**: Use secondary wallet with USDC
3. **Demo bugs**: Show static screenshots while narrating
4. **Time constraints**: Focus on core payment flow steps

## Distribution

### Platforms
- **Website**: Embed on p402.io homepage and docs
- **Social**: Share on Twitter, LinkedIn for viral reach
- **Developer**: Include in GitHub README and documentation
- **Sales**: Use in customer demos and presentations

### Formats
- **Full demo**: 3-4 minute complete walkthrough
- **Short clips**: 30-60 second highlights for social
- **GIF**: Key moments for documentation
- **Screenshots**: Static captures for written guides

This demonstration showcases P402's production readiness and real-world utility for AI payment infrastructure.