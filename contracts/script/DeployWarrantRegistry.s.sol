// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {WarrantRegistry} from "../src/WarrantRegistry.sol";

/// @notice Deploys WarrantRegistry. There is exactly one registry per
/// network — warrants for every Safe/module pair on that network live in
/// it, keyed by their own (agenticIdContract, tokenId).
///
/// Run with:
///   forge script script/DeployWarrantRegistry.s.sol \
///     --rpc-url og_testnet --broadcast --private-key $DEPLOYER_KEY
contract DeployWarrantRegistry is Script {
    function run() external returns (address registry) {
        vm.startBroadcast();
        registry = address(new WarrantRegistry());
        vm.stopBroadcast();

        console.log("chainId:", block.chainid);
        console.log("WarrantRegistry:", registry);
        console.log("Record this in deployments/<network>.json under \"warrant\".");
    }
}
