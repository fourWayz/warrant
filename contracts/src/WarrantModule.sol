// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Enum} from "safe-smart-account/libraries/Enum.sol";
import {ISafeModule} from "./interfaces/ISafeModule.sol";
import {ILedgerManager} from "./interfaces/ILedgerManager.sol";
import {IWarrantRegistry} from "./interfaces/IWarrantRegistry.sol";

/// @title WarrantModule
/// @notice A Safe module bound to exactly one Safe, one 0G LedgerManager,
/// and one WarrantRegistry. Its entire external surface is: assign or
/// remove an executor (Safe-only), and let an assigned executor request a
/// transfer that the registry has approved.
///
/// This contract never accepts a caller-supplied target or calldata. It
/// only ever builds one call — `transferFund` on the fixed `ledgerManager`
/// address set at deployment — so there is no function here through which
/// an arbitrary contract call could be routed.
contract WarrantModule is ReentrancyGuard {
    ISafeModule public immutable safe;
    ILedgerManager public immutable ledgerManager;
    IWarrantRegistry public immutable registry;

    mapping(address executor => uint256 warrantId) public executorWarrant;

    event ExecutorSet(address indexed executor, uint256 indexed warrantId);
    event ExecutorRemoved(address indexed executor);
    event TransferExecuted(
        address indexed executor,
        uint256 indexed warrantId,
        address indexed provider,
        string serviceName,
        uint256 amount
    );

    error ZeroAddress();
    error NotSafe();
    error NotAuthorizedExecutor(address caller);
    error ZeroAmount();
    error TransferFailed();

    constructor(address safe_, address ledgerManager_, address registry_) {
        if (safe_ == address(0) || ledgerManager_ == address(0) || registry_ == address(0)) revert ZeroAddress();
        safe = ISafeModule(safe_);
        ledgerManager = ILedgerManager(ledgerManager_);
        registry = IWarrantRegistry(registry_);
    }

    modifier onlySafe() {
        if (msg.sender != address(safe)) revert NotSafe();
        _;
    }

    /// @notice Grants `executor` the right to spend against `warrantId`
    /// through this module. Only the Safe itself can call this — i.e. only
    /// an owner-signed Safe transaction (or another enabled module) can
    /// hand out executor rights. Pass `warrantId == 0` to have no effect
    /// beyond overwriting any prior binding; use `removeExecutor` to revoke.
    function setExecutor(address executor, uint256 warrantId) external onlySafe {
        executorWarrant[executor] = warrantId;
        emit ExecutorSet(executor, warrantId);
    }

    function removeExecutor(address executor) external onlySafe {
        delete executorWarrant[executor];
        emit ExecutorRemoved(executor);
    }

    /// @notice Requests that the Safe fund `provider` for `amount` under the
    /// warrant assigned to `msg.sender`. Reverts, atomically and without
    /// side effects, unless the registry's `recordSpend` accepts the spend
    /// AND the Safe's own call to `transferFund` succeeds.
    function executeTransfer(address provider, string calldata serviceName, uint256 amount) external nonReentrant {
        uint256 warrantId = executorWarrant[msg.sender];
        if (warrantId == 0) revert NotAuthorizedExecutor(msg.sender);
        if (amount == 0) revert ZeroAmount();

        // Effects: budget is consumed before the external call. If the call
        // below fails, this entire transaction — including this state
        // change — reverts together; the budget is never actually spent
        // unless the real transfer succeeded.
        registry.recordSpend(warrantId, provider, serviceName, amount, msg.sender);

        bytes memory data = abi.encodeCall(ILedgerManager.transferFund, (provider, serviceName, amount));
        bool ok = safe.execTransactionFromModule(address(ledgerManager), 0, data, Enum.Operation.Call);
        if (!ok) revert TransferFailed();

        emit TransferExecuted(msg.sender, warrantId, provider, serviceName, amount);
    }
}
