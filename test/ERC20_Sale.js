const { expect } = require("chai");
const { ethers } = require("hardhat");
const keccak256 = require("keccak256");
const { default: MerkleTree } = require("merkletreejs");
describe("Sale", function () {
    let USDT;
    let sale;
    var acc1;
    var acc2;
    var acc3;
    var acc4;
    var acc5;
    var acc6;
    var buf2Hex;
    const zeroAdd = "0x0000000000000000000000000000000000000000";

    before(async function () {
        [acc1, acc2, acc3, acc4, acc5, acc6] = await ethers.getSigners();
        const addresses = [acc1.address, acc2.address, acc3.address, acc4.address]
        const leaves = addresses.map(x => keccak256(x));
        tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
        buf2Hex = x => "0x" + x.toString('hex');
        const root = buf2Hex(tree.getRoot());
        console.log('root: ', root);

        const token1Contract = await ethers.getContractFactory("TetherToken");
        USDT = await token1Contract.deploy(10000000000, "USDT", "USDT", 6);
        await USDT.deployed();
        const transferToken = await USDT.connect(acc1).transfer(acc2.address, ethers.BigNumber.from(10).pow(6).mul(200));
        await transferToken.wait();
        const transferTokenToAcc3 = await USDT.connect(acc1).transfer(acc3.address, ethers.BigNumber.from(10).pow(6).mul(200));
        await transferTokenToAcc3.wait();
        const Sale = await ethers.getContractFactory("ERC20Sale");
        sale = await Sale.deploy(2, 70, 35, USDT.address, root);
        await sale.deployed();
        const checkSetToTrue = await sale.connect(acc1).setWhitelist(true);
        await checkSetToTrue.wait();
    });

    it("Initial value checks", async () => {
        expect(await sale.owner()).to.equal(acc1.address);
        expect(await sale.paused()).to.equal(false);
        expect(await sale.iswhitelist()).to.equal(true);
        expect(await sale.priceInUSD()).to.equal(2);
        expect(await sale.USDT()).to.equal(USDT.address);
        expect(await sale.hardcap()).to.equal(70);
        expect(await sale.allowedUserBalance()).to.equal(35);
    });

    describe("Buying Token with USDT", () => {
        before("triggering funcs by user", async () => {
            const approveCall = await USDT.connect(acc2).approve(sale.address, ethers.BigNumber.from(2).pow(256).sub(1));
            await approveCall.wait();

            const proof = tree.getProof(keccak256(acc2.address)).map(x => buf2Hex(x.data))

            const buyTokenWithUSDTSendfunc = await sale.connect(acc2).buyToken(ethers.BigNumber.from(10).pow(6).mul(35), proof);
            await buyTokenWithUSDTSendfunc.wait();
        });

        it("Test that claimable amount should be 5 ETH", async function () {
            expect(await sale.claimable(acc2.address)).to.equal(ethers.BigNumber.from(10).pow(16).mul(1750));
        });

        it("ERROR:Non-Whitelisted user cannot buy token", async () => {
            const proof = tree.getProof(keccak256(acc5.address)).map(x => buf2Hex(x.data))
            await expect(sale.connect(acc5).buyToken(ethers.BigNumber.from(10).pow(6).mul(5), proof)).to.be.revertedWith("Unauthorized")
        });

        it("ERROR:User can not buy more then 35 token ", async () => {
            const proof = tree.getProof(keccak256(acc2.address)).map(x => buf2Hex(x.data))
            await expect(sale.connect(acc2).buyToken(ethers.BigNumber.from(10).pow(6).mul(25), proof)).to.be.rejectedWith("Exceeded allowance")
        });
    });

    describe("Buying Token with USDT", () => {
        before("triggering funcs by user", async () => {
            const approveCall = await USDT.connect(acc3).approve(sale.address, ethers.BigNumber.from(2).pow(256).sub(1));
            await approveCall.wait();

            const proof = tree.getProof(keccak256(acc3.address)).map(x => buf2Hex(x.data))

            const buyTokenWithUSDTSendfunc = await sale.connect(acc3).buyToken(ethers.BigNumber.from(10).pow(6).mul(35), proof);
            await buyTokenWithUSDTSendfunc.wait();
        });

        it("Test that claimable amount should be 5 ETH", async function () {
            expect(await sale.claimable(acc3.address)).to.equal(ethers.BigNumber.from(10).pow(16).mul(1750));
        });

        it("ERROR:Non-Whitelisted user cannot buy token", async () => {
            const proof = tree.getProof(keccak256(acc5.address)).map(x => buf2Hex(x.data))
            await expect(sale.connect(acc5).buyToken(ethers.BigNumber.from(10).pow(6).mul(5), proof)).to.be.revertedWith("Unauthorized")
        });

        it("ERROR:User can not buy more token then hardcap ", async () => {
            const proof = tree.getProof(keccak256(acc3.address)).map(x => buf2Hex(x.data))
            await expect(sale.connect(acc3).buyToken(ethers.BigNumber.from(10).pow(6).mul(25), proof)).to.be.rejectedWith("Hardcap reached")
        });
    });


    describe("Change hardcap ", () => {
        before("triggering funcs by owner", async () => {
            const changeHardCapAmount = await sale.connect(acc1).changeHardCap(350);
            await changeHardCapAmount.wait();
        });
        it("Test that Hardcap amount should be 350", async function () {
            expect(await sale.hardcap()).to.equal(350);
        });
        it("Error:Test that func should throw error for non-owner address", async () => {
            await expect(sale.connect(acc2).changeHardCap(300)).to.be.revertedWith("Ownable: caller is not the owner")
        });
    });

    describe("Change User allowed balance ", () => {
        before("triggering funcs by owner", async () => {
            const changeAllowedBalanceAmount = await sale.connect(acc1).changeAllowedUserBalance(150);
            await changeAllowedBalanceAmount.wait();
        });

        it("Test that User allowed balance should be 150", async function () {
            expect(await sale.allowedUserBalance()).to.equal(150);
        });
        it("Error:Test that func should throw error for non-owner address", async () => {
            await expect(sale.connect(acc2).changeAllowedUserBalance(150)).to.be.revertedWith("Ownable: caller is not the owner")
        });
    });


    describe("Change Ownership to acc5 ", () => {
        before("triggering funcs by owner", async () => {
            const changeOwner = await sale.connect(acc1).transferOwnership(acc5.address);
            await changeOwner.wait();
        });

        it("Acc5 should be the owner", async function () {
            expect(await sale.owner()).to.equal(acc5.address);
        });
        it("Error:Test that func should throw error for non-owner address", async () => {
            await expect(sale.connect(acc2).transferOwnership(acc4.address)).to.be.revertedWith("Ownable: caller is not the owner")
        })
    });

    describe("Fund withdraw", () => {
        it("Error:Test that func should throw error for round is not over yet", async () => {
            await expect(sale.connect(acc5).withdrawUSDT(ethers.BigNumber.from(10).pow(18).mul(10))).to.be.revertedWith("Pausable: not paused")
        })
    });

    describe("Set new treasury account", () => {
        before("triggering funcs by owner", async () => {
            const treasuryAccSet = await sale.connect(acc5).setTreasury(acc4.address);
            await treasuryAccSet.wait();
        });
        it("check that acc6 is treasury ", async () => {
            expect(await sale.TREASURY()).to.equal(acc4.address);
        })
    });

    describe("Transfer ERC20 Token", () => {
        before("triggering funcs by owner", async () => {
            const worngTrnsfer = await USDT.connect(acc2).transfer(sale.address, ethers.BigNumber.from(10).pow(6).mul(50));
            await worngTrnsfer.wait();
            const pauseSale = await sale.connect(acc5).pause();
            await pauseSale.wait();
            const transferTokenFromSale = await sale.connect(acc5).withdrawUSDT(ethers.BigNumber.from(10).pow(6).mul(50));
            await transferTokenFromSale.wait();
        });
        it("check token is transfered or not", async () => {
            expect(await USDT.balanceOf(acc4.address)).to.equal(ethers.BigNumber.from(10).pow(6).mul(50));
        })
        it("Error:Test that func should throw error for non-owner address", async () => {
            await expect(sale.connect(acc2).withdrawUSDT(ethers.BigNumber.from(10).pow(6).mul(50))).to.be.revertedWith("Ownable: caller is not the owner")
        })
    });

    describe("Renounce Ownership", () => {
        before("triggering funcs by owner", async () => {
            const changeOwnerToNullAdrs = await sale.connect(acc5).renounceOwnership();
            await changeOwnerToNullAdrs.wait();
        });
        it("check owner is null address or not", async () => {
            expect(await sale.owner()).to.equal("0x0000000000000000000000000000000000000000");
        })
        it("Error:Test that func should throw error for non-owner address", async () => {
            await expect(sale.connect(acc2).renounceOwnership()).to.be.revertedWith("Ownable: caller is not the owner")
        })
    });
});