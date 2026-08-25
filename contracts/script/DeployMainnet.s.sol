// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {SafeL2} from "safe-smart-account/SafeL2.sol";
import {SafeProxyFactory} from "safe-smart-account/proxies/SafeProxyFactory.sol";
import {Enum} from "safe-smart-account/libraries/Enum.sol";

import {WarrantRegistry} from "../src/WarrantRegistry.sol";
import {WarrantModule} from "../src/WarrantModule.sol";
import {IWarrantRegistry} from "../src/interfaces/IWarrantRegistry.sol";
import {MockAgenticId} from "../test/mocks/MockAgenticId.sol";

/// @notice M6 — production deployment to 0G mainnet. Deploys exactly the
/// M0-M5 audited WarrantRegistry and WarrantModule; reuses 0G mainnet's
/// already-deployed canonical Safe v1.4.1 infrastructure rather than
/// redeploying it (unlike testnet, where no canonical presigned
/// deployment transaction covers Galileo's chain ID). No new contract
/// logic, no changed constructor semantics, no new trust surface.
///
/// Does NOT fund the resulting sub-account or call executeTransfer — 0G
/// mainnet's own MIN_ACCOUNT_BALANCE (3 A0GI) and MIN_TRANSFER_AMOUNT
/// (1 A0GI), verified live before writing this script, exceed the funded
/// deployment wallet's balance. That remains a documented limitation, not
/// something this script works around.
///
/// Run with:
///   PRIVATE_KEY=... forge script script/DeployMainnet.s.sol \
///     --rpc-url og_mainnet --broadcast --legacy --gas-price 4000000000 -vvvv
contract DeployMainnet is Script {
    // Real 0G mainnet infrastructure, independently verified via
    // eth_getCode before this script was written — see
    // docs/m6-mainnet-deployment.md.
    address constant SAFE_SINGLETON = 0x29fcB43b46531BcA003ddC8FCB67FFE91900C762; // canonical Safe v1.4.1, already live on mainnet
    address constant SAFE_PROXY_FACTORY = 0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67; // canonical, already live on mainnet
    address constant LEDGER_MANAGER = 0x2dE54c845Cd948B72D2e32e39586fe89607074E3;
    address constant INFERENCE_SERVING = 0x47340d900bdFec2BD393c626E12ea0656F938d84;

    // A real, already-registered 0G Compute provider on mainnet
    // (InferenceServing.getAllServices, verified live before writing this
    // script — "openai/gpt-oss-20b").
    address constant ALLOWED_PROVIDER = 0x44ba5021daDa2eDc84b4f5FC170b85F7bC51ef64;

    uint256 constant MAX_TOTAL_SPEND = 0.05 ether; // policy cap only — no funds are transferred against it in this script
    uint256 constant WARRANT_DURATION = 7 days;

    function run()
        external
        returns (address registry, address safe, address module, address agenticId, uint256 warrantId)
    {
        uint256 ownerPk = vm.envUint("PRIVATE_KEY");
        address executor = vm.envAddress("EXECUTOR_ADDRESS");
        address owner = vm.addr(ownerPk);

        vm.startBroadcast(ownerPk);

        registry = address(new WarrantRegistry());

        address[] memory owners = new address[](1);
        owners[0] = owner;
        bytes memory initializer = abi.encodeWithSignature(
            "setup(address[],uint256,address,bytes,address,address,uint256,address)",
            owners,
            1,
            address(0),
            bytes(""),
            address(0),
            address(0),
            0,
            payable(address(0))
        );
        safe = address(SafeProxyFactory(SAFE_PROXY_FACTORY).createProxyWithNonce(SAFE_SINGLETON, initializer, block.timestamp));

        module = address(new WarrantModule(safe, LEDGER_MANAGER, registry));

        _execAsOwner(SafeL2(payable(safe)), ownerPk, safe, abi.encodeWithSignature("enableModule(address)", module));

        MockAgenticId mockAgenticId = new MockAgenticId();
        mockAgenticId.mint(owner, 1);
        agenticId = address(mockAgenticId);

        address[] memory providers = new address[](1);
        providers[0] = ALLOWED_PROVIDER;
        string[] memory services = new string[](0);
        warrantId = IWarrantRegistry(registry).createWarrant(
            IWarrantRegistry.WarrantParams({
                agenticIdContract: agenticId,
                tokenId: 1,
                module: module,
                providers: providers,
                restrictServices: false,
                allowedServices: services,
                maxTotalSpend: MAX_TOTAL_SPEND,
                startTime: uint64(block.timestamp),
                expiry: uint64(block.timestamp + WARRANT_DURATION)
            })
        );

        _execAsOwner(
            SafeL2(payable(safe)), ownerPk, module, abi.encodeWithSelector(WarrantModule(module).setExecutor.selector, executor, warrantId)
        );

        vm.stopBroadcast();

        console.log("chainId:", block.chainid);
        console.log("registry:", registry);
        console.log("safe:", safe);
        console.log("module:", module);
        console.log("agenticId:", agenticId);
        console.log("warrantId:", warrantId);
        console.log("owner:", owner);
        console.log("executor:", executor);
        console.log("allowedProvider:", ALLOWED_PROVIDER);
    }

    function _execAsOwner(SafeL2 safeInstance, uint256 ownerPk, address to, bytes memory data) internal {
        uint256 nonce = safeInstance.nonce();
        bytes32 txHash = safeInstance.getTransactionHash(
            to, 0, data, Enum.Operation.Call, 0, 0, 0, address(0), payable(address(0)), nonce
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPk, txHash);
        bytes memory signature = abi.encodePacked(r, s, v);
        bool ok = safeInstance.execTransaction(
            to, 0, data, Enum.Operation.Call, 0, 0, 0, address(0), payable(address(0)), signature
        );
        require(ok, "safe execTransaction failed");
    }
}
