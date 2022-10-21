// Based on:
// https://github.com/compound-finance/compound-js/blob/f1c4370b66552a26863cf57c7656d318a8f44982/src/EIP712.ts#L119-L153
// and: https://github.com/Uniswap/v3-periphery/blob/main/test/shared/permit.ts

import { EIP712Domain, EIP712Message, EIP712Types, EIP712Type } from "./types"

import { keccak256, encodeData } from "./helpers"
import { Wallet, Signature } from "ethers"

/**
 *
 * @param domain
 * @param primaryType
 * @param message
 * @param types
 * @param signer
 * @returns
 * @dev https://docs.ethers.io/v5/api/utils/signing-key/
 */
export async function sign(
    domain: EIP712Domain,
    message: EIP712Message,
    types: EIP712Types<string, Array<EIP712Type>>,
    wallet: Wallet
    // primaryType: string
): Promise<Signature> {
    let signature: any
    try {
        signature = await wallet._signTypedData(
            domain,
            { PermitToApprove: types.PermitToApprove },
            message
        )
    } catch (e: any) {
        throw new Error(e)
    }
    return signature
}

/**
 * Generate digest to be signed according to EIP712 standard, see https://eips.ethereum.org/EIPS/eip-712
 * @param domain domain specified in accordance with EIP712
 * @param primaryType primary type specified in accordance with EIP712
 * @param message message specified in accordance with EIP712
 * @param types type specified in accordance with EIP712
 * @returns
 */
export function digestToSign(
    domain: EIP712Domain,
    primaryType: string,
    message: EIP712Message,
    types = {}
) {
    const digest = keccak256(
        Buffer.concat([
            Buffer.from("1901", `hex`),
            generateDomainTypeHash(domain),
            hashStruct(primaryType, message, types),
        ])
    )
    return digest
}

/**
 * Get hash of domain typed data
 * @param domain {EIP712Domain}
 * @returns encoded domain separator
 * @note example get hash of "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
 */
function generateDomainTypeHash(domain: EIP712Domain): Buffer {
    // filter the types by the domain
    const types = {
        EIP712Domain: [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" },
            { name: "salt", type: "bytes32" },
        ].filter((a) => domain[a.name]),
    }
    // TODO: why also types to include?
    const domainTypeHash = keccak256(encodeData("EIP712Domain", domain, types))
    console.log("generateDomainTypeHash: ", domainTypeHash)
    return domainTypeHash
}

/**
 * @dev example: get hash of "PermitToApprove(address spender,uint256 tokenId,uint256 nonce,uint256 deadline)"
 * @param primaryType primary type to be signed (PermitToApprove)
 * @param message specific values to be signed
 * @param types types defined ("address spender,uint256 tokenId,uint256 nonce,uint256 deadline")
 * @returns
 */
function hashStruct(primaryType: string, message: EIP712Message, types = {}) {
    return keccak256(encodeData(primaryType, message, types))
}
