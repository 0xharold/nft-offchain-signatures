// // helper to sign using (spender, tokenId, nonce, deadline) EIP 712
// async function sign(spender, tokenId, nonce, deadline) {
//     const typedData = {
//         types: {
//             Permit: [
//                 { name: "spender", type: "address" },
//                 { name: "tokenId", type: "uint256" },
//                 { name: "nonce", type: "uint256" },
//                 { name: "deadline", type: "uint256" },
//             ],
//         },
//         primaryType: "Permit",
//         domain: {
//             name: await contract.name(),
//             version: "1",
//             chainId: chainId,
//             verifyingContract: contract.address,
//         },
//         message: {
//             spender,
//             tokenId,
//             nonce,
//             deadline,
//         },
//     }

//     // sign Permit
//     const signature = await deployer._signTypedData(
//         typedData.domain,
//         { Permit: typedData.types.Permit },
//         typedData.message
//     )

//     return signature
// }
