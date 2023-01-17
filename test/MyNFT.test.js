const { assert, expect } = require("chai")
const { deployments, ethers, getNamedAccounts } = require("hardhat")
const { addresses } = require("../merkletree")
const { MerkleTree } = require("merkletreejs")
const keccak256 = require("keccak256")

describe("My NFT", function () {
    //global variables
    let myNft
    let deployer, merkleProof
    const nftQuantity = 1
    const teamMintQuantity = 10
    const PUBLIC_SALE_PRICE = "0.02"
    const WHITELIST_SALE_PRICE = "0.01"
    const merkleRoot =
        "0x5e603d0777fee9aa0211d439681398d4f022dbecc87a29540b97ff3ea35135bf"
    const tokenUri = "ipfs://tokenUri"
    const placeholderTokenUri = "ipfs://placeholderTokenUri"

    beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer
        await deployments.fixture(["all"])
        myNft = await ethers.getContract("MyNFT", deployer)
        let tx = await myNft.setMerkleRoot(merkleRoot)
        await tx.wait(1)
    })

    describe("Mint function", async function () {
        it("Only mints when public sale is active", async function () {
            await expect(myNft.mint(nftQuantity)).to.be.revertedWith(
                "MyNFT__PublicSaleNotActive"
            )
        })
        it("Does not mint more than the max supply", async function () {
            await myNft.togglePublicSale()
            // console.log("Contract unpaused, checking for max supply next.")
            await expect(myNft.mint(nftQuantity)).to.be.revertedWith(
                "MyNFT__ExceedsMaxSupply"
            )
        })
        it("Does not mint more than the max nfts per wallet for public mint", async function () {
            await myNft.togglePublicSale()
            await expect(myNft.mint(10)).to.be.revertedWith(
                "MyNFT__ExceedsMaxNFTsPerWallet"
            )
        })
        it("Does not mint if less funds are sent", async function () {
            await myNft.togglePublicSale()
            await expect(
                myNft.mint(nftQuantity, {
                    value: ethers.utils.parseEther("0.002"),
                })
            ).to.be.revertedWith("MyNFT__InsufficientFunds")
        })
        it("Mints the NFTs", async function () {
            await myNft.togglePublicSale()
            const tx = await myNft.mint(nftQuantity, {
                value: ethers.utils.parseEther(PUBLIC_SALE_PRICE),
            })
            await tx.wait(1)
            const nftBalance = await myNft.balanceOf(deployer)
            // console.log("NFT Balance is: ", nftBalance.toString())
            assert.equal(nftBalance.toString(), nftQuantity.toString())
        })
    })

    describe("Whitelist Mint", async function () {
        beforeEach(async () => {
            const leaves = addresses.map((x) => keccak256(x))
            const tree = new MerkleTree(leaves, keccak256, { sortPairs: true })
            const buff2hex = (x) => "0x" + x.toString("hex")
            const merkleRoot = buff2hex(tree.getRoot())
            // console.log("MerkleRoot is: ", merkleRoot)
            const leaf = keccak256(deployer)
            merkleProof = tree.getProof(leaf).map((x) => buff2hex(x.data))
            // console.log("MerkleProof is: ", merkleProof)
        })
        it("Only mints when whitelist public sale is active", async function () {
            const accounts = await ethers.getSigners()
            const attacker = accounts[1]
            const attackerConnectedContract = await myNft.connect(attacker)
            await expect(
                attackerConnectedContract.whitelistMint(
                    merkleProof,
                    nftQuantity
                )
            ).to.be.revertedWith("MyNFT__WhiteListSaleNotActive")
        })
        it("Does not mint more than the max supply", async function () {
            await myNft.toggleWhiteListSale()
            // console.log("Contract unpaused, checking for max supply next.")
            await expect(
                myNft.whitelistMint(merkleProof, 1000)
            ).to.be.revertedWith("MyNFT__ExceedsMaxSupply")
        })
        it("Does not mint more than the max nfts per wallet for whitelist mint", async function () {
            await myNft.toggleWhiteListSale()
            await expect(
                myNft.whitelistMint(merkleProof, 10)
            ).to.be.revertedWith("MyNFT__ExceedsMaxWhiteListNFTsPerWallet")
        })
        it("Does not mint if less funds are sent", async function () {
            await myNft.toggleWhiteListSale()
            await expect(
                myNft.whitelistMint(merkleProof, nftQuantity, {
                    value: ethers.utils.parseEther("0.002"),
                })
            ).to.be.revertedWith("MyNFT__InsufficientFunds")
        })
        it("Whitelist Mints the NFTs", async function () {
            await myNft.toggleWhiteListSale()
            const tx = await myNft.whitelistMint(merkleProof, nftQuantity, {
                value: ethers.utils.parseEther(WHITELIST_SALE_PRICE),
            })
            await tx.wait(1)
            const nftBalance = await myNft.balanceOf(deployer)
            // console.log("NFT Balance is: ", nftBalance.toString())
            assert.equal(nftBalance.toString(), nftQuantity.toString())
        })
    })

    describe("Team Mint", async function () {
        it("does not mint NFTs for team if the caller is not deployer", async function () {
            const accounts = await ethers.getSigners()
            const attacker = accounts[1]
            const attackerConnectedContract = await myNft.connect(attacker)
            await expect(
                attackerConnectedContract.teamMint()
            ).to.be.revertedWith("Ownable: caller is not the owner")
        })
        it("Mints NFTs for Team", async function () {
            const tx = await myNft.teamMint()
            await tx.wait(1)
            const nftBalance = await myNft.balanceOf(deployer)
            // console.log("NFT Balance is: ", nftBalance.toString())
            assert.equal(nftBalance.toString(), teamMintQuantity.toString())
        })
    })

    describe("Withdraw", async function () {
        it("does not execute withdraw function if the caller is not deployer", async function () {
            const accounts = await ethers.getSigners()
            const attacker = accounts[1]
            const attackerConnectedContract = await myNft.connect(attacker)
            await expect(
                attackerConnectedContract.teamMint()
            ).to.be.revertedWith("Ownable: caller is not the owner")
        })
        it("withdraws the entire contract balance to deployer's wallet", async () => {
            const currentBalance = await ethers.provider.getBalance(
                myNft.address
            )
            // console.log("Current Balance is: ", currentBalance.toString())
            await myNft.togglePublicSale()
            const tx = await myNft.mint(nftQuantity, {
                value: ethers.utils.parseEther(PUBLIC_SALE_PRICE),
            })
            await tx.wait(1)
            const newBalance = await ethers.provider.getBalance(myNft.address)
            // console.log("New Balance is: ",ethers.utils.formatEther(newBalance).toString())
            assert.equal(
                ethers.utils.formatEther(newBalance).toString(),
                PUBLIC_SALE_PRICE.toString()
            )
        })
    })

    describe("setTokenUri", async function () {
        it("does not set token uri if caller is not deployer", async function () {
            const accounts = await ethers.getSigners()
            const attacker = accounts[1]
            const attackerConnectedContract = await myNft.connect(attacker)
            await expect(
                attackerConnectedContract.teamMint()
            ).to.be.revertedWith("Ownable: caller is not the owner")
        })

        it("sets the token uri", async function () {
            const tx = await myNft.setTokenUri(tokenUri)
            await tx.wait(1)
            const getTokenUri = await myNft.baseTokenUri()
            assert.equal(getTokenUri, tokenUri)
        })
    })

    describe("Set Placeholder token uri", async function () {
        it("does not set Placeholder token uri if caller is not deployer", async function () {
            const accounts = await ethers.getSigners()
            const attacker = accounts[1]
            const attackerConnectedContract = await myNft.connect(attacker)
            await expect(
                attackerConnectedContract.teamMint()
            ).to.be.revertedWith("Ownable: caller is not the owner")
        })

        it("sets the placeholder token uri", async function () {
            const tx = await myNft.setPlaceHolderUri(placeholderTokenUri)
            await tx.wait(1)
            const getPlaceHolderTokenUri = await myNft.placeholderTokenUri()
            assert.equal(getPlaceHolderTokenUri, placeholderTokenUri)
        })
    })

    describe("Get Merkle Root", async function () {
        it("should return correct merkle root", async function () {
            const response = await myNft.getMerkleRoot()
            assert.equal(response, merkleRoot)
        })
    })

    describe("Toggles the pause status on contract", async function () {
        it("does not switch the pause status if caller is not deployer", async function () {
            const accounts = await ethers.getSigners()
            const attacker = accounts[1]
            const attackerConnectedContract = await myNft.connect(attacker)
            await expect(
                attackerConnectedContract.togglePause()
            ).to.be.revertedWith("Ownable: caller is not the owner")
        })

        it("Toggles the pause status", async function () {
            // const pauseStatusold = await myNft.pause()
            // console.log(`Pause status old of contract is: ${pauseStatusold}`)
            const tx = await myNft.togglePause()
            await tx.wait(1)
            const pauseStatus = await myNft.pause()
            // console.log(`Pause status of contract is: ${pauseStatus}`)
            assert.equal(pauseStatus, true)
        })
    })

    describe("Toggles whitelist sale", async () => {
        it("does not switch the toggle status for whitelist sale if caller is not deployer", async function () {
            const accounts = await ethers.getSigners()
            const attacker = accounts[1]
            const attackerConnectedContract = await myNft.connect(attacker)
            await expect(
                attackerConnectedContract.toggleWhiteListSale()
            ).to.be.revertedWith("Ownable: caller is not the owner")
        })
        it("Toggles the whitelist pause status", async function () {
            const tx = await myNft.toggleWhiteListSale()
            await tx.wait(1)
            const pauseStatus = await myNft.whiteListSale()
            assert.equal(pauseStatus, true)
        })
    })

    describe("Toggles public sale", async () => {
        it("does not switch the toggle status for public sale if caller is not deployer", async function () {
            const accounts = await ethers.getSigners()
            const attacker = accounts[1]
            const attackerConnectedContract = await myNft.connect(attacker)
            await expect(
                attackerConnectedContract.togglePublicSale()
            ).to.be.revertedWith("Ownable: caller is not the owner")
        })
        it("Toggles the whitelist pause status", async function () {
            const tx = await myNft.togglePublicSale()
            await tx.wait(1)
            const pauseStatus = await myNft.publicSale()
            assert.equal(pauseStatus, true)
        })
    })
    describe("Toggles NFT Reveal", async () => {
        it("does not switch the toggle status for NFT Reveal if caller is not deployer", async function () {
            const accounts = await ethers.getSigners()
            const attacker = accounts[1]
            const attackerConnectedContract = await myNft.connect(attacker)
            await expect(
                attackerConnectedContract.toggleReveal()
            ).to.be.revertedWith("Ownable: caller is not the owner")
        })
        it("Toggles the whitelist pause status", async function () {
            const tx = await myNft.toggleReveal()
            await tx.wait(1)
            const pauseStatus = await myNft.isRevealed()
            assert.equal(pauseStatus, true)
        })
    })
})
