/**
 * To run this code use:
 * 'ts-node ./scripts/examples/_test.ts '
 */
import { BigNumber, ethers, Wallet } from "ethers"
import { sign } from "../permit"
import { EIP712Domain, EIP712Message, EIP712Types, EIP712Type } from "../types"

const domain: EIP712Domain = {
    name: "TEST NFT WITH PERMIT", // contract name
    version: "1",
    chainId: 1,
    verifyingContract: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
}
const message: EIP712Message = {
    spender: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // hardhat account #1
    tokenId: 0,
    nonce: 0,
    deadline: Number(BigNumber.from(
        (parseInt((+new Date() / 1000).toString()) + 7 * 24 * 60 * 60).toString()
    )), // 7 days deadline
}
const permitTypes: EIP712Types<string, Array<EIP712Type>> = {
    EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
    ],
    PermitToApprove: [
        { name: "spender", type: "string" },
        { name: "tokenId", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
    ],
}

async function testFunction() {
    console.log("deadline: ", message.deadline)
    console.log("...", new Date())
    // privateKey of Hardhat's Account #0
    const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    const wallet = new ethers.Wallet(privateKey)
    const signature = await sign(domain, message, permitTypes, wallet)
    console.log("Signature: ", signature)
    console.log("Split signature:\n", ethers.utils.splitSignature(signature))
}

testFunction()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
