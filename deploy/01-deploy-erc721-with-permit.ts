import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"

import { developmentChains, VERIFICATION_BLOCK_CONFIRMATIONS } from "../helper-hardhat-config"
import { verify } from "../utils/verify"

const ARGS = []

const deployErc721WithOffchainSignatures: DeployFunction = async (
    hre: HardhatRuntimeEnvironment
) => {
    const { deployments, getNamedAccounts, network, ethers } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    const waitBlockConfirmations = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS

    const erc721WithOffchainSignatures = await deploy("ERC721OffchainPermit", {
        from: deployer,
        args: ARGS,
        log: true,
        waitConfirmations: waitBlockConfirmations,
    })

    if (!developmentChains.includes(network.name)) {
        console.log("Verifying ERC721OffchainPermit...")
        await verify(erc721WithOffchainSignatures.address, ARGS)
    }
    console.log("--------------------------")
}

export default deployErc721WithOffchainSignatures
deployErc721WithOffchainSignatures.tags = ["all", "erc721-sig"]
