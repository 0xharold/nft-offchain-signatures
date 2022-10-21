//SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

// selector: 0x13787601

interface IERC721OffchainPermit {
    function _buildDigest(
        address spender,
        uint256 tokenId,
        uint256 nonce,
        uint256 deadline
    ) external view returns (bytes32);

    function permitToApprove(
        address spender,
        uint256 tokenId,
        uint256 deadline,
        bytes memory signature
    ) external;

    function safeTransferFromAndPermit(
        address from,
        address to,
        uint256 tokenId,
        bytes memory _data,
        uint256 deadline,
        bytes memory signature
    ) external;

    function getNonce(uint256 _tokenId) external view returns (uint256);

    function getDomainSeparator() external view returns (bytes32);
}
