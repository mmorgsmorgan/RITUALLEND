// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {InterestRateModel} from "../src/InterestRateModel.sol";
import {CreditScore} from "../src/CreditScore.sol";
import {RitualLend} from "../src/RitualLend.sol";
import {IScheduler} from "../src/interfaces/IScheduler.sol";
import {IRitualWallet} from "../src/interfaces/IRitualWallet.sol";

contract Deploy is Script {
    // Ritual system contracts (mainnet + testnet share these)
    address constant SCHEDULER     = 0x56e776BAE2DD60664b69Bd5F865F1180ffB7D58B;
    address constant RITUAL_WALLET = 0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948;

    // Default rate-model params (kink at 80%, 2% base, 10% slope, 200% jump — annual @ 1e18).
    uint256 constant BASE_RATE_PER_YEAR  = 0.02e18;
    uint256 constant MULTIPLIER_PER_YEAR = 0.10e18;
    uint256 constant JUMP_PER_YEAR       = 2.00e18;
    uint256 constant KINK                = 0.80e18;

    // Scheduler params
    uint32 constant TICK_GAS        = 800_000;
    uint32 constant TICK_FREQUENCY  = 1000;  // every ~5.8 min (350ms blocks)
    uint32 constant TICK_NUM_CALLS  = 9000;  // < 10k lifespan cap
    uint32 constant TICK_TTL        = 100;   // blocks of slack per call
    uint32 constant TICK_START_OFFSET = 50;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        uint256 funding = vm.envOr("SCHEDULER_FUNDING_WEI", uint256(0.5 ether));

        vm.startBroadcast(pk);

        InterestRateModel irm = new InterestRateModel(
            BASE_RATE_PER_YEAR,
            MULTIPLIER_PER_YEAR,
            JUMP_PER_YEAR,
            KINK
        );

        CreditScore credit = new CreditScore(SCHEDULER);
        RitualLend lend = new RitualLend(address(irm), address(credit));
        credit.setMarket(address(lend));

        // Fund the scheduler executor budget for CreditScore.tick()
        if (funding > 0) {
            IRitualWallet(RITUAL_WALLET).depositFor{value: funding}(
                address(credit),
                100_000 // lockDuration in blocks (~10h at 350ms)
            );
        }

        vm.stopBroadcast();

        console2.log("InterestRateModel:", address(irm));
        console2.log("CreditScore:      ", address(credit));
        console2.log("RitualLend:       ", address(lend));
        console2.log("Scheduler funded with (wei):", funding);
        console2.log("Run Schedule.s.sol next to register the tick() job with the Ritual Scheduler.");
    }
}
