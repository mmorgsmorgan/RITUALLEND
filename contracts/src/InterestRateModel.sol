// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice Two-slope kink interest-rate model.
/// Rate is returned per-millisecond (Ritual block.timestamp is in ms),
/// scaled by 1e18.
contract InterestRateModel {
    uint256 public constant MS_PER_YEAR = 365 days * 1000;
    uint256 public constant WAD = 1e18;

    /// APR at 0% utilization (1e18 = 100%).
    uint256 public immutable baseRatePerYear;
    /// Slope from 0% utilization up to the kink.
    uint256 public immutable multiplierPerYear;
    /// Additional slope above the kink.
    uint256 public immutable jumpMultiplierPerYear;
    /// Kink utilization (1e18 = 100%).
    uint256 public immutable kink;

    constructor(
        uint256 _baseRatePerYear,
        uint256 _multiplierPerYear,
        uint256 _jumpMultiplierPerYear,
        uint256 _kink
    ) {
        baseRatePerYear = _baseRatePerYear;
        multiplierPerYear = _multiplierPerYear;
        jumpMultiplierPerYear = _jumpMultiplierPerYear;
        kink = _kink;
    }

    function utilization(uint256 cash, uint256 borrows) public pure returns (uint256) {
        if (borrows == 0) return 0;
        return (borrows * WAD) / (cash + borrows);
    }

    /// @return borrowRate per-ms, scaled by 1e18
    function getBorrowRatePerMs(uint256 cash, uint256 borrows) public view returns (uint256) {
        uint256 u = utilization(cash, borrows);
        uint256 annual;
        if (u <= kink) {
            annual = baseRatePerYear + (u * multiplierPerYear) / WAD;
        } else {
            uint256 normalRate = baseRatePerYear + (kink * multiplierPerYear) / WAD;
            uint256 excessUtil = u - kink;
            annual = normalRate + (excessUtil * jumpMultiplierPerYear) / WAD;
        }
        return annual / MS_PER_YEAR;
    }

    /// @return supplyRate per-ms (1e18 scaled), net of reserve factor (passed in by caller; 0 for v1)
    function getSupplyRatePerMs(
        uint256 cash,
        uint256 borrows,
        uint256 reserveFactor
    ) public view returns (uint256) {
        uint256 u = utilization(cash, borrows);
        uint256 borrowRate = getBorrowRatePerMs(cash, borrows);
        uint256 oneMinusRf = WAD - reserveFactor;
        return (u * borrowRate * oneMinusRf) / (WAD * WAD);
    }
}
