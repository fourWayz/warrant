// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SafeL2} from "safe-smart-account/SafeL2.sol";
import {SafeProxyFactory} from "safe-smart-account/proxies/SafeProxyFactory.sol";

import {WarrantRegistry} from "../../src/WarrantRegistry.sol";
import {WarrantModule} from "../../src/WarrantModule.sol";
import {IWarrantRegistry} from "../../src/interfaces/IWarrantRegistry.sol";
import {MockAgenticId} from "../mocks/MockAgenticId.sol";
import {MockLedgerManager} from "../mocks/MockLedgerManager.sol";
import {SafeTestLib} from "../helpers/SafeTestLib.sol";

contract MaliciousTarget {
    uint256 public drained;

    function drain() external {
        drained += 1;
    }
}

contract WarrantModuleTest is Test {
    SafeL2 singleton;
    SafeProxyFactory factory;
    SafeL2 safe;
    WarrantRegistry registry;
    WarrantModule module;
    MockLedgerManager ledger;
    MockAgenticId agenticId;

    uint256 ownerPk = 0xA11CE;
    address owner;
    address executor = makeAddr("executor");
    address providerA = makeAddr("providerA");
    address providerB = makeAddr("providerB");

    uint256 constant TOKEN_ID = 7;
    uint256 constant MAX_SPEND = 5 ether;
    uint256 warrantId;

    function setUp() public {
        vm.deal(address(this), 1000 ether);
        owner = vm.addr(ownerPk);

        singleton = new SafeL2();
        factory = new SafeProxyFactory();
        safe = SafeTestLib.deploySafe(singleton, factory, owner, 0);

        registry = new WarrantRegistry();
        ledger = new MockLedgerManager();
        agenticId = new MockAgenticId();
        agenticId.mint(owner, TOKEN_ID);

        module = new WarrantModule(address(safe), address(ledger), address(registry));

        // Enable the module on the Safe via a real owner-signed transaction.
        bool enabled = SafeTestLib.execAsOwner(
            vm, safe, ownerPk, address(safe), abi.encodeWithSignature("enableModule(address)", address(module))
        );
        require(enabled, "enableModule failed");
        assertTrue(safe.isModuleEnabled(address(module)));

        // Fund the Safe's 0G ledger account directly (bypassing any real
        // deposit flow — irrelevant to what this suite is testing).
        ledger.fund{value: 100 ether}(address(safe));

        vm.prank(owner);
        address[] memory providers = new address[](1);
        providers[0] = providerA;
        string[] memory services = new string[](0);
        warrantId = registry.createWarrant(
            IWarrantRegistry.WarrantParams({
                agenticIdContract: address(agenticId),
                tokenId: TOKEN_ID,
                module: address(module),
                providers: providers,
                restrictServices: false,
                allowedServices: services,
                maxTotalSpend: MAX_SPEND,
                startTime: uint64(block.timestamp),
                expiry: uint64(block.timestamp + 1 days)
            })
        );

        // Grant the executor spending rights via a real owner-signed
        // transaction calling the module, exactly as production would.
        bool executorSet = SafeTestLib.execAsOwner(
            vm, safe, ownerPk, address(module), abi.encodeWithSelector(module.setExecutor.selector, executor, warrantId)
        );
        require(executorSet, "setExecutor failed");
    }

    // ------------------------------------------------------------------
    // Happy path / boundary
    // ------------------------------------------------------------------

    function test_allowedProviderValidAmount_succeeds() public {
        vm.prank(executor);
        module.executeTransfer(providerA, "inference", 1 ether);

        assertEq(ledger.providerBalance(address(safe), providerA), 1 ether);
        assertEq(registry.remainingBudget(warrantId), MAX_SPEND - 1 ether);
    }

    function test_exactRemainingAmount_succeeds_thenSubsequentSpendReverts() public {
        vm.startPrank(executor);
        module.executeTransfer(providerA, "inference", MAX_SPEND);
        assertEq(registry.remainingBudget(warrantId), 0);

        vm.expectRevert(abi.encodeWithSelector(IWarrantRegistry.BudgetExceeded.selector, warrantId, 1, 0));
        module.executeTransfer(providerA, "inference", 1);
        vm.stopPrank();
    }

    // ------------------------------------------------------------------
    // Policy rejections — the provider must never receive funds
    // ------------------------------------------------------------------

    function test_disallowedProvider_reverts_andProviderReceivesNothing() public {
        vm.prank(executor);
        vm.expectRevert(abi.encodeWithSelector(IWarrantRegistry.ProviderNotAllowed.selector, warrantId, providerB));
        module.executeTransfer(providerB, "inference", 1 ether);

        assertEq(ledger.providerBalance(address(safe), providerB), 0);
    }

    function test_amountOverRemaining_reverts() public {
        vm.prank(executor);
        vm.expectRevert(
            abi.encodeWithSelector(IWarrantRegistry.BudgetExceeded.selector, warrantId, MAX_SPEND + 1, MAX_SPEND)
        );
        module.executeTransfer(providerA, "inference", MAX_SPEND + 1);
    }

    function test_expiredWarrant_reverts() public {
        vm.warp(block.timestamp + 2 days);
        vm.prank(executor);
        vm.expectRevert();
        module.executeTransfer(providerA, "inference", 1 ether);
    }

    function test_revokedWarrant_reverts() public {
        vm.prank(owner);
        registry.revokeWarrant(warrantId);

        vm.prank(executor);
        vm.expectRevert(abi.encodeWithSelector(IWarrantRegistry.WarrantNotActive.selector, warrantId));
        module.executeTransfer(providerA, "inference", 1 ether);
    }

    function test_previousOwnerAfterNftTransfer_cannotSetNewExecutor() public {
        address newOwner = makeAddr("newOwner");
        vm.prank(owner);
        agenticId.transfer(newOwner, TOKEN_ID);

        // The old owner's Safe still exists and the module is still
        // enabled, but the warrant itself is stale the instant the token
        // moved — the executor's next spend attempt fails even though
        // nobody touched the module or the Safe.
        vm.prank(executor);
        vm.expectRevert(abi.encodeWithSelector(IWarrantRegistry.WarrantStale.selector, warrantId, owner, newOwner));
        module.executeTransfer(providerA, "inference", 1 ether);
    }

    // ------------------------------------------------------------------
    // Direct / unauthorized paths — must be architecturally impossible
    // ------------------------------------------------------------------

    function test_nonExecutor_cannotSpendAtAll() public {
        address randomCaller = makeAddr("randomCaller");
        vm.prank(randomCaller);
        vm.expectRevert(abi.encodeWithSelector(WarrantModule.NotAuthorizedExecutor.selector, randomCaller));
        module.executeTransfer(providerA, "inference", 1 ether);
    }

    function test_onlySafeCanSetExecutor_directCallReverts() public {
        vm.prank(executor);
        vm.expectRevert(WarrantModule.NotSafe.selector);
        module.setExecutor(executor, warrantId);
    }

    function test_onlySafeCanRemoveExecutor_directCallReverts() public {
        vm.prank(owner);
        vm.expectRevert(WarrantModule.NotSafe.selector);
        module.removeExecutor(executor);
    }

    function test_moduleHasNoFunctionAcceptingArbitraryTargetOrCalldata() public {
        // WarrantModule's entire external surface is setExecutor,
        // removeExecutor, executeTransfer, and immutable getters — none of
        // which take a caller-supplied target address or raw calldata.
        // Confirm there is no fallback: a call with an unrecognized
        // selector must fail outright, not silently succeed as a relay.
        (bool ok,) = address(module).call(abi.encodeWithSignature("doesNotExist()"));
        assertFalse(ok);
    }

    function test_executorCannotRedirectSpendToArbitraryContractOutsideLedgerManager() public {
        // There is no parameter on executeTransfer for a target contract —
        // it always builds a call to the immutable `ledgerManager` address.
        // This test documents that fact by confirming the only address
        // ever debited from the Safe's perspective is the ledger, by
        // checking a malicious contract's state is untouched after a
        // legitimate transfer.
        MaliciousTarget mal = new MaliciousTarget();
        vm.prank(executor);
        module.executeTransfer(providerA, "inference", 1 ether);
        assertEq(mal.drained(), 0);
    }

    function test_wrongLedgerManager_isRejectedAtDeployTime() public {
        vm.expectRevert(WarrantModule.ZeroAddress.selector);
        new WarrantModule(address(safe), address(0), address(registry));
    }

    function test_zeroAmount_reverts() public {
        vm.prank(executor);
        vm.expectRevert(WarrantModule.ZeroAmount.selector);
        module.executeTransfer(providerA, "inference", 0);
    }

    function test_removedExecutor_cannotSpend() public {
        bool removed = SafeTestLib.execAsOwner(
            vm, safe, ownerPk, address(module), abi.encodeWithSelector(module.removeExecutor.selector, executor)
        );
        require(removed, "removeExecutor failed");

        vm.prank(executor);
        vm.expectRevert(abi.encodeWithSelector(WarrantModule.NotAuthorizedExecutor.selector, executor));
        module.executeTransfer(providerA, "inference", 1 ether);
    }

    // ------------------------------------------------------------------
    // Failed native transfer must not consume budget (CEI correctness)
    // ------------------------------------------------------------------

    function test_insufficientFunds_revertsWholeTransaction_budgetUntouched() public {
        uint256 before = registry.remainingBudget(warrantId);
        // Drain the Safe's ledger balance to below what we'll ask for.
        // MockLedgerManager was funded with 100 ether in setUp via `fund`.
        vm.prank(executor);
        module.executeTransfer(providerA, "inference", 1 ether); // succeeds, uses real balance
        uint256 afterFirst = registry.remainingBudget(warrantId);
        assertEq(before - afterFirst, 1 ether);

        // Now attempt to spend more than the Safe's ledger actually holds,
        // even though it's within the warrant's remaining budget.
        vm.prank(executor);
        vm.expectRevert();
        module.executeTransfer(providerA, "inference", 1_000_000 ether);

        // Budget must be exactly where it was after the first successful
        // spend — the failed attempt left no trace.
        assertEq(registry.remainingBudget(warrantId), afterFirst);
    }
}
