import { digestToSign } from "../permit"
import { EIP712Domain, EIP712Message } from "../types"

const domain: EIP712Domain = {
    name: "ERC721OffchainPermit", // contract name
    version: "1",
    chainId: 1,
    verifyingContract: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
}

const primaryType = "PermitToApprove"

const message: EIP712Message = {
    spender: "",
    tokenId: 0,
    nonce: 0,
    deadline: 10e9,
}

async function testFunction() {
    // digestToSign(domain, primaryType, message, permitTypes)
}

testFunction()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
