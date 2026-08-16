// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ILedgerManager} from "../../src/interfaces/ILedgerManager.sol";

/// @notice Stand-in for 0G's LedgerManager, mirroring only the behavior
/// WarrantModule depends on: `transferFund` debits the caller's ledger and
/// credits a per-(user, provider) balance, reverting under the same named
/// conditions the real contract does. Used for M1/M2 unit and adversarial
/// tests; M3 replaces this with the real deployed testnet contract.
contract MockLedgerManager is ILedgerManager {
    uint256 public constant MIN_ACCOUNT_BALANCE_ = 3 ether;
    uint256 public constant MIN_TRANSFER_AMOUNT_ = 1;

    mapping(address user => uint256) public mainLedger;
    mapping(address user => mapping(address provider => uint256)) public providerBalance;
    mapping(address user => mapping(address provider => string)) public lastServiceName;

    error ZeroAmountNotAllowed();
    error InsufficientAvailableBalance(uint256 available, uint256 required);
    error MinimumTransferRequired(uint256 provided, uint256 required);

    function fund(address user) external payable {
        mainLedger[user] += msg.value;
    }

    function transferFund(address provider, string calldata serviceName, uint256 amount) external override {
        if (amount == 0) revert ZeroAmountNotAllowed();
        if (amount < MIN_TRANSFER_AMOUNT_) revert MinimumTransferRequired(amount, MIN_TRANSFER_AMOUNT_);
        if (mainLedger[msg.sender] < amount) {
            revert InsufficientAvailableBalance(mainLedger[msg.sender], amount);
        }
        mainLedger[msg.sender] -= amount;
        providerBalance[msg.sender][provider] += amount;
        lastServiceName[msg.sender][provider] = serviceName;
    }

    function getLedger(address user) external view override returns (Ledger memory) {
        return
            Ledger({user: user, availableBalance: mainLedger[user], totalBalance: mainLedger[user], additionalInfo: ""});
    }

    function MIN_ACCOUNT_BALANCE() external pure override returns (uint256) {
        return MIN_ACCOUNT_BALANCE_;
    }

    function MIN_TRANSFER_AMOUNT() external pure override returns (uint256) {
        return MIN_TRANSFER_AMOUNT_;
    }
}
