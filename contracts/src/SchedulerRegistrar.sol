// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IScheduler} from "./interfaces/IScheduler.sol";

/// @notice Tiny helper contract: the Ritual Scheduler rejects EOA callers
/// (custom error SenderNotContract()), so we deploy this and call it from the
/// EOA. It forwards to scheduler.schedule(). The owner can also re-register
/// jobs later without redeploying the protocol contracts.
contract SchedulerRegistrar {
    address public constant SCHEDULER = 0x56e776BAE2DD60664b69Bd5F865F1180ffB7D58B;
    address public immutable owner;

    event Registered(uint256 jobId, address indexed target, bytes4 indexed selector);

    error NotOwner();

    constructor() {
        owner = msg.sender;
    }

    /// @notice Pass payer = address(this) (Registrar) — Scheduler requires
    /// msg.sender == payer OR payer.approveScheduler(msg.sender).
    function register(
        bytes calldata data,
        uint32 gas,
        uint32 startBlock,
        uint32 numCalls,
        uint32 frequency,
        uint32 ttl,
        uint256 maxFeePerGas,
        uint256 maxPriorityFeePerGas
    ) external returns (uint256 jobId) {
        if (msg.sender != owner) revert NotOwner();
        jobId = IScheduler(SCHEDULER).schedule(
            data, gas, startBlock, numCalls, frequency, ttl,
            maxFeePerGas, maxPriorityFeePerGas, 0, address(this)
        );
        emit Registered(jobId, address(this), bytes4(data[:4]));
    }

    function cancel(uint256 jobId) external {
        if (msg.sender != owner) revert NotOwner();
        IScheduler(SCHEDULER).cancel(jobId);
    }
}
