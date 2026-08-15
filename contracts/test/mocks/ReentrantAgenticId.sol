// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @notice An Agentic ID whose `ownerOf` tries to call back into whatever
/// target it's been pointed at. WarrantRegistry only ever reaches `ownerOf`
/// through an interface that declares it `view`, which Solidity compiles to
/// STATICCALL — so any state-changing reentrant call attempted from inside
/// `ownerOf` must revert. Used to prove that in test, not just assert it.
contract ReentrantAgenticId is ERC721 {
    address public target;
    bytes public reentrantCalldata;

    constructor() ERC721("Reentrant Agentic ID", "REID") {}

    function mint(address to, uint256 tokenId) external {
        _mint(to, tokenId);
    }

    function setReentry(address target_, bytes calldata data_) external {
        target = target_;
        reentrantCalldata = data_;
    }

    function ownerOf(uint256 tokenId) public view override returns (address) {
        if (target != address(0)) {
            // Solidity refuses to compile a plain, value-bearing `call` (or
            // any high-level external call to a non-view function) inside
            // anything declared `view` — it will not even let this mock
            // attempt the "obvious" reentrancy. That restriction is exactly
            // the property WarrantRegistry leans on: WarrantRegistry itself
            // reaches `ownerOf` only through an interface reference
            // declared `view`, which the compiler turns into a STATICCALL,
            // so a real attacker's own state-changing attempt inside their
            // `ownerOf` would fail at the EVM level even if their contract
            // used a plain, unrestricted `call` opcode in raw assembly to
            // try it. This mock uses `staticcall` explicitly because that
            // is the only call Solidity will let a `view` function issue —
            // the target function it points at is expected to revert
            // precisely because it tries to write storage under staticcall.
            address t = target;
            bytes memory data = reentrantCalldata;
            bool ok;
            assembly {
                ok := staticcall(gas(), t, add(data, 0x20), mload(data), 0, 0)
            }
            require(ok, "reentrant call unexpectedly failed cleanly");
        }
        return super.ownerOf(tokenId);
    }
}
