// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Enum} from "safe-smart-account/libraries/Enum.sol";

/// @notice The subset of the Safe interface WarrantModule needs to execute a
/// transaction as an enabled module, and to check its own enablement.
interface ISafeModule {
    function execTransactionFromModule(address to, uint256 value, bytes calldata data, Enum.Operation operation)
        external
        returns (bool success);

    function isModuleEnabled(address module) external view returns (bool);
}
