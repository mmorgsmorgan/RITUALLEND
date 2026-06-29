// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Base} from "./Base.t.sol";
import {Errors} from "../src/lib/Errors.sol";

contract RitualLendTest is Base {
    function test_DepositMintsOneToOneWhenEmpty() public {
        uint256 shares = _deposit(alice, 100 ether);
        assertEq(shares, 100 ether);
        assertEq(lend.balanceOf(alice), 100 ether);
        assertEq(lend.totalCash(), 100 ether);
        assertEq(lend.totalSupply(), 100 ether);
    }

    function test_WithdrawAllReturnsPrincipalWithNoBorrows() public {
        _deposit(alice, 50 ether);
        uint256 balBefore = alice.balance;
        vm.prank(alice);
        uint256 out = lend.withdraw(50 ether);
        assertEq(out, 50 ether);
        assertEq(alice.balance, balBefore + 50 ether);
        assertEq(lend.totalSupply(), 0);
    }

    function test_BorrowAtTier1MaxLtv() public {
        _deposit(alice, 100 ether);
        // Alice posts her shares as collateral; tier 1 LTV is 65%
        vm.prank(alice);
        lend.borrow(60 ether); // < 65 OK
        assertEq(lend.borrowBalance(alice), 60 ether);
        assertEq(alice.balance, 1_000 ether - 100 ether + 60 ether);
    }

    function test_BorrowAboveLtvReverts() public {
        _deposit(alice, 100 ether);
        vm.prank(alice);
        vm.expectRevert(Errors.Unhealthy.selector);
        lend.borrow(70 ether); // > 65% LTV
    }

    function test_RepayFullClearsDebt() public {
        _deposit(alice, 100 ether);
        vm.prank(alice);
        lend.borrow(50 ether);
        vm.prank(alice);
        lend.repay{value: 50 ether}();
        assertEq(lend.borrowBalance(alice), 0);
    }

    function test_InterestAccruesOverTime() public {
        _deposit(alice, 100 ether);
        vm.prank(alice);
        lend.borrow(50 ether);
        uint256 debt0 = lend.borrowBalance(alice);
        // advance 30 days (block.timestamp is ms on Ritual)
        vm.warp(block.timestamp + 30 * 86_400 * 1000);
        uint256 debt1 = lend.borrowBalance(alice);
        assertGt(debt1, debt0, "debt should grow with time");
    }

    function test_OnTimeRepayBumpsCreditScore() public {
        _deposit(alice, 100 ether);
        uint16 s0 = credit.scoreOf(alice);
        vm.prank(alice);
        lend.borrow(40 ether);
        vm.prank(alice);
        lend.repay{value: 40 ether}();
        uint16 s1 = credit.scoreOf(alice);
        assertEq(s1, s0 + 25, "score should bump by REPAY_DELTA");
    }

    function test_TransferBlockedWhenWouldBecomeUnhealthy() public {
        _deposit(alice, 100 ether);
        vm.prank(alice);
        lend.borrow(50 ether);
        // Alice tries to send most of her collateral away — would leave her unhealthy
        vm.prank(alice);
        vm.expectRevert(Errors.Unhealthy.selector);
        lend.transfer(bob, 90 ether);
    }

    function test_TransferAllowedWhenHealthMaintained() public {
        _deposit(alice, 100 ether);
        vm.prank(alice);
        lend.borrow(10 ether); // tiny debt
        vm.prank(alice);
        bool ok = lend.transfer(bob, 5 ether);
        assertTrue(ok);
    }
}
