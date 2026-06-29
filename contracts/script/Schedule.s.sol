// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {CreditScore} from "../src/CreditScore.sol";
import {SchedulerRegistrar} from "../src/SchedulerRegistrar.sol";
import {IRitualWallet} from "../src/interfaces/IRitualWallet.sol";

/// @notice Deploys SchedulerRegistrar, funds it via RitualWallet, and registers
/// the periodic CreditScore.tick() job. The Scheduler requires msg.sender ==
/// payer (or payer.approveScheduler(caller) — not exposed by CreditScore), so
/// the Registrar is both the caller and the payer.
contract ScheduleTick is Script {
    address constant RITUAL_WALLET = 0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address creditAddr = vm.envAddress("CREDIT_SCORE_ADDRESS");
        address registrarAddr = vm.envOr("REGISTRAR_ADDRESS", address(0));
        uint256 registrarFunding = vm.envOr("REGISTRAR_FUNDING_WEI", uint256(0.05 ether));

        uint32 tickGas      = uint32(vm.envOr("TICK_GAS",          uint256(800_000)));
        uint32 frequency    = uint32(vm.envOr("TICK_FREQUENCY",    uint256(1000)));
        uint32 numCalls     = uint32(vm.envOr("TICK_NUM_CALLS",    uint256(50)));
        uint32 ttl          = uint32(vm.envOr("TICK_TTL",          uint256(100)));
        uint32 startOff     = uint32(vm.envOr("TICK_START_OFFSET", uint256(20)));
        uint256 maxFee      = vm.envOr("TICK_MAX_FEE_PER_GAS",      uint256(2 gwei));
        uint256 prio        = vm.envOr("TICK_PRIORITY_FEE_PER_GAS", uint256(1 gwei));

        vm.startBroadcast(pk);

        SchedulerRegistrar registrar;
        if (registrarAddr == address(0)) {
            registrar = new SchedulerRegistrar();
            console2.log("SchedulerRegistrar deployed:", address(registrar));
        } else {
            registrar = SchedulerRegistrar(registrarAddr);
            console2.log("Reusing SchedulerRegistrar at:", registrarAddr);
        }

        if (registrarFunding > 0) {
            IRitualWallet(RITUAL_WALLET).depositFor{value: registrarFunding}(
                address(registrar),
                100_000
            );
            console2.log("Funded Registrar in RitualWallet (wei):", registrarFunding);
        }

        CreditScore credit = CreditScore(creditAddr);
        bytes memory payload = abi.encodeWithSelector(CreditScore.tick.selector, uint256(0));
        uint32 startBlock = uint32(block.number) + startOff;

        uint256 jobId = registrar.register(
            payload,
            tickGas,
            startBlock,
            numCalls,
            frequency,
            ttl,
            maxFee,
            prio
        );

        credit.setJobId(jobId);

        vm.stopBroadcast();

        console2.log("Scheduler jobId:", jobId);
        console2.log("startBlock:     ", startBlock);
        console2.log("numCalls:       ", numCalls);
        console2.log("frequency:      ", frequency);
    }
}
