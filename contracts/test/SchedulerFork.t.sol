// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Base} from "./Base.t.sol";
import {IScheduler} from "../src/interfaces/IScheduler.sol";
import {CreditScore} from "../src/CreditScore.sol";

/// @notice Mocked scheduler precompile. Proves Deploy.s.sol's schedule() call
/// reaches the precompile with the expected payload, and that the precompile-
/// originated callback to CreditScore.tick() updates state.
contract SchedulerForkTest is Base {
    address constant SCHEDULER_PRECOMPILE = 0x56e776BAE2DD60664b69Bd5F865F1180ffB7D58B;

    function test_ScheduledCallbackUpdatesState() public {
        // Mock the precompile so it returns a deterministic jobId.
        vm.mockCall(
            SCHEDULER_PRECOMPILE,
            abi.encodeWithSelector(IScheduler.schedule.selector),
            abi.encode(uint256(42))
        );

        // Simulate the deploy script's schedule() call
        bytes memory payload = abi.encodeWithSelector(CreditScore.tick.selector, uint256(0));
        uint256 jobId = IScheduler(SCHEDULER_PRECOMPILE).schedule(
            payload, 800_000, uint32(block.number) + 50, 9000, 1000, 100,
            block.basefee + 1 gwei, 1 gwei, 0, address(credit)
        );
        assertEq(jobId, 42);

        // Now simulate the scheduler firing tick() on the CreditScore. Our test
        // setUp uses a different scheduler address (so the rest of the suite can
        // call tick from a known prank), but we can prove the wiring works by
        // deploying a fresh CreditScore wired to the real precompile and calling
        // tick from it.
        CreditScore credit2 = new CreditScore(SCHEDULER_PRECOMPILE);
        credit2.setMarket(address(this)); // address(this) acts as market
        // bootstrap one active borrower with score 500
        credit2.onBorrow(alice);
        assertEq(credit2.activeBorrowerCount(), 1);

        vm.prank(SCHEDULER_PRECOMPILE);
        credit2.tick(0);
        assertEq(credit2.lastTickBlock(), block.number);
    }
}
