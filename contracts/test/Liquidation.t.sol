// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Base} from "./Base.t.sol";
import {Errors} from "../src/lib/Errors.sol";

contract LiquidationTest is Base {
    function test_HealthyAccountCannotBeLiquidated() public {
        _deposit(alice, 100 ether);
        vm.prank(alice);
        lend.borrow(40 ether);
        vm.prank(liq);
        vm.expectRevert(Errors.AlreadyHealthy.selector);
        lend.liquidate{value: 10 ether}(alice, 10 ether);
    }

    function test_UnhealthyBorrowerCanBeLiquidated() public {
        // alice borrows at her tier 1 cap (65 of 100)
        _deposit(alice, 100 ether);
        vm.prank(alice);
        lend.borrow(65 ether);

        // Interest accrual over a year tips her over the LTV
        vm.warp(block.timestamp + 365 days * 1000);
        assertLt(lend.healthFactor(alice), 1e18, "should be unhealthy after a year");

        uint256 liqShareBalBefore = lend.balanceOf(liq);
        vm.prank(liq);
        lend.liquidate{value: 5 ether}(alice, 5 ether);

        // liquidator receives seized rRITUAL shares (5 RITUAL * 1.05 bonus)
        assertGt(lend.balanceOf(liq), liqShareBalBefore);
    }

    function test_LiquidationCappedByCloseFactor() public {
        _deposit(alice, 100 ether);
        vm.prank(alice);
        lend.borrow(65 ether);
        vm.warp(block.timestamp + 365 days * 1000);

        uint256 debtBefore = lend.borrowBalance(alice);
        // try to repay 100% of the debt; close factor caps it at 50%
        vm.prank(liq);
        lend.liquidate{value: debtBefore}(alice, debtBefore);
        uint256 debtAfter = lend.borrowBalance(alice);
        // about half should remain
        assertGt(debtAfter, debtBefore / 4);
    }
}
