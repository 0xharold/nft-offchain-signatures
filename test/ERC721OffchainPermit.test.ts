// tests inspired at:
// https://github.com/dievardump/erc721-with-permits/blob/main/test/contract.js

import { assert, expect } from "chai"
import { network, deployments, ethers, waffle } from "hardhat"
import { developmentChains } from "../helper-hardhat-config"

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { ERC721OffchainPermit } from "../typechain-types"
import { EIP712Domain, EIP712Types, EIP712Type, EIP712Message } from "../scripts/types"
import { BigNumber } from "ethers"

const { AddressZero } = ethers.constants

const _INTERFACE_ID_ERC721 = "0x80ac58cd"
const _INTERFACE_ID_ERC721_METADATA = "0x5b5e139f"
const _INTERFACE_ID_ERC165 = "0x01ffc9a7"
const _INTERFACE_WITH_PERMIT = "0x13787601"

const MAIN_LOGS = false

const PERMIT_TYPES: EIP712Types<string, Array<EIP712Type>> = {
    EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
    ],
    permitToApprove: [
        { name: "spender", type: "address" },
        { name: "tokenId", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
    ],
}

function generateDeadline(days: number): Number {
    return Number(
        BigNumber.from((parseInt((+new Date() / 1000).toString()) + days * 24 * 60 * 60).toString())
    )
}

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("ERC721OffchainPermit", function () {
          let nftOffchainPermitContract: ERC721OffchainPermit
          let accounts: SignerWithAddress[]
          let deployer: SignerWithAddress
          let bob: SignerWithAddress
          let alice: SignerWithAddress
          let domain: EIP712Domain
          let message: EIP712Message
          let contractName: string
          let contractVersion: string
          let signature: string
          let deadline = generateDeadline(7)

          // helper
          async function generateSignature(account: SignerWithAddress): Promise<string> {
              return await account._signTypedData(
                  domain,
                  { permitToApprove: PERMIT_TYPES.permitToApprove },
                  message
              )
          }

          before(async () => {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              bob = accounts[1]
              alice = accounts[2]
          })

          beforeEach(async () => {
              await deployments.fixture(["erc721-sig"])
              // get deployed contract
              nftOffchainPermitContract = await ethers.getContract("ERC721OffchainPermit")
              // mint one NFT to deployer
              await nftOffchainPermitContract.mint()
              // DOMAIN
              contractName = (await nftOffchainPermitContract.name()).toString()
              contractVersion = (await nftOffchainPermitContract.getVersion()).toString()
              const chainId = await ethers.provider.getNetwork()
              // fill the domain
              domain = {
                  name: contractName,
                  version: contractVersion,
                  chainId: chainId.chainId,
                  verifyingContract: nftOffchainPermitContract.address,
              }
              // generate the first message
              const nonce = (await nftOffchainPermitContract.getNonce(0)).toString()
              const spender = bob.address
              const tokenId = 0
              message = {
                  spender: spender,
                  tokenId: tokenId,
                  nonce: Number(nonce),
                  deadline: deadline,
              }
              signature = await generateSignature(deployer)
              // LOGS
              if (MAIN_LOGS) {
                  console.group()
                  console.log("\nnftOffchainPermitContract: ", nftOffchainPermitContract.address)
                  console.log("contractName: ", contractName)
                  console.log("contractVersion: ", contractVersion)
                  console.log("chainId: ", chainId)
                  console.log("deployer: ", deployer.address)
                  console.log("bob: ", bob.address)
                  console.log("deadline: ", message.deadline)
                  console.log("signature: ", signature)
                  console.log()
                  console.groupEnd()
              }
          })

          describe("supportsInterface", function () {
              it("has all the interfaces", async () => {
                  const _interfaces = [
                      _INTERFACE_ID_ERC165,
                      _INTERFACE_ID_ERC721,
                      _INTERFACE_ID_ERC721_METADATA,
                      _INTERFACE_WITH_PERMIT,
                  ]
                  for (const _interface of _interfaces) {
                      //   console.log("_interface:", _interface)
                      assert.equal(
                          await nftOffchainPermitContract.supportsInterface(_interface),
                          true
                      )
                  }
              })
          })

          describe("permit", function () {
              it("increments the nonce with each transfer", async () => {
                  // assert that nonce is zero
                  assert.equal((await nftOffchainPermitContract.getNonce("0")).toString(), "0")
                  // the first transfer
                  await nftOffchainPermitContract.transferFrom(deployer.address, bob.address, 0)
                  assert.equal((await nftOffchainPermitContract.getNonce("0")).toString(), "1")
                  // the second transfer
                  await nftOffchainPermitContract
                      .connect(bob)
                      .transferFrom(bob.address, deployer.address, 0)
                  assert.equal((await nftOffchainPermitContract.getNonce("0")).toString(), "2")
              })

              // cancelled as it returns invalid signature due to changing value of the deadline
              //   it("generates the same signatures", async () => {
              //       // the second signature generated in "/scripts/examples/_test.ts"
              //       assert.equal(
              //           signature,
              //           "0xe6ff64cd0e3b0e25bbd3251aa3704a799558b709b42ba14e023e007c583efb953d3fc7b426a1a9b5b59e1077ef31bf8cbee52b2bd0a4fc285f177790421d42941c"
              //       )
              //   })

              it("can use the permit to get approval", async () => {
                  // first check, than bob is not approved
                  const approvedBeforePermit = await nftOffchainPermitContract.getApproved(0)
                  assert.notEqual(approvedBeforePermit.toString(), bob.address)
                  // apply signature
                  await nftOffchainPermitContract
                      .connect(bob)
                      .permitToApprove(bob.address, 0, BigNumber.from(deadline), signature)
                  // verify that bob is approved now
                  const approvedAfterPermit = await nftOffchainPermitContract.getApproved(0)
                  assert.equal(approvedAfterPermit.toString(), bob.address)
              })

              describe("cannot use the permit if:", function () {
                  it("...the nonce has changed", async () => {
                      const transferNft = await nftOffchainPermitContract.transferFrom(
                          deployer.address,
                          alice.address,
                          0
                      )
                      await transferNft.wait(1)
                      await expect(
                          nftOffchainPermitContract
                              .connect(bob)
                              .permitToApprove(bob.address, 0, BigNumber.from(deadline), signature)
                      ).to.be.revertedWith("ERC721OffchainPermit__InvalidPermitSignature")
                  })

                  it("...the spender is wrong address", async () => {
                      await expect(
                          nftOffchainPermitContract
                              .connect(bob)
                              .permitToApprove(
                                  alice.address,
                                  0,
                                  BigNumber.from(deadline),
                                  signature
                              )
                      ).to.be.revertedWith("ERC721OffchainPermit__InvalidPermitSignature")
                  })

                  it("...deadline has expired", async () => {
                      deadline = generateDeadline(-7)
                      message.deadline = deadline
                      signature = await generateSignature(deployer)

                      await expect(
                          nftOffchainPermitContract
                              .connect(bob)
                              .permitToApprove(bob.address, 0, BigNumber.from(deadline), signature)
                      ).to.be.revertedWith("ERC721OffchainPermit__PermitDeadlineExpired")
                  })

                  it("...spender is ZeroAddress", async () => {
                      // update the message
                      message.spender = AddressZero
                      message.deadline = generateDeadline(7)
                      // create a new signature
                      const newSig = await generateSignature(deployer)
                      await expect(
                          nftOffchainPermitContract
                              .connect(bob)
                              .permitToApprove(
                                  AddressZero,
                                  0,
                                  BigNumber.from(message.deadline),
                                  newSig
                              )
                      ).to.be.revertedWith("ERC721OffchainPermit__ZeroAddress")
                  })
              })

              it("approved accounts can generate a valid signature", async () => {
                  // send NFT to alice
                  const sendNftTx = await nftOffchainPermitContract.transferFrom(
                      deployer.address,
                      alice.address,
                      0
                  )
                  await sendNftTx.wait(1)
                  // generate the new invalid signature for bob by deployer (not owner anymore)
                  message.nonce++
                  signature = await generateSignature(deployer)
                  await expect(
                      nftOffchainPermitContract
                          .connect(bob)
                          .permitToApprove(bob.address, 0, BigNumber.from(deadline), signature)
                  ).to.be.revertedWith("ERC721OffchainPermit__InvalidPermitSignature")
                  // generate the new valid signature for bob by alice (the new owner)
                  // -> check that bob is not approved
                  const approved = await nftOffchainPermitContract.getApproved(0)
                  assert.notEqual(approved.toString(), bob.address)
                  // -> create the new valid sig
                  signature = await generateSignature(alice)
                  // -> use the new valid sig
                  const permitTx = await nftOffchainPermitContract
                      .connect(bob)
                      .permitToApprove(bob.address, 0, BigNumber.from(deadline), signature)
                  await permitTx.wait(1)
                  const newlyApproved = await nftOffchainPermitContract.getApproved(0)
                  assert.equal(newlyApproved.toString(), bob.address)
              })
          })

          describe("safeTransferFromAndPermit", function () {
              it("functions if all is set correctly", async () => {
                  assert.equal(
                      (await nftOffchainPermitContract.ownerOf(0)).toString(),
                      deployer.address
                  )
                  //   update signature
                  const newDeadline = generateDeadline(7)
                  message.deadline = newDeadline
                  signature = await generateSignature(deployer)
                  // perform the transfer
                  const safeTransferAndPermitTx = await nftOffchainPermitContract
                      .connect(bob)
                      .safeTransferFromAndPermit(
                          deployer.address,
                          bob.address,
                          0,
                          [],
                          BigNumber.from(newDeadline),
                          signature
                      )
                  await safeTransferAndPermitTx.wait(1)
                  // check the new owner
                  const newOwner = await nftOffchainPermitContract.ownerOf(0)
                  assert.equal(newOwner.toString(), bob.address)
              })
          })

          describe("other", function () {
              it("tokenCounter works correctly", async () => {
                  // should be one as only one NFT has been minted
                  assert.equal((await nftOffchainPermitContract.getTokenCounter()).toString(), "1")
              })
              it("getNonce reverts if unknown token", async () => {
                  await expect(nftOffchainPermitContract.getNonce(1)).to.be.revertedWith(
                      "ERC721OffchainPermit__UnknownToken"
                  )
              })
          })
      })
