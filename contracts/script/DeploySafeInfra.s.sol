// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {SafeL2} from "safe-smart-account/SafeL2.sol";
import {SafeProxyFactory} from "safe-smart-account/proxies/SafeProxyFactory.sol";

/// @notice Deploys a real, unmodified Safe v1.4.1 singleton and proxy
/// factory to whatever network this script is run against.
///
/// This deploys with our own key via plain CREATE, not through the shared
/// keyless singleton-factory trick every other chain uses — that trick
/// requires a chain-ID-specific presigned transaction that does not yet
/// exist for 0G's chain IDs. The resulting addresses will not match the
/// canonical addresses already live on 0G mainnet; they are recorded in
/// deployments/<network>.json instead of assumed.
///
/// Run with:
///   forge script script/DeploySafeInfra.s.sol \
///     --rpc-url og_testnet --broadcast --private-key $DEPLOYER_KEY
contract DeploySafeInfra is Script {
    function run() external returns (address singleton, address proxyFactory) {
        vm.startBroadcast();
        singleton = address(new SafeL2());
        proxyFactory = address(new SafeProxyFactory());
        vm.stopBroadcast();

        console.log("chainId:", block.chainid);
        console.log("SafeL2 singleton:", singleton);
        console.log("SafeProxyFactory:", proxyFactory);
        console.log("Record these in deployments/<network>.json under \"safe\".");
    }
}
