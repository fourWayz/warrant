// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {WarrantRegistry} from "../../src/WarrantRegistry.sol";
import {IWarrantRegistry} from "../../src/interfaces/IWarrantRegistry.sol";
import {MockAgenticId} from "../mocks/MockAgenticId.sol";

/// @notice Drives randomized sequences of warrant creation, policy edits,
/// spends, revocation, and Agentic ID ownership transfers against a real
/// WarrantRegistry, acting as the "bound module" itself so no Safe/module
/// scaffolding is needed to stress the registry's own accounting and
/// policy invariants. WarrantModule's own narrower guarantees (no
/// arbitrary target/calldata) are already covered by WarrantModule.t.sol's
/// example-based tests — this handler is scoped to what only randomized
/// exploration adds value to: the registry's bookkeeping.
contract WarrantRegistryHandler is Test {
    WarrantRegistry public immutable registry;
    MockAgenticId public immutable agenticId;

    uint256[] public warrantIds;
    mapping(uint256 => bool) public everCreated;
    // Every warrantId this handler has ever seen SpendRecorded exceed its
    // maxTotalSpend for, or a spend accepted outside policy — should stay
    // empty for the invariant to hold. Recorded here instead of only
    // asserted in the invariant contract so a violation is easy to find
    // even if the invariant runner samples state at an inconvenient time.
    uint256[] public violations;

    uint256 constant NUM_OWNERS = 3;
    uint256 constant NUM_PROVIDERS = 3;

    constructor(WarrantRegistry _registry, MockAgenticId _agenticId) {
        registry = _registry;
        agenticId = _agenticId;
        for (uint256 i = 0; i < NUM_OWNERS; i++) {
            agenticId.mint(_ownerAddr(i), i + 1);
        }
    }

    function warrantIdsLength() external view returns (uint256) {
        return warrantIds.length;
    }

    function violationsLength() external view returns (uint256) {
        return violations.length;
    }

    function _ownerAddr(uint256 seed) internal pure returns (address) {
        return address(uint160(uint256(keccak256(abi.encode("owner", seed % NUM_OWNERS)))));
    }

    function _providerAddr(uint256 seed) internal pure returns (address) {
        return address(uint160(uint256(keccak256(abi.encode("provider", seed % NUM_PROVIDERS)))));
    }

    function createWarrant(uint256 tokenSeed, uint256 maxSpend, uint256 durationSeed, uint256 providerSeed) external {
        uint256 tokenId = (tokenSeed % NUM_OWNERS) + 1;
        address owner = agenticId.ownerOf(tokenId);
        maxSpend = bound(maxSpend, 1, 1000 ether);
        uint64 duration = uint64(bound(durationSeed, 1, 365 days));

        address[] memory providers = new address[](1);
        providers[0] = _providerAddr(providerSeed);
        string[] memory services = new string[](0);

        IWarrantRegistry.WarrantParams memory params = IWarrantRegistry.WarrantParams({
            agenticIdContract: address(agenticId),
            tokenId: tokenId,
            module: address(this),
            providers: providers,
            restrictServices: false,
            allowedServices: services,
            maxTotalSpend: maxSpend,
            startTime: uint64(block.timestamp),
            expiry: uint64(block.timestamp) + duration
        });

        vm.prank(owner);
        uint256 id = registry.createWarrant(params);
        warrantIds.push(id);
        everCreated[id] = true;
    }

    function setProviderAllowed(uint256 idSeed, uint256 providerSeed, bool allowed) external {
        if (warrantIds.length == 0) return;
        uint256 id = warrantIds[idSeed % warrantIds.length];
        IWarrantRegistry.Warrant memory w = registry.getWarrant(id);
        address owner = _currentOwnerOrZero(w);
        if (owner == address(0)) return;
        vm.prank(owner);
        try registry.setProviderAllowed(id, _providerAddr(providerSeed), allowed) {} catch {}
    }

    function setMaxTotalSpend(uint256 idSeed, uint256 newMax) external {
        if (warrantIds.length == 0) return;
        uint256 id = warrantIds[idSeed % warrantIds.length];
        IWarrantRegistry.Warrant memory w = registry.getWarrant(id);
        address owner = _currentOwnerOrZero(w);
        if (owner == address(0)) return;
        newMax = bound(newMax, 0, 1_000_000 ether);
        vm.prank(owner);
        try registry.setMaxTotalSpend(id, newMax) {} catch {}
    }

    function revokeWarrant(uint256 idSeed) external {
        if (warrantIds.length == 0) return;
        uint256 id = warrantIds[idSeed % warrantIds.length];
        IWarrantRegistry.Warrant memory w = registry.getWarrant(id);
        address owner = _currentOwnerOrZero(w);
        if (owner == address(0)) return;
        vm.prank(owner);
        try registry.revokeWarrant(id) {} catch {}
    }

    function transferAgenticIdOwnership(uint256 tokenSeed, uint256 newOwnerSeed) external {
        uint256 tokenId = (tokenSeed % NUM_OWNERS) + 1;
        address current = agenticId.ownerOf(tokenId);
        address newOwner = _ownerAddr(newOwnerSeed);
        vm.prank(current);
        agenticId.transfer(newOwner, tokenId);
    }

    function warp(uint256 secondsSeed) external {
        vm.warp(block.timestamp + bound(secondsSeed, 0, 30 days));
    }

    /// @notice Attempts a spend as the bound "module" (this contract). This
    /// is the one call the invariant actually cares about stressing: does
    /// recordSpend ever let spentAmount exceed maxTotalSpend, ever let a
    /// disallowed provider through, ever let a spend succeed after
    /// revocation/expiry/ownership change?
    function recordSpend(uint256 idSeed, uint256 providerSeed, uint256 amount) external {
        if (warrantIds.length == 0) return;
        uint256 id = warrantIds[idSeed % warrantIds.length];
        amount = bound(amount, 1, 100 ether);
        address provider = _providerAddr(providerSeed);

        IWarrantRegistry.Warrant memory before = registry.getWarrant(id);

        try registry.recordSpend(id, provider, "inference-v1.0", amount, address(this)) returns (uint256 newSpent) {
            // The call succeeded — independently re-check every policy
            // condition that should have been required for that to be
            // legitimate, rather than trusting the contract's own success.
            bool providerWasAllowed = registry.isProviderAllowed(id, provider);
            bool wasActive = before.active;
            bool wasWithinWindow = block.timestamp >= before.startTime && block.timestamp <= before.expiry;
            bool ownerUnchanged = _safeOwnerOf(before.agenticIdContract, before.tokenId) == before.ownerAtCreation;
            bool withinBudget = newSpent <= before.maxTotalSpend;

            if (!providerWasAllowed || !wasActive || !wasWithinWindow || !ownerUnchanged || !withinBudget) {
                violations.push(id);
            }
        } catch {
            // Expected for most random inputs (wrong provider, expired,
            // revoked, over budget) — the interesting case is a spend that
            // *shouldn't* have succeeded but did, which is caught above.
        }
    }

    function _currentOwnerOrZero(IWarrantRegistry.Warrant memory w) internal view returns (address) {
        try MockAgenticId(w.agenticIdContract).ownerOf(w.tokenId) returns (address o) {
            return o;
        } catch {
            return address(0);
        }
    }

    function _safeOwnerOf(address token, uint256 tokenId) internal view returns (address) {
        try MockAgenticId(token).ownerOf(tokenId) returns (address o) {
            return o;
        } catch {
            return address(0);
        }
    }
}
