// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title P402 Escrow Contract
 * @notice Conditional USDC escrow with a state machine, 48-hour dispute window,
 *         and admin-only dispute resolution (V1).
 *
 * State machine:
 *   CREATED -> FUNDED -> ACCEPTED -> IN_PROGRESS -> DELIVERED -> SETTLED
 *                                                            -> DISPUTED -> RESOLVED
 *                                               -> EXPIRED (48h timeout after delivery)
 *                     -> CANCELLED (by payer before acceptance)
 *
 * Both counterparties are verified off-chain (World AgentBook) by P402 before
 * the escrow is created. The contract enforces economic commitments only.
 *
 * V1 constraints:
 *   - Admin-only dispute resolution (no decentralized arbitration)
 *   - All-or-nothing (no milestone splits)
 *   - USDC on Base only
 */
contract P402Escrow {

    // ─────────────────────────────────────────────────────────────
    // State Machine
    // ─────────────────────────────────────────────────────────────

    enum EscrowState {
        CREATED,        // 0: Created, awaiting funding
        FUNDED,         // 1: USDC deposited by payer
        ACCEPTED,       // 2: Provider accepted the task
        IN_PROGRESS,    // 3: Work underway
        DELIVERED,      // 4: Provider submitted delivery proof
        SETTLED,        // 5: Terminal — funds released to provider
        DISPUTED,       // 6: Payer contested delivery
        RESOLVED,       // 7: Terminal — admin resolved dispute
        EXPIRED,        // 8: Terminal — delivery window elapsed, refunded
        CANCELLED       // 9: Terminal — cancelled before acceptance
    }

    // ─────────────────────────────────────────────────────────────
    // Data
    // ─────────────────────────────────────────────────────────────

    struct Escrow {
        bytes32 id;             // keccak256 referenceId
        address payer;          // Client agent wallet
        address provider;       // Service provider wallet
        address token;          // ERC-20 (USDC)
        uint256 amount;         // Gross escrow amount (net + P402 fee)
        uint256 feeAmount;      // P402 1% fee
        EscrowState state;
        bytes32 proofHash;      // SHA-256 of delivery artifact
        uint256 createdAt;
        uint256 deliveredAt;    // Timestamp of DELIVERED state
        uint256 disputeWindow;  // Seconds after delivery that disputes are open
        string referenceId;     // Off-chain P402 task ID (for indexing)
    }

    // ─────────────────────────────────────────────────────────────
    // Storage
    // ─────────────────────────────────────────────────────────────

    address public owner;
    address public treasury;
    uint256 public feeBasisPoints = 100;        // 1.00%
    uint256 public disputeWindowSeconds = 172800; // 48 hours
    bool public paused = false;

    mapping(bytes32 => Escrow) public escrows;

    // ─────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────

    event EscrowCreated(bytes32 indexed id, address indexed payer, address indexed provider, uint256 amount, string referenceId);
    event EscrowFunded(bytes32 indexed id, uint256 amount);
    event EscrowAccepted(bytes32 indexed id, address indexed provider);
    event EscrowInProgress(bytes32 indexed id);
    event EscrowDelivered(bytes32 indexed id, bytes32 proofHash);
    event EscrowSettled(bytes32 indexed id, address indexed provider, uint256 netAmount, uint256 feeAmount);
    event EscrowDisputed(bytes32 indexed id, address indexed payer);
    event EscrowResolved(bytes32 indexed id, address indexed winner, uint256 amount);
    event EscrowExpired(bytes32 indexed id);
    event EscrowCancelled(bytes32 indexed id);

    // ─────────────────────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }

    modifier inState(bytes32 id, EscrowState expected) {
        require(escrows[id].state == expected, "Invalid state transition");
        _;
    }

    // ─────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────

    constructor(address _treasury) {
        owner = msg.sender;
        treasury = _treasury;
    }

    // ─────────────────────────────────────────────────────────────
    // Core Functions
    // ─────────────────────────────────────────────────────────────

    /**
     * @notice Create a new escrow commitment. Caller is the payer.
     * @param referenceId Off-chain P402 task/mandate ID.
     * @param provider The service provider wallet.
     * @param token ERC-20 token address (USDC).
     * @param netAmount Amount the provider should receive (before fee).
     */
    function create(
        string calldata referenceId,
        address provider,
        address token,
        uint256 netAmount
    ) external notPaused returns (bytes32 id) {
        require(provider != address(0) && provider != msg.sender, "Invalid provider");
        require(netAmount > 0, "Amount must be > 0");

        uint256 feeAmount = (netAmount * feeBasisPoints) / 10000;
        uint256 grossAmount = netAmount + feeAmount;

        id = keccak256(abi.encodePacked(referenceId, msg.sender, provider, block.timestamp));
        require(escrows[id].createdAt == 0, "Escrow already exists");

        escrows[id] = Escrow({
            id: id,
            payer: msg.sender,
            provider: provider,
            token: token,
            amount: grossAmount,
            feeAmount: feeAmount,
            state: EscrowState.CREATED,
            proofHash: bytes32(0),
            createdAt: block.timestamp,
            deliveredAt: 0,
            disputeWindow: disputeWindowSeconds,
            referenceId: referenceId
        });

        emit EscrowCreated(id, msg.sender, provider, grossAmount, referenceId);
    }

    /**
     * @notice Fund the escrow. Payer transfers USDC to the contract.
     */
    function fund(bytes32 id) external notPaused inState(id, EscrowState.CREATED) {
        Escrow storage e = escrows[id];
        require(msg.sender == e.payer, "Not payer");

        bool ok = IERC20(e.token).transferFrom(msg.sender, address(this), e.amount);
        require(ok, "Transfer failed");

        e.state = EscrowState.FUNDED;
        emit EscrowFunded(id, e.amount);
    }

    /**
     * @notice Provider accepts the task and commits to delivery.
     */
    function accept(bytes32 id) external notPaused inState(id, EscrowState.FUNDED) {
        Escrow storage e = escrows[id];
        require(msg.sender == e.provider, "Not provider");

        e.state = EscrowState.ACCEPTED;
        emit EscrowAccepted(id, msg.sender);
    }

    /**
     * @notice Mark work as in progress (can be called by either party).
     */
    function startWork(bytes32 id) external notPaused inState(id, EscrowState.ACCEPTED) {
        Escrow storage e = escrows[id];
        require(msg.sender == e.payer || msg.sender == e.provider, "Not party");

        e.state = EscrowState.IN_PROGRESS;
        emit EscrowInProgress(id);
    }

    /**
     * @notice Provider submits delivery with a SHA-256 proof hash.
     * @param proofHash keccak256 of the delivery artifact (computed off-chain).
     */
    function deliver(bytes32 id, bytes32 proofHash) external notPaused {
        Escrow storage e = escrows[id];
        require(
            e.state == EscrowState.ACCEPTED || e.state == EscrowState.IN_PROGRESS,
            "Not in deliverable state"
        );
        require(msg.sender == e.provider, "Not provider");
        require(proofHash != bytes32(0), "Empty proof");

        e.state = EscrowState.DELIVERED;
        e.proofHash = proofHash;
        e.deliveredAt = block.timestamp;
        emit EscrowDelivered(id, proofHash);
    }

    /**
     * @notice Payer confirms delivery and releases funds to provider.
     * Also callable by anyone after the 48-hour dispute window.
     */
    function release(bytes32 id) external notPaused inState(id, EscrowState.DELIVERED) {
        Escrow storage e = escrows[id];

        bool payerReleasing = msg.sender == e.payer;
        bool windowElapsed = block.timestamp > e.deliveredAt + e.disputeWindow;

        require(payerReleasing || windowElapsed, "Window not elapsed");

        _settle(id);
    }

    /**
     * @notice Payer disputes delivery within the 48-hour window.
     */
    function dispute(bytes32 id) external notPaused inState(id, EscrowState.DELIVERED) {
        Escrow storage e = escrows[id];
        require(msg.sender == e.payer, "Not payer");
        require(block.timestamp <= e.deliveredAt + e.disputeWindow, "Window elapsed");

        e.state = EscrowState.DISPUTED;
        emit EscrowDisputed(id, msg.sender);
    }

    /**
     * @notice Admin resolves a dispute. All-or-nothing: winner gets full amount.
     * @param toProvider true = provider wins; false = payer refunded.
     */
    function resolve(bytes32 id, bool toProvider) external onlyOwner inState(id, EscrowState.DISPUTED) {
        Escrow storage e = escrows[id];

        if (toProvider) {
            _settle(id);
        } else {
            // Refund payer
            e.state = EscrowState.RESOLVED;
            bool ok = IERC20(e.token).transfer(e.payer, e.amount);
            require(ok, "Refund failed");
            emit EscrowResolved(id, e.payer, e.amount);
        }
    }

    /**
     * @notice Expire an escrow after delivery window elapsed without action.
     * Refunds the payer. Anyone can call.
     */
    function expire(bytes32 id) external notPaused {
        Escrow storage e = escrows[id];
        require(
            e.state == EscrowState.FUNDED || e.state == EscrowState.ACCEPTED || e.state == EscrowState.IN_PROGRESS,
            "Cannot expire"
        );
        // Allow expiry 7 days after creation for pre-delivery states
        require(block.timestamp > e.createdAt + 7 days, "Too early to expire");

        e.state = EscrowState.EXPIRED;
        bool ok = IERC20(e.token).transfer(e.payer, e.amount);
        require(ok, "Refund failed");
        emit EscrowExpired(id);
    }

    /**
     * @notice Payer cancels before provider accepts.
     */
    function cancel(bytes32 id) external notPaused inState(id, EscrowState.FUNDED) {
        Escrow storage e = escrows[id];
        require(msg.sender == e.payer, "Not payer");

        e.state = EscrowState.CANCELLED;
        bool ok = IERC20(e.token).transfer(e.payer, e.amount);
        require(ok, "Refund failed");
        emit EscrowCancelled(id);
    }

    // ─────────────────────────────────────────────────────────────
    // Internal
    // ─────────────────────────────────────────────────────────────

    function _settle(bytes32 id) internal {
        Escrow storage e = escrows[id];
        e.state = EscrowState.SETTLED;

        uint256 netAmount = e.amount - e.feeAmount;

        // Transfer net to provider
        bool ok1 = IERC20(e.token).transfer(e.provider, netAmount);
        require(ok1, "Provider transfer failed");

        // Transfer fee to treasury
        bool ok2 = IERC20(e.token).transfer(treasury, e.feeAmount);
        require(ok2, "Fee transfer failed");

        emit EscrowSettled(id, e.provider, netAmount, e.feeAmount);
    }

    // ─────────────────────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────────────────────

    function setFeeBasisPoints(uint256 bps) external onlyOwner {
        require(bps <= 1000, "Max 10%");
        feeBasisPoints = bps;
    }

    function setDisputeWindow(uint256 seconds_) external onlyOwner {
        require(seconds_ >= 3600 && seconds_ <= 7 days, "Invalid window");
        disputeWindowSeconds = seconds_;
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Zero address");
        treasury = _treasury;
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }

    // ─────────────────────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────────────────────

    function getEscrow(bytes32 id) external view returns (Escrow memory) {
        return escrows[id];
    }

    function isDisputable(bytes32 id) external view returns (bool) {
        Escrow storage e = escrows[id];
        return e.state == EscrowState.DELIVERED &&
               block.timestamp <= e.deliveredAt + e.disputeWindow;
    }

    function isReleasable(bytes32 id) external view returns (bool) {
        Escrow storage e = escrows[id];
        return e.state == EscrowState.DELIVERED &&
               block.timestamp > e.deliveredAt + e.disputeWindow;
    }
}
