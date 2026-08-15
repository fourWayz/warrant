// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @notice Minimal ERC-721 stand-in for an Agentic ID collection, used only
/// in tests. WarrantRegistry only ever calls `ownerOf`, so this mock adds
/// nothing beyond a public `mint` for test setup.
contract MockAgenticId is ERC721 {
    constructor() ERC721("Mock Agentic ID", "MAID") {}

    function mint(address to, uint256 tokenId) external {
        _mint(to, tokenId);
    }

    function transfer(address to, uint256 tokenId) external {
        _transfer(ownerOf(tokenId), to, tokenId);
    }
}
