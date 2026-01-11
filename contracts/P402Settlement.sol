// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title P402 Settlement Contract
 * @notice Handles atomic settlement and fee collection for P402 marketplace transactions.
 * @dev Takes 101% from sender, sends 100% to recipient, keeps 1% as fee (configurable).
 */
contract P402Settlement {
    address public owner;
    address public treasury;
    uint256 public feeBasisPoints = 100; // 100 bps = 1.00%
    bool public paused = false;

    event PaymentSettled(
        address indexed sender,
        address indexed recipient,
        address indexed token,
        uint256 netAmount,
        uint256 feeAmount,
        string referenceId
    );

    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event TreasuryUpdated(address oldTreasury, address newTreasury);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _treasury) {
        owner = msg.sender;
        treasury = _treasury;
    }

    /**
     * @notice Settles a payment by transferring tokens from sender to recipient + fee.
     * @param token The ERC20 token address (e.g. USDC).
     * @param netAmount The amount the recipient should receive (100%).
     * @param recipient The address of the service provider.
     * @param referenceId External reference ID for linking to off-chain orders (e.g. "evt_123").
     */
    function pay(
        address token,
        uint256 netAmount,
        address recipient,
        string calldata referenceId
    ) external {
        require(!paused, "Contract paused");
        require(recipient != address(0), "Invalid recipient");

        // Calculate Fee (e.g. 10.00 USDC * 100 / 10000 = 0.10 USDC)
        uint256 feeAmount = (netAmount * feeBasisPoints) / 10000;
        uint256 totalAmount = netAmount + feeAmount;

        // Transfer Total from Sender to Contract (Sender must approve this contract first)
        require(
            IERC20(token).transferFrom(msg.sender, address(this), totalAmount),
            "TransferFrom failed"
        );

        // Transfer Net Amount to Recipient
        require(
            IERC20(token).transfer(recipient, netAmount),
            "Transfer to recipient failed"
        );

        // Fee stays in contract (or could be auto-swept to treasury)
        
        emit PaymentSettled(msg.sender, recipient, token, netAmount, feeAmount, referenceId);
    }

    /**
     * @notice Admin function to withdraw accumulated fees to the treasury.
     * @param token The ERC20 token to withdraw.
     */
    function withdraw(address token) external {
        // Anyone can trigger the sweep to the hardcoded treasury (security best practice)
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No fees to withdraw");
        require(IERC20(token).transfer(treasury, balance), "Withdraw failed");
    }

    // --- Admin Views & upkeep ---

    function setFee(uint256 _bps) external onlyOwner {
        require(_bps <= 1000, "Fee cap exceeded (10%)");
        emit FeeUpdated(feeBasisPoints, _bps);
        feeBasisPoints = _bps;
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid address");
        emit TreasuryUpdated(treasury, _treasury);
        treasury = _treasury;
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
}
