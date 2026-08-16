// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Vm} from "forge-std/Vm.sol";
import {SafeL2} from "safe-smart-account/SafeL2.sol";
import {SafeProxyFactory} from "safe-smart-account/proxies/SafeProxyFactory.sol";
import {Enum} from "safe-smart-account/libraries/Enum.sol";

/// @notice Deploys a real, unmodified Safe v1.4.1 and executes single-owner
/// transactions against it, so WarrantModule's tests run against genuine
/// Safe bytecode rather than a hand-rolled stand-in.
library SafeTestLib {
    function deploySafe(SafeL2 singleton, SafeProxyFactory factory, address owner, uint256 saltNonce)
        internal
        returns (SafeL2 safe)
    {
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
        safe = SafeL2(payable(address(factory.createProxyWithNonce(address(singleton), initializer, saltNonce))));
    }

    /// @notice Executes a single-owner Safe transaction, signing the real
    /// EIP-712 Safe transaction hash with `ownerPk` via `vm.sign`.
    function execAsOwner(Vm vm, SafeL2 safe, uint256 ownerPk, address to, bytes memory data) internal returns (bool) {
        uint256 nonce = safe.nonce();
        bytes32 txHash =
            safe.getTransactionHash(to, 0, data, Enum.Operation.Call, 0, 0, 0, address(0), payable(address(0)), nonce);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPk, txHash);
        bytes memory signature = abi.encodePacked(r, s, v);
        return
            safe.execTransaction(to, 0, data, Enum.Operation.Call, 0, 0, 0, address(0), payable(address(0)), signature);
    }
}
