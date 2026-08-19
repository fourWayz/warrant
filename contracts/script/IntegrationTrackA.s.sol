// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {SafeL2} from "safe-smart-account/SafeL2.sol";
import {SafeProxyFactory} from "safe-smart-account/proxies/SafeProxyFactory.sol";
import {Enum} from "safe-smart-account/libraries/Enum.sol";

import {WarrantModule} from "../src/WarrantModule.sol";
import {IWarrantRegistry} from "../src/interfaces/IWarrantRegistry.sol";
import {ILedgerManager} from "../src/interfaces/ILedgerManager.sol";
import {MockAgenticId} from "../test/mocks/MockAgenticId.sol";

/// @notice Track A — the Warrant-controlled path, run for real against 0G
/// Galileo's actual LedgerManager/InferenceServing and the Safe v1.4.1
/// infrastructure deployed in M0. Deploys a fresh Safe + WarrantModule,
/// creates a warrant, funds the Safe's real ledger account, and executes
/// one Warrant-authorized transfer into a real, already-registered 0G
/// Compute provider's sub-account.
///
/// Negative-path reverts (disallowed provider, over-budget, post-revocation)
/// are deliberately NOT in this script — a reverting call inside a forge
/// script aborts the whole broadcast. They're run as separate `cast send`
/// calls afterward, against the addresses this script prints, so each
/// revert is its own independently observable on-chain transaction.
///
/// Run with:
///   OWNER_KEY=... EXECUTOR_KEY=... forge script script/IntegrationTrackA.s.sol \
///     --rpc-url og_testnet --broadcast -vvvv
contract IntegrationTrackA is Script {
    address constant LEDGER_MANAGER = 0xE70830508dAc0A97e6c087c75f402f9Be669E406;
    address constant SAFE_SINGLETON = 0x8960dC2b415301C8CeE84109F46FcD134A6050A9;
    address constant SAFE_PROXY_FACTORY = 0xdcE5c441ea62c7A0aFd90D48083e9B7617f3DA08;
    address constant WARRANT_REGISTRY = 0xbd245E37b938D459C08f1c1f6F26028FDd8A98eD;

    // A real, already-registered 0G Compute provider on Galileo testnet
    // (InferenceServing.getAllServices, verified live before writing this
    // script — not assumed).
    address constant ALLOWED_PROVIDER = 0x87a13337F0d4B2b08cce9189DBE9555690828ed4;
    string constant SERVICE_NAME = "inference-v1.0"; // confirmed via getServiceAddressByName; "inference" alone reverts

    uint256 constant DEPOSIT_AMOUNT = 0.1 ether; // == live MIN_ACCOUNT_BALANCE, confirmed via eth_call
    uint256 constant TRANSFER_AMOUNT = 0.01 ether; // == live MIN_TRANSFER_AMOUNT, confirmed via eth_call
    uint256 constant MAX_TOTAL_SPEND = 0.05 ether;

    function run() external {
        uint256 ownerPk = vm.envUint("OWNER_KEY");
        uint256 executorPk = vm.envUint("EXECUTOR_KEY");
        address owner = vm.addr(ownerPk);
        address executor = vm.addr(executorPk);

        vm.startBroadcast(ownerPk);

        MockAgenticId agenticId = new MockAgenticId();
        agenticId.mint(owner, 1);

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
        SafeL2 safe = SafeL2(
            payable(address(SafeProxyFactory(SAFE_PROXY_FACTORY).createProxyWithNonce(SAFE_SINGLETON, initializer, block.timestamp)))
        );

        WarrantModule module = new WarrantModule(address(safe), LEDGER_MANAGER, WARRANT_REGISTRY);

        _execAsOwner(safe, ownerPk, address(safe), abi.encodeWithSignature("enableModule(address)", address(module)));

        address[] memory providers = new address[](1);
        providers[0] = ALLOWED_PROVIDER;
        string[] memory services = new string[](0);
        uint256 warrantId = IWarrantRegistry(WARRANT_REGISTRY).createWarrant(
            IWarrantRegistry.WarrantParams({
                agenticIdContract: address(agenticId),
                tokenId: 1,
                module: address(module),
                providers: providers,
                restrictServices: false,
                allowedServices: services,
                maxTotalSpend: MAX_TOTAL_SPEND,
                startTime: uint64(block.timestamp),
                expiry: uint64(block.timestamp + 1 days)
            })
        );

        _execAsOwner(
            safe, ownerPk, address(module), abi.encodeWithSelector(module.setExecutor.selector, executor, warrantId)
        );

        ILedgerManager(LEDGER_MANAGER).depositFundFor{value: DEPOSIT_AMOUNT}(address(safe));

        vm.stopBroadcast();

        vm.startBroadcast(executorPk);
        module.executeTransfer(ALLOWED_PROVIDER, SERVICE_NAME, TRANSFER_AMOUNT);
        vm.stopBroadcast();

        console.log("agenticId:", address(agenticId));
        console.log("safe:", address(safe));
        console.log("module:", address(module));
        console.log("warrantId:", warrantId);
        console.log("owner:", owner);
        console.log("executor:", executor);
        console.log("allowedProvider:", ALLOWED_PROVIDER);
        console.log("serviceName:", SERVICE_NAME);
    }

    function _execAsOwner(SafeL2 safe, uint256 ownerPk, address to, bytes memory data) internal {
        uint256 nonce = safe.nonce();
        bytes32 txHash =
            safe.getTransactionHash(to, 0, data, Enum.Operation.Call, 0, 0, 0, address(0), payable(address(0)), nonce);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPk, txHash);
        bytes memory signature = abi.encodePacked(r, s, v);
        bool ok = safe.execTransaction(to, 0, data, Enum.Operation.Call, 0, 0, 0, address(0), payable(address(0)), signature);
        require(ok, "safe execTransaction failed");
    }
}
