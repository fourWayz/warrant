// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IWarrantRegistry} from "./interfaces/IWarrantRegistry.sol";

/// @title WarrantRegistry
/// @notice Holds spend-authorization policy for AI agents funding 0G Compute
/// providers. A warrant is anchored to an (agenticIdContract, tokenId) pair;
/// authority over it is re-derived from that token's current owner on every
/// call that changes policy, and on every call that spends against it. See
/// docs/warrant-invariants.md for the invariants this contract implements.
///
/// This contract holds no funds and makes no state-changing external call.
/// The only external call it makes is a `view` call to `ownerOf`, which
/// Solidity compiles to STATICCALL — a malicious Agentic ID contract cannot
/// reenter this contract through that call.
contract WarrantRegistry is IWarrantRegistry {
    uint256 private _nextWarrantId = 1;

    mapping(uint256 warrantId => Warrant) private _warrants;
    mapping(uint256 warrantId => mapping(address provider => bool)) private _providerAllowed;
    mapping(uint256 warrantId => bool) private _restrictServices;
    mapping(uint256 warrantId => mapping(bytes32 serviceKey => bool)) private _serviceAllowed;

    modifier onlyTokenOwner(uint256 warrantId) {
        Warrant storage w = _requireWarrant(warrantId);
        if (IERC721(w.agenticIdContract).ownerOf(w.tokenId) != msg.sender) {
            revert NotTokenOwner(warrantId, msg.sender);
        }
        _;
    }

    // ---------------------------------------------------------------------
    // Creation
    // ---------------------------------------------------------------------

    function createWarrant(WarrantParams calldata params) external returns (uint256 warrantId) {
        if (params.agenticIdContract == address(0) || params.module == address(0)) revert ZeroAddress();
        if (params.maxTotalSpend == 0) revert ZeroAmount();
        if (params.expiry <= params.startTime || params.expiry <= block.timestamp) revert InvalidExpiry();

        address owner = IERC721(params.agenticIdContract).ownerOf(params.tokenId);
        // warrantId 0 is used as a sentinel here: no warrant exists yet at
        // the point ownership is checked for a brand new creation.
        if (owner != msg.sender) revert NotTokenOwner(0, msg.sender);

        warrantId = _nextWarrantId++;

        _warrants[warrantId] = Warrant({
            id: warrantId,
            agenticIdContract: params.agenticIdContract,
            tokenId: params.tokenId,
            ownerAtCreation: owner,
            boundModule: params.module,
            maxTotalSpend: params.maxTotalSpend,
            spentAmount: 0,
            startTime: params.startTime,
            expiry: params.expiry,
            active: true,
            version: 1
        });

        for (uint256 i = 0; i < params.providers.length; i++) {
            _providerAllowed[warrantId][params.providers[i]] = true;
            emit WarrantProviderSet(warrantId, params.providers[i], true, 1);
        }

        _restrictServices[warrantId] = params.restrictServices;
        for (uint256 i = 0; i < params.allowedServices.length; i++) {
            bytes32 key = _serviceKey(params.allowedServices[i]);
            _serviceAllowed[warrantId][key] = true;
            emit WarrantServiceSet(warrantId, key, params.allowedServices[i], true, 1);
        }

        emit WarrantCreated(
            warrantId,
            params.agenticIdContract,
            params.tokenId,
            owner,
            params.module,
            params.maxTotalSpend,
            params.startTime,
            params.expiry
        );
    }

    // ---------------------------------------------------------------------
    // Policy mutation — every path re-checks live token ownership (I1)
    // ---------------------------------------------------------------------

    function setProviderAllowed(uint256 warrantId, address provider, bool allowed) external onlyTokenOwner(warrantId) {
        Warrant storage w = _warrants[warrantId];
        _providerAllowed[warrantId][provider] = allowed;
        w.version += 1;
        emit WarrantProviderSet(warrantId, provider, allowed, w.version);
    }

    function setServiceAllowed(uint256 warrantId, string calldata serviceName, bool allowed)
        external
        onlyTokenOwner(warrantId)
    {
        Warrant storage w = _warrants[warrantId];
        bytes32 key = _serviceKey(serviceName);
        _serviceAllowed[warrantId][key] = allowed;
        w.version += 1;
        emit WarrantServiceSet(warrantId, key, serviceName, allowed, w.version);
    }

    function setRestrictServices(uint256 warrantId, bool restrict) external onlyTokenOwner(warrantId) {
        Warrant storage w = _warrants[warrantId];
        _restrictServices[warrantId] = restrict;
        w.version += 1;
        emit WarrantServiceRestrictionSet(warrantId, restrict, w.version);
    }

    function setMaxTotalSpend(uint256 warrantId, uint256 newMax) external onlyTokenOwner(warrantId) {
        Warrant storage w = _warrants[warrantId];
        if (newMax < w.spentAmount) revert MaxSpendBelowSpent(w.spentAmount, newMax);
        uint256 old = w.maxTotalSpend;
        w.maxTotalSpend = newMax;
        w.version += 1;
        emit WarrantMaxSpendUpdated(warrantId, old, newMax, w.version);
    }

    function setExpiry(uint256 warrantId, uint64 newExpiry) external onlyTokenOwner(warrantId) {
        Warrant storage w = _warrants[warrantId];
        if (newExpiry <= block.timestamp || newExpiry <= w.startTime) revert InvalidExpiry();
        uint64 old = w.expiry;
        w.expiry = newExpiry;
        w.version += 1;
        emit WarrantExpiryUpdated(warrantId, old, newExpiry, w.version);
    }

    function revokeWarrant(uint256 warrantId) external onlyTokenOwner(warrantId) {
        Warrant storage w = _warrants[warrantId];
        w.active = false;
        w.version += 1;
        emit WarrantRevoked(warrantId, msg.sender, w.version);
    }

    // ---------------------------------------------------------------------
    // Spend accounting — the entire enforcement core (I2, I3, I4, I5, I6, I7)
    // ---------------------------------------------------------------------

    function recordSpend(
        uint256 warrantId,
        address provider,
        string calldata serviceName,
        uint256 amount,
        address spender
    ) external returns (uint256 newSpentAmount) {
        Warrant storage w = _requireWarrant(warrantId);

        if (msg.sender != w.boundModule) revert NotBoundModule(warrantId, msg.sender);
        if (!w.active) revert WarrantNotActive(warrantId);
        if (block.timestamp < w.startTime) revert WarrantNotYetStarted(warrantId, w.startTime, block.timestamp);
        if (block.timestamp > w.expiry) revert WarrantExpired(warrantId, w.expiry, block.timestamp);

        address currentOwner = IERC721(w.agenticIdContract).ownerOf(w.tokenId);
        if (currentOwner != w.ownerAtCreation) revert WarrantStale(warrantId, w.ownerAtCreation, currentOwner);

        if (amount == 0) revert ZeroAmount();
        if (!_providerAllowed[warrantId][provider]) revert ProviderNotAllowed(warrantId, provider);
        if (_restrictServices[warrantId] && !_serviceAllowed[warrantId][_serviceKey(serviceName)]) {
            revert ServiceNotAllowed(warrantId, serviceName);
        }

        newSpentAmount = w.spentAmount + amount;
        if (newSpentAmount > w.maxTotalSpend) {
            revert BudgetExceeded(warrantId, amount, w.maxTotalSpend - w.spentAmount);
        }

        w.spentAmount = newSpentAmount;
        emit SpendRecorded(warrantId, provider, serviceName, amount, newSpentAmount, spender);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function getWarrant(uint256 warrantId) external view returns (Warrant memory) {
        return _requireWarrant(warrantId);
    }

    function isProviderAllowed(uint256 warrantId, address provider) external view returns (bool) {
        return _providerAllowed[warrantId][provider];
    }

    function isServiceAllowed(uint256 warrantId, string calldata serviceName) external view returns (bool) {
        if (!_restrictServices[warrantId]) return true;
        return _serviceAllowed[warrantId][_serviceKey(serviceName)];
    }

    function remainingBudget(uint256 warrantId) external view returns (uint256) {
        Warrant storage w = _requireWarrant(warrantId);
        return w.maxTotalSpend - w.spentAmount;
    }

    function isStale(uint256 warrantId) external view returns (bool) {
        Warrant storage w = _requireWarrant(warrantId);
        return IERC721(w.agenticIdContract).ownerOf(w.tokenId) != w.ownerAtCreation;
    }

    // ---------------------------------------------------------------------
    // Internal
    // ---------------------------------------------------------------------

    function _requireWarrant(uint256 warrantId) private view returns (Warrant storage w) {
        w = _warrants[warrantId];
        if (w.agenticIdContract == address(0)) revert WarrantNotFound(warrantId);
    }

    function _serviceKey(string calldata serviceName) private pure returns (bytes32) {
        return keccak256(bytes(serviceName));
    }
}
