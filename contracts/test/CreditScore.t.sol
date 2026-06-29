// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Base} from "./Base.t.sol";
import {Errors} from "../src/lib/Errors.sol";

contract CreditScoreTest is Base {
    function test_StartsAtTier1() public view {
        (uint8 t, uint256 ltv, uint256 mul) = credit.tier(alice);
        assertEq(t, 1);
        assertEq(ltv, 0.65e18);
        assertEq(mul, 1.00e18);
    }

    function test_RepaysClimbToTier2() public {
        // 10 repays * 25 = +250 -> 750 -> still tier 2 boundary
        for (uint256 i = 0; i < 10; ++i) {
            _deposit(alice, 1 ether);
            vm.prank(alice);
            lend.borrow(0.5 ether);
            vm.prank(alice);
            lend.repay{value: 0.5 ether}();
        }
        (uint8 t,,) = credit.tier(alice);
        assertGe(t, 2);
    }

    function test_OnlySchedulerCanTick() public {
        vm.expectRevert(Errors.OnlyScheduler.selector);
        credit.tick(0);
    }

    function test_TickIsNoopWithNoActiveBorrowers() public {
        vm.prank(SCHEDULER);
        credit.tick(0);
        assertEq(credit.activeBorrowerCount(), 0);
    }

    function test_TickDecaysAboveMedian() public {
        // give alice a high score via repays
        for (uint256 i = 0; i < 12; ++i) {
            _deposit(alice, 1 ether);
            vm.prank(alice);
            lend.borrow(0.5 ether);
            vm.prank(alice);
            lend.repay{value: 0.5 ether}();
        }
        // open new borrow so she's "active"
        vm.prank(alice);
        lend.borrow(0.1 ether);
        uint16 before = credit.scoreOf(alice);
        assertGt(before, 500);

        vm.prank(SCHEDULER);
        credit.tick(0);
        uint16 afterTick = credit.scoreOf(alice);
        // delta = +1 (streak) - 5 (decay above 500) = -4
        assertLt(afterTick, before);
    }

    function test_NewActiveBorrowerTracked() public {
        _deposit(alice, 10 ether);
        vm.prank(alice);
        lend.borrow(1 ether);
        assertEq(credit.activeBorrowerCount(), 1);
    }

    function test_FullRepayRemovesActiveBorrower() public {
        _deposit(alice, 10 ether);
        vm.prank(alice);
        lend.borrow(1 ether);
        vm.prank(alice);
        lend.repay{value: 1 ether}();
        assertEq(credit.activeBorrowerCount(), 0);
    }
}
