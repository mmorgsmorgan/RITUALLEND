// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Errors} from "./lib/Errors.sol";
import {IScheduler} from "./interfaces/IScheduler.sol";

/// @notice Credit score registry for RitualLend.
/// Scores are 0..1000. Tiers map to LTV caps and interest-rate multipliers.
/// Scores update on borrow / repay / default (called by the market) and on a
/// periodic tick() from the Ritual Scheduler precompile.
contract CreditScore {
    uint256 public constant MAX_SCORE = 1000;
    uint256 public constant START_SCORE = 500;
    uint256 public constant DECAY_PER_TICK = 5; // points toward START_SCORE per scheduler tick
    uint256 public constant STREAK_BONUS_PER_TICK = 1; // healthy borrower bonus per tick
    int256 public constant REPAY_DELTA = 25;
    int256 public constant DEFAULT_DELTA = -200;

    struct Profile {
        uint16 score;       // 0..1000
        uint16 repays;      // lifetime on-time repayments
        uint16 defaults;    // lifetime defaults
        uint64 lastTouched; // ms timestamp of last score change
        bool initialized;
    }

    address public immutable owner;
    address public market;          // RitualLend, set once
    address public immutable scheduler;
    uint256 public scheduledJobId;  // last scheduler jobId (informational)
    uint256 public lastTickBlock;

    mapping(address => Profile) public profiles;
    address[] public activeBorrowers;
    mapping(address => uint256) private _activeIdxPlusOne; // 0 means not active

    event ScoreUpdated(address indexed user, uint16 newScore, int256 delta, string reason);
    event MarketSet(address indexed market);
    event Tick(uint256 indexed jobId, uint256 borrowersTouched);
    event ActiveBorrowerAdded(address indexed user);
    event ActiveBorrowerRemoved(address indexed user);

    modifier onlyOwner() {
        if (msg.sender != owner) revert Errors.OnlyOwner();
        _;
    }

    modifier onlyMarket() {
        if (msg.sender != market) revert Errors.OnlyMarket();
        _;
    }

    modifier onlyScheduler() {
        if (msg.sender != scheduler) revert Errors.OnlyScheduler();
        _;
    }

    constructor(address _scheduler) {
        owner = msg.sender;
        scheduler = _scheduler;
    }

    function setMarket(address _market) external onlyOwner {
        if (market != address(0)) revert Errors.OnlyOwner();
        market = _market;
        emit MarketSet(_market);
    }

    function setJobId(uint256 jobId) external onlyOwner {
        scheduledJobId = jobId;
    }

    /// @notice Owner-only. Schedule the periodic tick() job. CreditScore must
    /// itself be the caller of scheduler.schedule() because the scheduler
    /// calls msg.sender back at execution time, and we want that to be this
    /// contract. payer = address(this) — fund via RitualWallet.depositFor.
    function registerJob(
        uint32 gas,
        uint32 startBlock,
        uint32 numCalls,
        uint32 frequency,
        uint32 ttl,
        uint256 maxFeePerGas,
        uint256 maxPriorityFeePerGas
    ) external onlyOwner returns (uint256 jobId) {
        bytes memory data = abi.encodeWithSelector(this.tick.selector, uint256(0));
        jobId = IScheduler(scheduler).schedule(
            data, gas, startBlock, numCalls, frequency, ttl,
            maxFeePerGas, maxPriorityFeePerGas, 0, address(this)
        );
        scheduledJobId = jobId;
    }

    /// @notice Get or initialise a profile.
    function getOrInit(address user) public returns (Profile memory) {
        Profile storage p = profiles[user];
        if (!p.initialized) {
            p.score = uint16(START_SCORE);
            p.initialized = true;
            p.lastTouched = uint64(block.timestamp);
        }
        return p;
    }

    function scoreOf(address user) public view returns (uint16) {
        Profile memory p = profiles[user];
        return p.initialized ? p.score : uint16(START_SCORE);
    }

    /// @notice Returns tier (0..3), maxLTV in 1e18, and rateMultiplier in 1e18.
    /// Tier boundaries: 0-299 / 300-599 / 600-799 / 800-1000. New users start at 500 → tier 1.
    function tier(address user) public view returns (uint8 t, uint256 maxLtv, uint256 rateMul) {
        uint16 s = scoreOf(user);
        if (s < 300)      { t = 0; maxLtv = 0.50e18; rateMul = 1.20e18; }
        else if (s < 600) { t = 1; maxLtv = 0.65e18; rateMul = 1.00e18; }
        else if (s < 800) { t = 2; maxLtv = 0.75e18; rateMul = 0.85e18; }
        else              { t = 3; maxLtv = 0.85e18; rateMul = 0.70e18; }
    }

    // -- Market callbacks --

    function onBorrow(address user) external onlyMarket {
        getOrInit(user);
        if (_activeIdxPlusOne[user] == 0) {
            activeBorrowers.push(user);
            _activeIdxPlusOne[user] = activeBorrowers.length;
            emit ActiveBorrowerAdded(user);
        }
    }

    function onRepay(address user, bool onTime) external onlyMarket {
        getOrInit(user);
        if (onTime) {
            _bumpScore(user, REPAY_DELTA, "repay");
            profiles[user].repays += 1;
        }
    }

    function onFullyRepaid(address user) external onlyMarket {
        _removeActive(user);
    }

    function onLoanDefaulted(address user) external onlyMarket {
        getOrInit(user);
        _bumpScore(user, DEFAULT_DELTA, "default");
        profiles[user].defaults += 1;
    }

    // -- Scheduler callback --

    /// @notice First uint256 is overwritten with the scheduler's executionIndex.
    /// We just consume it and proceed.
    function tick(uint256 /* executionIndex */) external onlyScheduler {
        uint256 n = activeBorrowers.length;
        for (uint256 i = 0; i < n; ++i) {
            address u = activeBorrowers[i];
            Profile storage p = profiles[u];
            if (!p.initialized) continue;
            int256 delta;
            // healthy active borrower: small streak bonus
            if (p.defaults == 0) delta += int256(STREAK_BONUS_PER_TICK);
            // decay toward START_SCORE
            if (p.score > START_SCORE) delta -= int256(DECAY_PER_TICK);
            else if (p.score < START_SCORE) delta += int256(DECAY_PER_TICK);
            if (delta != 0) _applyDelta(p, u, delta, "tick");
        }
        lastTickBlock = block.number;
        emit Tick(scheduledJobId, n);
    }

    // -- Internals --

    function _bumpScore(address user, int256 delta, string memory reason) internal {
        Profile storage p = profiles[user];
        _applyDelta(p, user, delta, reason);
    }

    function _applyDelta(Profile storage p, address user, int256 delta, string memory reason) internal {
        int256 next = int256(uint256(p.score)) + delta;
        if (next < 0) next = 0;
        if (next > int256(MAX_SCORE)) next = int256(MAX_SCORE);
        p.score = uint16(uint256(next));
        p.lastTouched = uint64(block.timestamp);
        emit ScoreUpdated(user, p.score, delta, reason);
    }

    function _removeActive(address user) internal {
        uint256 idxPlus = _activeIdxPlusOne[user];
        if (idxPlus == 0) return;
        uint256 idx = idxPlus - 1;
        uint256 last = activeBorrowers.length - 1;
        if (idx != last) {
            address moved = activeBorrowers[last];
            activeBorrowers[idx] = moved;
            _activeIdxPlusOne[moved] = idx + 1;
        }
        activeBorrowers.pop();
        delete _activeIdxPlusOne[user];
        emit ActiveBorrowerRemoved(user);
    }

    function activeBorrowerCount() external view returns (uint256) {
        return activeBorrowers.length;
    }
}
