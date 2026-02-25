// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20Permit {
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);

    function allowance(address owner, address spender) external view returns (uint256);
}

/**
 * @title P402 Subscription Facilitator
 * @notice Gasless USDC subscription billing via EIP-2612 permit.
 *
 * Flow:
 *   Month 1 — setupAndCharge():
 *     1. User signs an EIP-2612 permit off-chain (in browser, no gas).
 *     2. Facilitator (owner) submits setupAndCharge(), paying gas.
 *     3. Contract calls USDC.permit() to grant itself `totalAllowance`.
 *     4. Contract immediately transfers `firstMonthCharge` → treasury.
 *
 *   Month 2+ — chargeSubscription():
 *     1. Facilitator calls chargeSubscription() each billing period.
 *     2. Contract calls USDC.transferFrom() using the remaining allowance.
 *     3. Funds go directly to treasury; no new user signature needed.
 *
 * Security:
 *   - Only `owner` (the facilitator hot wallet) can initiate charges.
 *   - Treasury is a separate address; contract holds no funds.
 *   - transferFrom reverts if allowance is exhausted (subscription expired naturally).
 */
contract SubscriptionFacilitator {
    address public owner;
    address public treasury;
    address public immutable usdc;

    event SubscriptionSetup(
        address indexed user,
        uint256 totalAllowance,
        uint256 firstCharge
    );
    event SubscriptionCharged(address indexed user, uint256 amount);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _treasury, address _usdc) {
        require(_treasury != address(0), "Invalid treasury");
        require(_usdc != address(0), "Invalid USDC");
        owner = msg.sender;
        treasury = _treasury;
        usdc = _usdc;
    }

    /**
     * @notice Set up a recurring subscription and charge the first period.
     * @param user              The subscriber's wallet address.
     * @param totalAllowance    Total USDC to approve (e.g. 12 × $499 = $5,988).
     * @param deadline          EIP-2612 permit expiry (Unix timestamp).
     * @param v                 Permit signature v.
     * @param r                 Permit signature r.
     * @param s                 Permit signature s.
     * @param firstMonthCharge  USDC amount to transfer immediately (e.g. 499_000000).
     */
    function setupAndCharge(
        address user,
        uint256 totalAllowance,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s,
        uint256 firstMonthCharge
    ) external onlyOwner {
        require(user != address(0), "Invalid user");
        require(firstMonthCharge > 0, "Charge must be > 0");
        require(firstMonthCharge <= totalAllowance, "Charge exceeds allowance");

        // Set the USDC allowance via the user's off-chain permit signature.
        IERC20Permit(usdc).permit(user, address(this), totalAllowance, deadline, v, r, s);

        // Charge the first month directly to treasury.
        require(
            IERC20Permit(usdc).transferFrom(user, treasury, firstMonthCharge),
            "First charge failed"
        );

        emit SubscriptionSetup(user, totalAllowance, firstMonthCharge);
    }

    /**
     * @notice Charge a subscriber for a renewal period (month 2+).
     *         Draws from the allowance established by setupAndCharge.
     * @param user    The subscriber's wallet address.
     * @param amount  USDC amount to transfer (e.g. 499_000000 for $499).
     */
    function chargeSubscription(
        address user,
        uint256 amount
    ) external onlyOwner {
        require(user != address(0), "Invalid user");
        require(amount > 0, "Amount must be > 0");

        require(
            IERC20Permit(usdc).transferFrom(user, treasury, amount),
            "Renewal charge failed"
        );

        emit SubscriptionCharged(user, amount);
    }

    // ── Admin ────────────────────────────────────────────────────────────────

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid address");
        emit TreasuryUpdated(treasury, _treasury);
        treasury = _treasury;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
