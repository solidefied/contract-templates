const { expect } = require("chai");
const { ethers } = require("hardhat");
const keccak256 = require("keccak256");
const { default: MerkleTree } = require("merkletreejs");
describe("Governance Sale", () => {
    var acc1;
    var acc2;
    var acc3;
    var acc4;
    var acc5;
    var NFT;
    var SALE;
    var USDT;
    var tree;
    var buf2Hex;
    const zeroAdd = "0x0000000000000000000000000000000000000000";

    before("Deployment and token distribution", async () => {
        [acc1, acc2, acc3, acc4, acc5] = await ethers.getSigners();
        const addresses = [acc1.address, acc2.address, acc3.address, acc4.address]
        const leaves = addresses.map(x => keccak256(x));
        tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
        buf2Hex = x => "0x" + x.toString('hex');
        const root = buf2Hex(tree.getRoot());

        const token1Contract = await ethers.getContractFactory("TetherToken");
        USDT = await token1Contract.deploy(1000000000000, "USDT", "USDT", 6);
        await USDT.deployed();
        const transferToken = await USDT.connect(acc1).transfer(acc2.address, ethers.BigNumber.from(10).pow(6).mul(20000));
        await transferToken.wait();
        const transferTokenToAcc3 = await USDT.connect(acc1).transfer(acc3.address, ethers.BigNumber.from(10).pow(6).mul(20000));
        await transferTokenToAcc3.wait();
        const nftContract = await ethers.getContractFactory("ERC721_Fixed_Common");
        NFT = await nftContract.deploy(acc1.address, "TOKEN.TEST.xyz", 80, "TEST-NFT", "TNFT");
        await NFT.deployed();
        const nftsaleContract = await ethers.getContractFactory("NFTSale");
        SALE = await nftsaleContract.deploy(80, 40, 2, NFT.address, USDT.address, root);
        await SALE.deployed();
        const checkSetToTrue = await SALE.connect(acc1).setWhitelist(true);
        await checkSetToTrue.wait();
        const setAsMinter = await NFT.connect(acc1).setMinterRole(SALE.address);
        await setAsMinter.wait();
    });

    describe("Buy Token with USDT", () => {
        before("Buy func", async () => {
            const proof = tree.getProof(keccak256(acc2.address)).map(x => buf2Hex(x.data))
            const approveContract = await USDT.connect(acc2).approve(SALE.address, ethers.BigNumber.from(2).pow(256).sub(1))
            await approveContract.wait();
            const nftPurchaseTxn = await SALE.connect(acc2).buyNFTWithToken( proof,40);
            await nftPurchaseTxn.wait();
        })
        it("Test that,NFT is Purchased by acc2", async () => {
            expect(await USDT.balanceOf(SALE.address)).to.equal(ethers.BigNumber.from(10).pow(6).mul(80))
            expect(await NFT.balanceOf(acc2.address)).to.equal(40)
        });
        it("Error:User should get error for exceed allowance",async ()=>{
            const proof = tree.getProof(keccak256(acc2.address)).map(x => buf2Hex(x.data))
            await expect(SALE.connect(acc2).buyNFTWithToken( proof,20)).to.be.revertedWith("Exceed allowance")
        });
    })

    describe("Buy Token with USDT by acc3", () => {
        before("Buy func", async () => {
            const proof = tree.getProof(keccak256(acc3.address)).map(x => buf2Hex(x.data))
            const approveContract = await USDT.connect(acc3).approve(SALE.address, ethers.BigNumber.from(2).pow(256).sub(1))
            await approveContract.wait();
            const nftPurchaseTxn = await SALE.connect(acc3).buyNFTWithToken( proof,40);
            await nftPurchaseTxn.wait();
        })
        it("Test that,NFT is Purchased by acc2", async () => {
            expect(await USDT.balanceOf(SALE.address)).to.equal(ethers.BigNumber.from(10).pow(6).mul(160))
            expect(await NFT.balanceOf(acc2.address)).to.equal(40)
        });
        it("Error:User should get error for hardcap amount is reached",async ()=>{
            const proof = tree.getProof(keccak256(acc3.address)).map(x => buf2Hex(x.data))
            await expect(SALE.connect(acc3).buyNFTWithToken( proof,20)).to.be.revertedWith("Exceed hardcap amount")
        });
    })

   

    describe("set new USD price ", () => {
        before("setter func", async () => {
            const setNewUSDPrice = await SALE.connect(acc1).setPriceUSD(4);
            await setNewUSDPrice.wait();
        })
        it("Test that,NFT is Purchased by acc4", async () => {
            expect(await SALE.priceInUSD()).to.equal(4 * 10**4)
        })
    })

    describe("set new treasury address ", () => {
        before("setter func", async () => {
            const setNewTreasury = await SALE.connect(acc1).setTreasury(acc5.address);
            await setNewTreasury.wait();
        })
        it("Test that,NFT is Purchased by acc4", async () => {
            expect(await SALE.TREASURY()).to.equal(acc5.address)
        })
    })

    describe("set whitelist disable ", () => {
        before("setter func", async () => {
            const setWhitelistDisable = await SALE.connect(acc1).setWhitelist(false);
            await setWhitelistDisable.wait();
        })
        it("Test that,NFT is Purchased by acc4", async () => {
            expect(await SALE.iswhitelist()).to.equal(false);
        })
    })

    describe("Pause Sale", () => {
        before("pause func", async () => {
            const pauseTxn = await SALE.connect(acc1).pause();
            await pauseTxn.wait();
        })
        it("check that sale is paused", async () => {
            expect(await SALE.paused()).to.equal(true)
        })
    })

    describe("Withdraw USDT token  ", () => {
        before("Withdraw USDT token func", async () => {
            const withdrawTokenTxn = await SALE.connect(acc1).withdrawTokens( ethers.BigNumber.from(10).pow(6).mul(20));
            await withdrawTokenTxn.wait();
        })
        it("Check balance is transfer to or not and it would be 10ETH", async () => {
            expect(await USDT.balanceOf(acc5.address)).to.equal(ethers.BigNumber.from(10).pow(6).mul(20));
        })
        it("Error:Contract should give error for unauthorized txn by acc3", async () => {
            await expect(SALE.connect(acc3).withdrawTokens(ethers.BigNumber.from(10).pow(18).mul(20))).to.be.revertedWith("Ownable: caller is not the owner")
        })
    });

    describe("Unpause Sale", () => {
        before("unpause func", async () => {
            const unpauseTxn = await SALE.connect(acc1).unpause();
            await unpauseTxn.wait();
        })
        it("check that sale is paused", async () => {
            expect(await SALE.paused()).to.equal(false)
        })
    })

    describe("set acc5 as an new onwer", () => {
        before("setter func", async () => {
            const transferOwnerShipToAcc6 = await SALE.connect(acc1).transferOwnership(acc5.address);
            await transferOwnerShipToAcc6.wait();
        })
        it("Test that acc6 is new owner", async () => {
            expect(await SALE.owner()).to.equal(acc5.address)
        })
        it("Error:Contract should give error for unauthorized txn by acc3", async () => {
            await expect(SALE.connect(acc3).transferOwnership(acc5.address)).to.be.revertedWith("Ownable: caller is not the owner")
        })
    })

    describe("renounce onwership ", () => {
        before("renounce ownership func", async () => {
            const transferOwnerShipToZeroAdd = await SALE.connect(acc5).renounceOwnership();
            await transferOwnerShipToZeroAdd.wait();
        })
        it("Test that acc6 is new owner", async () => {
            expect(await SALE.owner()).to.equal(zeroAdd)
        })
        it("Error:Contract should give error for unauthorized txn by acc3", async () => {
            await expect(SALE.connect(acc3).renounceOwnership()).to.be.revertedWith("Ownable: caller is not the owner")
        })
    })
});