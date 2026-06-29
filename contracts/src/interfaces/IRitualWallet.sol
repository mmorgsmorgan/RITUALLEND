// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IRitualWallet {
    function depositFor(address user, uint256 lockDuration) external payable;
    function balanceOf(address user) external view returns (uint256);
    function withdraw(uint256 amount) external;
}
