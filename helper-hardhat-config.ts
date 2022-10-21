export interface networkConfigItem {
    name?: string
    wethToken?: string
    lendingPoolAddressesProvider?: string
    daiEthPriceFeed?: string
    daiToken?: string
    blockConfirmations?: number
    ethUsdPriceFeed?: string
}

export interface networkConfigInfo {
    [key: string]: networkConfigItem
}

export const networkConfig: networkConfigInfo = {
    default: {
        name: "hardhat",
    },
    31337: {
        name: "localhost",
    },
    1337: {
        name: "localhost",
    },
    4: {
        name: "rinkeby",
    },
    5: {
        name: "goerli",
    },
    137: {
        name: "polygon",
    },
}

export const developmentChains = ["hardhat", "localhost"]
export const VERIFICATION_BLOCK_CONFIRMATIONS = 6
