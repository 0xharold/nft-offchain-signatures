//SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import "./IERC721OffchainPermit.sol";

error ERC721OffchainPermit__UnknownToken();
error ERC721OffchainPermit__PermitDeadlineExpired();
error ERC721OffchainPermit__ZeroAddress();
error ERC721OffchainPermit__InvalidPermitSignature();

/**
 * @title ERC721 contract with Off-chain Permit
 * @author Lubos Harasta;
 * - heavily inspired by https://github.com/dievardump/erc721-with-permits/blob/main/contracts/ERC721WithPermit.sol
 * @notice TODO: add description
 * @dev set the name of the CONTRACT_NAME_HASH in the constructor accordingly;
 */

contract ERC721OffchainPermit is ERC721 {
    bytes32 private constant DOMAIN_TYPE_HASH =
        keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        );
    bytes32 private constant PERMIT_TYPE_HASH =
        keccak256(
            "permitToApprove(address spender,uint256 tokenId,uint256 nonce,uint256 deadline)"
        );
    string private constant DOMAIN_VERSION = "1";

    bytes32 private immutable _domainSeparator;
    uint256 private immutable _domainChainId;
    uint256 private tokenCounter;

    // tokenId to nonce
    mapping(uint256 => uint256) private _nonces;

    constructor() ERC721("TEST NFT WITH PERMIT", "TNFTP") {
        uint256 chainId;
        //solhint-disable-next-line no-inline-assembly
        assembly {
            chainId := chainid()
        }
        _domainChainId = chainId;
        _domainSeparator = _calculateDomainSeparator(chainId);
    }

    ////////////////////
    // MAIN FUNCTIONS //
    ////////////////////

    /**
     * @notice function to execute the approve and safeTransfer in one transaction using valid permit
     * @param from the current token owner
     * @param to approved spender to transfer the token
     * @param tokenId token ID of the token
     * @param _data optional data to add
     * @param deadline deadline to execute the transaction (= signature expiration)
     * @param signature signature of the permit by the current owner
     */
    function safeTransferFromAndPermit(
        address from,
        address to,
        uint256 tokenId,
        bytes memory _data,
        uint256 deadline,
        bytes memory signature
    ) external {
        // use the off-chain generated permit to get msg.sender approved
        permitToApprove(to, tokenId, deadline, signature);
        // use safeTransferFrom
        safeTransferFrom(from, to, tokenId, _data);
    }

    /**
     * @notice function to execute the approve using valid permit
     * @param spender approved spender to use the permit
     * @param tokenId token ID of the token
     * @param deadline deadline to execute the transaction (= signature expiration)
     * @param signature signature of the permit by the current owner
     */
    function permitToApprove(
        address spender,
        uint256 tokenId,
        uint256 deadline,
        bytes memory signature
    ) public {
        if (deadline < block.timestamp) {
            revert ERC721OffchainPermit__PermitDeadlineExpired();
        }
        bytes32 digest = _buildDigest(spender, tokenId, _nonces[tokenId], deadline);
        (address recoveredAddress, ) = ECDSA.tryRecover(digest, signature);
        if (recoveredAddress == address(0) || spender == address(0)) {
            revert ERC721OffchainPermit__ZeroAddress();
        }
        if (
            !_isApprovedOrOwner(recoveredAddress, tokenId) ||
            !SignatureChecker.isValidSignatureNow(ownerOf(tokenId), digest, signature)
        ) {
            revert ERC721OffchainPermit__InvalidPermitSignature();
        }
        _approve(spender, tokenId);
    }

    /**
     * @notice to build a digest to sign
     * @param spender approved spender to use the permit
     * @param tokenId token ID of the token
     * @param nonce nonce of the token
     * @param deadline deadline to execute the transaction (= signature expiration)
     */
    function _buildDigest(
        address spender,
        uint256 tokenId,
        uint256 nonce,
        uint256 deadline
    ) public view returns (bytes32) {
        return
            ECDSA.toTypedDataHash(
                getDomainSeparator(),
                keccak256(abi.encode(PERMIT_TYPE_HASH, spender, tokenId, nonce, deadline))
            );
    }

    /**
     * @notice to increment nonce of each token
     * @param _tokenId token Id of the NFT to increment a nonce
     */
    function _incrementNonce(uint256 _tokenId) internal {
        _nonces[_tokenId]++;
    }

    /**
     * @dev added here for the purpose of the tests
     * @dev TODO: add some restrictions
     */
    function mint() public {
        uint256 tokenId = tokenCounter;
        tokenCounter++;
        _mint(msg.sender, tokenId);
    }

    // @inheritdoc ERC721
    // @dev increments nonce of the given tokenId
    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override {
        _incrementNonce(tokenId);
        super._transfer(from, to, tokenId);
    }

    /////////////
    // HELPERS //
    /////////////

    /**
     * @notice calculate domain separator for the given chainId
     * @param _chainId chain Id
     * @return _ domain separator
     */
    function _calculateDomainSeparator(uint256 _chainId) internal view returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    DOMAIN_TYPE_HASH,
                    keccak256(bytes(name())),
                    keccak256(bytes(DOMAIN_VERSION)),
                    _chainId,
                    address(this)
                )
            );
    }

    /////////////
    // GETTERS //
    /////////////

    /**
     * @notice to retrive a current nonce of a given token ID
     * @param _tokenId token Id
     * @return _ current token nonce
     */
    function getNonce(uint256 _tokenId) public view returns (uint256) {
        // _exists() inherited from ERC721.sol
        if (!_exists(_tokenId)) {
            revert ERC721OffchainPermit__UnknownToken();
        }
        return _nonces[_tokenId];
    }

    /**
     * @notice get the domain separator
     */
    function getDomainSeparator() public view returns (bytes32) {
        uint256 chainId;
        //solhint-disable-next-line no-inline-assembly
        assembly {
            chainId := chainid()
        }

        return (chainId == _domainChainId) ? _domainSeparator : _calculateDomainSeparator(chainId);
    }

    /**
     * @notice get the current value of the token counter
     */
    function getTokenCounter() public view returns (uint256) {
        return tokenCounter;
    }

    /**
     * @notice get the current version of the contract
     */
    function getVersion() public pure returns (string memory) {
        return DOMAIN_VERSION;
    }

    ///////////////
    // OVERRIDES //
    ///////////////

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            interfaceId == type(IERC721OffchainPermit).interfaceId || // 0x13787601
            super.supportsInterface(interfaceId);
    }
}
