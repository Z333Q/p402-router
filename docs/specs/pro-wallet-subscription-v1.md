# Subscription Smart Contract Specification (V1)

Unlike x402 usage fees (which use EIP-3009 `TransferWithAuthorization` requiring a signature per transaction), a monthly subscription requires autonomous execution without recurring user interaction.

We achieve this using EIP-2612 (`permit`). The user signs an off-chain approval, and our system submits it and charges the wallet simultaneously, ensuring a gasless UX while granting us protocol-level billing capabilities.

## Solidity Specification

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20Permit {
    function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external;
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract SubscriptionFacilitator {
    address public immutable usdc;
    address public immutable treasury;

    constructor(address _usdc, address _treasury) {
        usdc = _usdc;
        treasury = _treasury;
    }

    // Called on Month 1: Uses the signed permit to set allowance, then charges immediately
    function setupAndCharge(
        address user, 
        uint256 totalAllowance, 
        uint256 deadline, 
        uint8 v, bytes32 r, bytes32 s,
        uint256 firstMonthCharge
    ) external {
        // 1. Set the allowance gaslessly for the user
        IERC20Permit(usdc).permit(user, address(this), totalAllowance, deadline, v, r, s);
        
        // 2. Execute the first month's pull
        require(IERC20Permit(usdc).transferFrom(user, treasury, firstMonthCharge), "Transfer failed");
    }

    // Called on Month 2+: Uses the existing allowance to pull funds
    function chargeSubscription(address user, uint256 amount) external {
        require(IERC20Permit(usdc).transferFrom(user, treasury, amount), "Transfer failed");
    }
}
```
