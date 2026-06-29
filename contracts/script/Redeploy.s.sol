// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {CreditScore} from "../src/CreditScore.sol";
import {RitualLend} from "../src/RitualLend.sol";
import {IRitualWallet} from "../src/interfaces/IRitualWallet.sol";

/// @notice Redeploys CreditScore (now with registerJob) + RitualLend (because
/// it has CreditScore as immutable). Reuses the existing InterestRateModel.
/// Funds new CreditScore in RitualWallet so it can pay for its own tick() gas,
/// then calls registerJob() — scheduler will call back this contract.
contract Redeploy is Script {
    address constant SCHEDULER     = 0x56e776BAE2DD60664b69Bd5F865F1180ffB7D58B;
    address constant RITUAL_WALLET = 0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948;

    // Reuse existing rate model
    address constant IRM = 0x9E72D7412089390eF18495656ea37CED270B5Fd0;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        uint256 funding = vm.envOr("CREDIT_FUNDING_WEI", uint256(0.05 ether));

        uint32 tickGas    = uint32(vm.envOr("TICK_GAS",          uint256(300_000)));
        uint32 frequency  = uint32(vm.envOr("TICK_FREQUENCY",    uint256(1000)));
        uint32 numCalls   = uint32(vm.envOr("TICK_NUM_CALLS",    uint256(10)));
        uint32 ttl        = uint32(vm.envOr("TICK_TTL",          uint256(100)));
        uint32 startOff   = uint32(vm.envOr("TICK_START_OFFSET", uint256(1000)));
        uint256 maxFee    = vm.envOr("TICK_MAX_FEE_PER_GAS",      uint256(2 gwei));
        uint256 prio      = vm.envOr("TICK_PRIORITY_FEE_PER_GAS", uint256(0));

        vm.startBroadcast(pk);

        CreditScore credit = new CreditScore(SCHEDULER);
        RitualLend lend    = new RitualLend(IRM, address(credit));
        credit.setMarket(address(lend));

        // Fund new CreditScore so its own RitualWallet balance covers tick() gas
        IRitualWallet(RITUAL_WALLET).depositFor{value: funding}(address(credit), 100_000);

        uint32 startBlock = uint32(block.number) + startOff;
        uint256 jobId = credit.registerJob(
            tickGas, startBlock, numCalls, frequency, ttl, maxFee, prio
        );

        vm.stopBroadcast();

        console2.log("CreditScore (new):  ", address(credit));
        console2.log("RitualLend  (new):  ", address(lend));
        console2.log("InterestRateModel:  ", IRM);
        console2.log("Funded (wei):       ", funding);
        console2.log("Scheduler jobId:    ", jobId);
        console2.log("startBlock:         ", startBlock);
        console2.log("numCalls:           ", numCalls);
        console2.log("frequency:          ", frequency);
    }
}
