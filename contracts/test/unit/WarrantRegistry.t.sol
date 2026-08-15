// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {WarrantRegistry} from "../../src/WarrantRegistry.sol";
import {IWarrantRegistry} from "../../src/interfaces/IWarrantRegistry.sol";
import {MockAgenticId} from "../mocks/MockAgenticId.sol";
import {ReentrantAgenticId} from "../mocks/ReentrantAgenticId.sol";

contract WarrantRegistryTest is Test {
    WarrantRegistry registry;
    MockAgenticId agenticId;

    address owner = makeAddr("owner");
    address newOwner = makeAddr("newOwner");
    address module = makeAddr("module");
    address otherModule = makeAddr("otherModule");
    address providerA = makeAddr("providerA");
    address providerB = makeAddr("providerB");
    address stranger = makeAddr("stranger");

    uint256 constant TOKEN_ID = 1;
    uint256 constant MAX_SPEND = 5 ether;

    function setUp() public {
        registry = new WarrantRegistry();
        agenticId = new MockAgenticId();
        agenticId.mint(owner, TOKEN_ID);
        vm.warp(1_000_000);
    }

    function _defaultParams() internal view returns (IWarrantRegistry.WarrantParams memory p) {
        address[] memory providers = new address[](1);
        providers[0] = providerA;
        string[] memory services = new string[](0);
        p = IWarrantRegistry.WarrantParams({
            agenticIdContract: address(agenticId),
            tokenId: TOKEN_ID,
            module: module,
            providers: providers,
            restrictServices: false,
            allowedServices: services,
            maxTotalSpend: MAX_SPEND,
            startTime: uint64(block.timestamp),
            expiry: uint64(block.timestamp + 1 days)
        });
    }

    function _createDefault() internal returns (uint256 id) {
        vm.prank(owner);
        id = registry.createWarrant(_defaultParams());
    }

    // ------------------------------------------------------------------
    // Creation
    // ------------------------------------------------------------------

    function test_createWarrant_succeedsForTokenOwner() public {
        uint256 id = _createDefault();
        IWarrantRegistry.Warrant memory w = registry.getWarrant(id);
        assertEq(w.agenticIdContract, address(agenticId));
        assertEq(w.tokenId, TOKEN_ID);
        assertEq(w.ownerAtCreation, owner);
        assertEq(w.boundModule, module);
        assertEq(w.maxTotalSpend, MAX_SPEND);
        assertTrue(w.active);
        assertEq(w.version, 1);
        assertTrue(registry.isProviderAllowed(id, providerA));
        assertFalse(registry.isProviderAllowed(id, providerB));
    }

    function test_createWarrant_revertsForNonOwner() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(IWarrantRegistry.NotTokenOwner.selector, 0, stranger));
        registry.createWarrant(_defaultParams());
    }

    function test_createWarrant_revertsOnZeroAgenticIdContract() public {
        IWarrantRegistry.WarrantParams memory p = _defaultParams();
        p.agenticIdContract = address(0);
        vm.prank(owner);
        vm.expectRevert(IWarrantRegistry.ZeroAddress.selector);
        registry.createWarrant(p);
    }

    function test_createWarrant_revertsOnZeroModule() public {
        IWarrantRegistry.WarrantParams memory p = _defaultParams();
        p.module = address(0);
        vm.prank(owner);
        vm.expectRevert(IWarrantRegistry.ZeroAddress.selector);
        registry.createWarrant(p);
    }

    function test_createWarrant_revertsOnZeroMaxSpend() public {
        IWarrantRegistry.WarrantParams memory p = _defaultParams();
        p.maxTotalSpend = 0;
        vm.prank(owner);
        vm.expectRevert(IWarrantRegistry.ZeroAmount.selector);
        registry.createWarrant(p);
    }

    function test_createWarrant_revertsOnExpiryBeforeStart() public {
        IWarrantRegistry.WarrantParams memory p = _defaultParams();
        p.expiry = p.startTime;
        vm.prank(owner);
        vm.expectRevert(IWarrantRegistry.InvalidExpiry.selector);
        registry.createWarrant(p);
    }

    function test_createWarrant_revertsOnAlreadyExpiredWindow() public {
        IWarrantRegistry.WarrantParams memory p = _defaultParams();
        p.startTime = 1;
        p.expiry = 2; // in the past relative to warped block.timestamp
        vm.prank(owner);
        vm.expectRevert(IWarrantRegistry.InvalidExpiry.selector);
        registry.createWarrant(p);
    }

    // ------------------------------------------------------------------
    // Spend: happy path + boundary
    // ------------------------------------------------------------------

    function test_recordSpend_allowedProviderValidAmount_succeeds() public {
        uint256 id = _createDefault();
        vm.prank(module);
        uint256 newSpent = registry.recordSpend(id, providerA, "inference", 1 ether, address(0xA6E47));
        assertEq(newSpent, 1 ether);
        assertEq(registry.remainingBudget(id), MAX_SPEND - 1 ether);
    }

    function test_recordSpend_exactRemainingAmount_succeeds() public {
        uint256 id = _createDefault();
        vm.prank(module);
        registry.recordSpend(id, providerA, "inference", MAX_SPEND, address(0xA6E47));
        assertEq(registry.remainingBudget(id), 0);
    }

    function test_recordSpend_subsequentSpendAfterExhaustion_reverts() public {
        uint256 id = _createDefault();
        vm.startPrank(module);
        registry.recordSpend(id, providerA, "inference", MAX_SPEND, address(0xA6E47));
        vm.expectRevert(abi.encodeWithSelector(IWarrantRegistry.BudgetExceeded.selector, id, 1, 0));
        registry.recordSpend(id, providerA, "inference", 1, address(0xA6E47));
        vm.stopPrank();
    }

    function test_recordSpend_amountOverRemaining_reverts() public {
        uint256 id = _createDefault();
        vm.prank(module);
        vm.expectRevert(abi.encodeWithSelector(IWarrantRegistry.BudgetExceeded.selector, id, MAX_SPEND + 1, MAX_SPEND));
        registry.recordSpend(id, providerA, "inference", MAX_SPEND + 1, address(0xA6E47));
    }

    function test_recordSpend_disallowedProvider_reverts() public {
        uint256 id = _createDefault();
        vm.prank(module);
        vm.expectRevert(abi.encodeWithSelector(IWarrantRegistry.ProviderNotAllowed.selector, id, providerB));
        registry.recordSpend(id, providerB, "inference", 1 ether, address(0xA6E47));
    }

    function test_recordSpend_zeroAmount_reverts() public {
        uint256 id = _createDefault();
        vm.prank(module);
        vm.expectRevert(IWarrantRegistry.ZeroAmount.selector);
        registry.recordSpend(id, providerA, "inference", 0, address(0xA6E47));
    }

    function test_recordSpend_callerNotBoundModule_reverts() public {
        uint256 id = _createDefault();
        vm.prank(otherModule);
        vm.expectRevert(abi.encodeWithSelector(IWarrantRegistry.NotBoundModule.selector, id, otherModule));
        registry.recordSpend(id, providerA, "inference", 1 ether, address(0xA6E47));
    }

    function test_recordSpend_nonexistentWarrant_reverts() public {
        vm.prank(module);
        vm.expectRevert(abi.encodeWithSelector(IWarrantRegistry.WarrantNotFound.selector, 999));
        registry.recordSpend(999, providerA, "inference", 1 ether, address(0xA6E47));
    }

    // ------------------------------------------------------------------
    // Time boundaries
    // ------------------------------------------------------------------

    function test_recordSpend_expiredWarrant_reverts() public {
        uint256 id = _createDefault();
        IWarrantRegistry.Warrant memory w = registry.getWarrant(id);
        vm.warp(w.expiry + 1);
        vm.prank(module);
        vm.expectRevert(abi.encodeWithSelector(IWarrantRegistry.WarrantExpired.selector, id, w.expiry, block.timestamp));
        registry.recordSpend(id, providerA, "inference", 1 ether, address(0xA6E47));
    }

    function test_recordSpend_notYetStarted_reverts() public {
        IWarrantRegistry.WarrantParams memory p = _defaultParams();
        p.startTime = uint64(block.timestamp + 1 hours);
        p.expiry = uint64(block.timestamp + 2 hours);
        vm.prank(owner);
        uint256 id = registry.createWarrant(p);

        vm.prank(module);
        vm.expectRevert(
            abi.encodeWithSelector(IWarrantRegistry.WarrantNotYetStarted.selector, id, p.startTime, block.timestamp)
        );
        registry.recordSpend(id, providerA, "inference", 1 ether, address(0xA6E47));
    }

    // ------------------------------------------------------------------
    // Revocation
    // ------------------------------------------------------------------

    function test_revokeWarrant_blocksFutureSpend() public {
        uint256 id = _createDefault();
        vm.prank(owner);
        registry.revokeWarrant(id);

        vm.prank(module);
        vm.expectRevert(abi.encodeWithSelector(IWarrantRegistry.WarrantNotActive.selector, id));
        registry.recordSpend(id, providerA, "inference", 1 ether, address(0xA6E47));
    }

    function test_revokeWarrant_revertsForNonOwner() public {
        uint256 id = _createDefault();
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(IWarrantRegistry.NotTokenOwner.selector, id, stranger));
        registry.revokeWarrant(id);
    }

    // ------------------------------------------------------------------
    // Ownership transfer of the Agentic ID
    // ------------------------------------------------------------------

    function test_previousOwnerCannotUpdateAfterTransfer() public {
        uint256 id = _createDefault();
        vm.prank(owner);
        agenticId.transfer(newOwner, TOKEN_ID);

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(IWarrantRegistry.NotTokenOwner.selector, id, owner));
        registry.setProviderAllowed(id, providerB, true);
    }

    function test_newOwnerCanUpdateAfterTransfer() public {
        uint256 id = _createDefault();
        vm.prank(owner);
        agenticId.transfer(newOwner, TOKEN_ID);

        vm.prank(newOwner);
        registry.setProviderAllowed(id, providerB, true);
        assertTrue(registry.isProviderAllowed(id, providerB));
    }

    function test_warrantGoesStaleImmediatelyAfterTransfer_evenWithoutRevocation() public {
        uint256 id = _createDefault();
        assertFalse(registry.isStale(id));

        vm.prank(owner);
        agenticId.transfer(newOwner, TOKEN_ID);

        assertTrue(registry.isStale(id));
        vm.prank(module);
        vm.expectRevert(abi.encodeWithSelector(IWarrantRegistry.WarrantStale.selector, id, owner, newOwner));
        registry.recordSpend(id, providerA, "inference", 1 ether, address(0xA6E47));
    }

    function test_newOwnerMustCreateFreshWarrant_oldOneStaysStaleForever() public {
        uint256 id = _createDefault();
        vm.prank(owner);
        agenticId.transfer(newOwner, TOKEN_ID);

        // Even after the new owner edits the old warrant's policy, spending
        // against it is still blocked — staleness is about the ownership
        // check inside recordSpend, not about whether anyone has touched
        // the warrant's fields since the transfer.
        vm.prank(newOwner);
        registry.setProviderAllowed(id, providerB, true);

        vm.prank(module);
        vm.expectRevert(abi.encodeWithSelector(IWarrantRegistry.WarrantStale.selector, id, owner, newOwner));
        registry.recordSpend(id, providerB, "inference", 1 ether, address(0xA6E47));
    }

    // ------------------------------------------------------------------
    // Provider / service allowlist management
    // ------------------------------------------------------------------

    function test_setProviderAllowed_addAndRemove() public {
        uint256 id = _createDefault();
        vm.startPrank(owner);
        registry.setProviderAllowed(id, providerB, true);
        assertTrue(registry.isProviderAllowed(id, providerB));
        registry.setProviderAllowed(id, providerB, false);
        assertFalse(registry.isProviderAllowed(id, providerB));
        vm.stopPrank();
    }

    function test_serviceAllowlist_unrestrictedByDefault() public {
        uint256 id = _createDefault();
        assertTrue(registry.isServiceAllowed(id, "anything"));
    }

    function test_serviceAllowlist_restrictsWhenEnabled() public {
        uint256 id = _createDefault();
        vm.startPrank(owner);
        registry.setRestrictServices(id, true);
        registry.setServiceAllowed(id, "inference", true);
        vm.stopPrank();

        assertTrue(registry.isServiceAllowed(id, "inference"));
        assertFalse(registry.isServiceAllowed(id, "fine-tuning"));

        vm.prank(module);
        vm.expectRevert(abi.encodeWithSelector(IWarrantRegistry.ServiceNotAllowed.selector, id, "fine-tuning"));
        registry.recordSpend(id, providerA, "fine-tuning", 1 ether, address(0xA6E47));
    }

    // ------------------------------------------------------------------
    // Budget / expiry updates
    // ------------------------------------------------------------------

    function test_setMaxTotalSpend_revertsBelowAlreadySpent() public {
        uint256 id = _createDefault();
        vm.prank(module);
        registry.recordSpend(id, providerA, "inference", 2 ether, address(0xA6E47));

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(IWarrantRegistry.MaxSpendBelowSpent.selector, 2 ether, 1 ether));
        registry.setMaxTotalSpend(id, 1 ether);
    }

    function test_setExpiry_revertsIfInPastOrBeforeStart() public {
        uint256 id = _createDefault();
        vm.prank(owner);
        vm.expectRevert(IWarrantRegistry.InvalidExpiry.selector);
        registry.setExpiry(id, uint64(block.timestamp - 1));
    }

    function test_everyMutation_bumpsVersion() public {
        uint256 id = _createDefault();
        vm.startPrank(owner);
        registry.setProviderAllowed(id, providerB, true);
        assertEq(registry.getWarrant(id).version, 2);
        registry.setMaxTotalSpend(id, MAX_SPEND + 1 ether);
        assertEq(registry.getWarrant(id).version, 3);
        registry.revokeWarrant(id);
        assertEq(registry.getWarrant(id).version, 4);
        vm.stopPrank();
    }

    // ------------------------------------------------------------------
    // Reentrancy / external-call assumptions
    // ------------------------------------------------------------------

    function test_maliciousAgenticId_cannotReenterThroughOwnerOfCheck() public {
        ReentrantAgenticId evil = new ReentrantAgenticId();
        evil.mint(owner, TOKEN_ID);

        IWarrantRegistry.WarrantParams memory p = _defaultParams();
        p.agenticIdContract = address(evil);
        vm.prank(owner);
        uint256 id = registry.createWarrant(p);

        // Point ownerOf's reentrant attempt at the registry itself, trying
        // to revoke the very warrant being checked mid-call.
        evil.setReentry(address(registry), abi.encodeWithSelector(registry.revokeWarrant.selector, id));

        vm.prank(module);
        // The reentrant call is a STATICCALL context; the attempted state
        // change inside evil.ownerOf() must fail, which this mock treats as
        // a hard revert rather than silently swallowing it.
        vm.expectRevert("reentrant call unexpectedly failed cleanly");
        registry.recordSpend(id, providerA, "inference", 1 ether, address(0xA6E47));

        // Confirm the reentrant attempt truly changed nothing.
        assertTrue(registry.getWarrant(id).active);
    }
}
