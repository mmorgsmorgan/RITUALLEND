// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

library Errors {
    error ZeroAmount();
    error InsufficientCash();
    error InsufficientShares();
    error InsufficientCollateral();
    error Unhealthy();
    error AlreadyHealthy();
    error OnlyMarket();
    error OnlyScheduler();
    error OnlyOwner();
    error NotImplemented();
    error TransferFailed();
}
