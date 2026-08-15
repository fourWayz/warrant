// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Frozen policy interface for WarrantRegistry. See
/// docs/warrant-invariants.md for the invariants this interface is bound by.
interface IWarrantRegistry {
    struct Warrant {
        uint256 id;
        address agenticIdContract;
        uint256 tokenId;
        address ownerAtCreation;
        address boundModule;
        uint256 maxTotalSpend;
        uint256 spentAmount;
        uint64 startTime;
        uint64 expiry;
        bool active;
        uint32 version;
    }

    struct WarrantParams {
        address agenticIdContract;
        uint256 tokenId;
        address module;
        address[] providers;
        bool restrictServices;
        string[] allowedServices;
        uint256 maxTotalSpend;
        uint64 startTime;
        uint64 expiry;
    }

    event WarrantCreated(
        uint256 indexed warrantId,
        address indexed agenticIdContract,
        uint256 indexed tokenId,
        address owner,
        address module,
        uint256 maxTotalSpend,
        uint64 startTime,
        uint64 expiry
    );
    event WarrantProviderSet(uint256 indexed warrantId, address indexed provider, bool allowed, uint32 version);
    event WarrantServiceSet(
        uint256 indexed warrantId, bytes32 indexed serviceKey, string serviceName, bool allowed, uint32 version
    );
    event WarrantServiceRestrictionSet(uint256 indexed warrantId, bool restricted, uint32 version);
    event WarrantMaxSpendUpdated(uint256 indexed warrantId, uint256 oldMax, uint256 newMax, uint32 version);
    event WarrantExpiryUpdated(uint256 indexed warrantId, uint64 oldExpiry, uint64 newExpiry, uint32 version);
    event WarrantRevoked(uint256 indexed warrantId, address indexed revokedBy, uint32 version);
    event SpendRecorded(
        uint256 indexed warrantId,
        address indexed provider,
        string serviceName,
        uint256 amount,
        uint256 newSpentAmount,
        address spender
    );

    error ZeroAddress();
    error ZeroAmount();
    error InvalidExpiry();
    error WarrantNotFound(uint256 warrantId);
    error NotTokenOwner(uint256 warrantId, address caller);
    error NotBoundModule(uint256 warrantId, address caller);
    error WarrantNotActive(uint256 warrantId);
    error WarrantNotYetStarted(uint256 warrantId, uint64 startTime, uint256 currentTime);
    error WarrantExpired(uint256 warrantId, uint64 expiry, uint256 currentTime);
    error WarrantStale(uint256 warrantId, address expectedOwner, address currentOwner);
    error ProviderNotAllowed(uint256 warrantId, address provider);
    error ServiceNotAllowed(uint256 warrantId, string serviceName);
    error BudgetExceeded(uint256 warrantId, uint256 requested, uint256 remaining);
    error MaxSpendBelowSpent(uint256 spentAmount, uint256 requestedMax);

    function createWarrant(WarrantParams calldata params) external returns (uint256 warrantId);
    function setProviderAllowed(uint256 warrantId, address provider, bool allowed) external;
    function setServiceAllowed(uint256 warrantId, string calldata serviceName, bool allowed) external;
    function setRestrictServices(uint256 warrantId, bool restrict) external;
    function setMaxTotalSpend(uint256 warrantId, uint256 newMax) external;
    function setExpiry(uint256 warrantId, uint64 newExpiry) external;
    function revokeWarrant(uint256 warrantId) external;

    function recordSpend(
        uint256 warrantId,
        address provider,
        string calldata serviceName,
        uint256 amount,
        address spender
    ) external returns (uint256 newSpentAmount);

    function getWarrant(uint256 warrantId) external view returns (Warrant memory);
    function isProviderAllowed(uint256 warrantId, address provider) external view returns (bool);
    function isServiceAllowed(uint256 warrantId, string calldata serviceName) external view returns (bool);
    function remainingBudget(uint256 warrantId) external view returns (uint256);
    function isStale(uint256 warrantId) external view returns (bool);
}
