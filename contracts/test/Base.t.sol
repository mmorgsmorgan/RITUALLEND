// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {InterestRateModel} from "../src/InterestRateModel.sol";
import {CreditScore} from "../src/CreditScore.sol";
import {RitualLend} from "../src/RitualLend.sol";

contract Base is Test {
    InterestRateModel internal irm;
    CreditScore internal credit;
    RitualLend internal lend;

    address internal constant SCHEDULER = address(uint160(uint256(keccak256("scheduler"))));

    address internal alice = makeAddr("alice");
    address internal bob   = makeAddr("bob");
    address internal carol = makeAddr("carol");
    address internal liq   = makeAddr("liquidator");

    function setUp() public virtual {
        irm    = new InterestRateModel(0.02e18, 0.10e18, 2.00e18, 0.80e18);
        credit = new CreditScore(SCHEDULER);
        lend   = new RitualLend(address(irm), address(credit));
        credit.setMarket(address(lend));

        vm.deal(alice, 1_000 ether);
        vm.deal(bob,   1_000 ether);
        vm.deal(carol, 1_000 ether);
        vm.deal(liq,   1_000 ether);
    }

    function _deposit(address u, uint256 amt) internal returns (uint256 shares) {
        vm.prank(u);
        shares = lend.deposit{value: amt}();
    }
}
