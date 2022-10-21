// Based on
// https://github.com/ethereum/EIPs/blob/master/assets/eip-712/Example.js

import { ethers } from "ethers"
import { EIP712Domain, EIP712Message, EIP712Type } from "./types"

/**
 * Hash arguments by keccak256 provided by ethers.utils and return its Buffer
 * @param arg arguments to be hashed; must be an array of numbers, hex string or Uint8Array; see https://docs.ethers.io/v5/api/utils/hashing/#utils-keccak256
 * @returns Buffer of hashed arg
 */
export function keccak256(arg) {
    const hexStr = ethers.utils.keccak256(arg)
    return Buffer.from(hexStr.slice(2, hexStr.length), "hex")
}

// Recursively finds all the dependencies of a type
function dependencies(primaryType: string, found: any[] = [], types = {}) {
    if (found.includes(primaryType)) {
        return found
    }
    if (types[primaryType] === undefined) {
        return found
    }
    found.push(primaryType)
    for (const field of types[primaryType]) {
        for (const dep of dependencies(field.type, found)) {
            if (!found.includes(dep)) {
                found.push(dep)
            }
        }
    }
    return found
}

function encodeType(primaryType: string, types = {}) {
    // Get dependencies primary first, then sort dependencies alphabetically
    let deps = dependencies(primaryType)
    deps = deps.filter((t) => t != primaryType)
    deps = [primaryType].concat(deps.sort())

    // Format as a string with fields
    let result = ""
    for (const type of deps) {
        if (!types[type])
            throw new Error(`Type '${type}' not defined in types (${JSON.stringify(types)})`)
        result += `${type}(${types[type].map(({ name, type }) => `${type} ${name}`).join(",")})`
    }
    return result
}

function typeHash(primaryType: string, types = {}) {
    return keccak256(Buffer.from(encodeType(primaryType, types)))
}

export function encodeData(primaryType: string, data: EIP712Message | EIP712Domain, types = {}) {
    const encodedTypes: any[] = []
    const encodedValues: any[] = []

    // Add typehash
    encodedTypes.push("bytes32")
    encodedValues.push(typeHash(primaryType, types))

    // Add field contents
    for (const field of types[primaryType]) {
        let value = data[field.name]
        if (field.type == "string" || field.type == "bytes") {
            encodedTypes.push("bytes32")
            value = keccak256(Buffer.from(value))
            encodedValues.push(value)
        } else if (types[field.type] !== undefined) {
            encodedTypes.push("bytes32")
            value = keccak256(encodeData(field.type, value, types))
            encodedValues.push(value)
        } else if (field.type.lastIndexOf("]") === field.type.length - 1) {
            throw "TODO: Arrays currently unimplemented in encodeData"
        } else {
            encodedTypes.push(field.type)
            encodedValues.push(value)
        }
    }
    // console.log("encodedTypes: ", encodedTypes)
    // console.log("encodedValues: ", encodedValues)
    return abiRawEncode(encodedTypes, encodedValues)
}

// https://docs.ethers.io/v5/api/utils/abi/coder/#AbiCoder--creating
// @dev do not change JS variable for Solidity vars (ie numbers for uint256)
function abiRawEncode(encodedTypes: string[], encodedValues: any[]): Buffer {
    const hexStr = ethers.utils.defaultAbiCoder.encode(encodedTypes, encodedValues)
    return Buffer.from(hexStr.slice(2, hexStr.length), "hex")
}
