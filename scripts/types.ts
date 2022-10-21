/**
 * EIP712 types
 */
export interface EIP712Domain {
    name: string
    version?: string
    chainId: number
    verifyingContract: string
}

// message based on the defined type,
export interface EIP712Message {
    spender: string
    tokenId: number
    nonce: number
    deadline: Number
}

export type EIP712Types<K extends keyof any, T> = {
    [P in K]: T
}

export interface EIP712Type {
    name: string
    type: string
}

/**
 * SIGNER
 */
interface SimpleEthersProvider {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jsonRpcFetchFunc(method: string, parameters: any[])
}

export interface SimpleEthersSigner {
    _signingKey()
    getAddress()
    provider?: SimpleEthersProvider
}

/**
 * SIGNATURE
 */
export interface Signature {
    r: string
    s: string
    v: string
}
