//SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./MockERC721OffchainPermit.sol";

interface IHevm {
    function sign(uint256 sk, bytes32 digest)
        external
        returns (
            uint8 v,
            bytes32 r,
            bytes32 s
        );
}

contract EchidnaERC721OffchainPermit {
    MockERC721OffchainPermit asset;
    IHevm hevm;
    uint256 constant OWNER_PK = 2;
    // an address corresponded to private key `2`;
    address constant OWNER = 0x2B5AD5c4795c026514f8317c7a215E218DcCD6cF;
    // an address corresponded to private key `3`;
    address constant RECIPIENT = 0x6813Eb9362372EEF6200f3b1dbC3f819671cBA69;

    event AssertionFailed(string reason);
    event EchidnaSaveTransferInfo(
        address from,
        address to,
        uint256 tokenId,
        uint256 deadline,
        uint256 blockTimestamp
    );
    event EchidnaLogEvent(string reason);
    event EchidnaDigestCreated(bytes32 digest);
    event EchidnaDigestSigned(uint8 v, bytes32 r, bytes32 s);
    event EchidnaSignatureGenerated(bytes signature);

    constructor() {
        asset = new MockERC721OffchainPermit();
        // cheatcodes which can manipulate the environment in which the execution is run
        // can be accessed from an address `0x7109709ECfa91a80626fF3989D68f67F5b1DD12D`
        // as Echidna implements hevm
        hevm = IHevm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);
    }

    // helper method to create signature
    function createSignature(
        address spender,
        uint256 tokenId,
        uint256 deadline
    ) public returns (bytes memory) {
        require(spender != address(0), "Spender cannot be zero address");
        require(deadline >= block.timestamp, "Deadline must be higher than current timestamp");
        require(asset.getNonce(tokenId) >= 0, "Token must be already minted");
        uint256 _nonce = asset.getNonce(tokenId);
        bytes32 _digest = asset._buildDigest(spender, tokenId, _nonce, deadline);
        emit EchidnaDigestCreated(_digest);
        (uint8 v, bytes32 r, bytes32 s) = hevm.sign(OWNER_PK, _digest);
        emit EchidnaDigestSigned(v, r, s);
        emit EchidnaSignatureGenerated(abi.encodePacked(r, s, v));
        return abi.encodePacked(r, s, v);
    }

    function testPermitToApprove(uint256 deadline) public {
        // 1. pre
        require(deadline > block.timestamp);
        // 2. setup
        // mint NFT
        asset.mint();
        // get its tokenId
        uint256 tokenId = asset.getTokenCounter() - 1;
        // transfer token to the OWNER
        asset.transferFrom(address(this), OWNER, tokenId);
        require(asset.ownerOf(tokenId) == OWNER, "Transfer failed");
        // create signature by the owner
        bytes memory signature = createSignature(address(this), tokenId, deadline);
        // 3. test
        // 3.1 test valid signature
        emit EchidnaLogEvent(">>> TEST 1 <<<");
        bool permitAndTransferSuccessful = false;
        emit EchidnaSaveTransferInfo(OWNER, address(this), tokenId, deadline, block.timestamp);

        try
            asset.safeTransferFromAndPermit(OWNER, address(this), tokenId, "", deadline, signature)
        {
            permitAndTransferSuccessful = true;
            emit EchidnaLogEvent(">>> TEST 1 SUCCESFULL <<<");
        } catch {
            emit AssertionFailed(">>> TEST 1 FAILED <<<");
        }
        // 3.2 cannot use signature twice
        emit EchidnaLogEvent(">>> TEST 2 <<<");
        if (permitAndTransferSuccessful) {
            try
                asset.safeTransferFromAndPermit(
                    OWNER,
                    address(this),
                    tokenId,
                    "",
                    deadline,
                    signature
                )
            {
                emit AssertionFailed(">>> TEST 2 FAILED <<<");
            } catch {
                emit EchidnaLogEvent(">>> TEST 2 SUCCESFULL <<<");
            }
        }
    }

    // added as otherwise it keeps returning ""ERC721: transfer to non ERC721Receiver implementer"
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
