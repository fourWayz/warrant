// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal interface onto 0G's deployed LedgerManager, covering only
/// the functions Warrant calls or reads. Signatures are taken directly from
/// the deployed implementation ABI (0glabs/0g-serving-contract), not
/// reconstructed from documentation.
interface ILedgerManager {
    struct Ledger {
        address user;
        uint256 availableBalance;
        uint256 totalBalance;
        string additionalInfo;
    }

    /// @notice Moves `amount` from the caller's main ledger into a
    /// provider-specific sub-account inside the named service contract.
    /// This is the single call WarrantModule gates.
    function transferFund(address provider, string calldata serviceName, uint256 amount) external;

    /// @notice Deposits `msg.value` into `recipient`'s main ledger. Anyone
    /// may call this on behalf of anyone else — used to fund a Safe's
    /// ledger without routing the deposit through the Safe's own
    /// execTransaction path, since a deposit carries no spend authority.
    function depositFundFor(address recipient) external payable;

    function getLedger(address user) external view returns (Ledger memory);

    function MIN_ACCOUNT_BALANCE() external view returns (uint256);

    function MIN_TRANSFER_AMOUNT() external view returns (uint256);
}
