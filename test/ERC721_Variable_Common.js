const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ERC721 Variable Supply - Comman URI", () => {
    var acc1;
    var acc2;
    var acc3;
    var acc4;
    var acc5;
    var nft;
    var MINTER_ROLE;
    var token;
    const zeroHex = "0x0000000000000000000000000000000000000000000000000000000000000000";
    const zeroAdd = "0x0000000000000000000000000000000000000000";

    before("Initial Declaration", async () => {
        [acc1, acc2, acc3, acc4, acc5] = await ethers.getSigners();
        const ContractDeploy = await ethers.getContractFactory("ERC721_Variable_Common");
        const NFTContract = await ContractDeploy.deploy(acc1.address, "Test.ipfs://afavbvwvsvsv", "FixedCommon", "FC");
        nft = await NFTContract.deployed();
        MINTER_ROLE = await nft.MINTER_ROLE();
        const tokenContract = await ethers.getContractFactory("BaseERC20");
        token = await tokenContract.deploy("Test Token", "TT");
        await token.deployed();
        const tokenTrnsferTxn = await token.connect(acc1).transfer(nft.address, ethers.BigNumber.from(10).pow(18).mul(1000))
        await tokenTrnsferTxn.wait();
    })

    it("Check that inital values is same as declared", async () => {
        expect(await nft.baseURI()).to.equal("Test.ipfs://afavbvwvsvsv");
        expect(await nft.name()).to.equal("FixedCommon");
        expect(await nft.symbol()).to.equal("FC");
    })

    it("Check that acc1 has a minter role", async () => {
        expect(await nft.hasRole(MINTER_ROLE, acc1.address)).to.equal(true);
    });

    it("Check that acc2 has not a minter role", async () => {
        expect(await nft.hasRole(MINTER_ROLE, acc2.address)).to.equal(false);
    });

    describe("Mint NFT Token for acc2", () => {
        before("minter func", async () => {
            const mintTokenTxn = await nft.connect(acc1).mintToken(acc2.address);
            await mintTokenTxn.wait();
        });

        it("Check token is minted or not", async () => {
            expect(await nft.ownerOf(0)).to.equal(acc2.address);
        });

        it("Error should generated error when passed address is Null", async () => {
            await expect(nft.connect(acc1).mintToken(zeroAdd)).to.be.revertedWith("ERC721: mint to the zero address");
        });

        it("Error:Contract should give error for unauthorized txn by acc3", async () => {
            await expect(nft.connect(acc3).mintToken(acc2.address)).to.be.revertedWith(`AccessControl: account ${acc3.address.toLowerCase()} is missing role ${MINTER_ROLE}`);
        });
    });

    describe("Set New BaseURI", () => {
        before("set baseuri func", async () => {
            const setBaseURItxn = await nft.connect(acc1).setBaseURI("ipfs://afavbvwvsq1eer1rfd541vsv");
            await setBaseURItxn.wait();
        });

        it("Check base uri is setted or not", async () => {
            expect(await nft.baseURI()).to.equal("ipfs://afavbvwvsq1eer1rfd541vsv");
        });

        it("Error:Contract should give error for unauthorized txn by acc3", async () => {
            await expect(nft.connect(acc3).setBaseURI("xyzx.com")).to.be.revertedWith(`AccessControl: account ${acc3.address.toLowerCase()} is missing role ${zeroHex}`);
        });
    });

    describe("Set new treasury", () => {
        before("set treasury func", async () => {
            const setBaseURItxn = await nft.connect(acc1).setTreasury(acc5.address);
            await setBaseURItxn.wait();
        });

        it("Error:Contract should give error for unauthorized txn by acc3", async () => {
            await expect(nft.connect(acc3).setTreasury(acc5.address)).to.be.revertedWith(`AccessControl: account ${acc3.address.toLowerCase()} is missing role ${zeroHex}`);
        });
    });

    describe("Transfer NFT to acc3", () => {
        before("safe transfer funcs", async () => {
            const TransferFromTxn = await nft.connect(acc2).transferFrom(acc2.address, acc3.address, 0);
            await TransferFromTxn.wait();
        });

        it("Check token is transfered or not", async () => {
            expect(await nft.ownerOf(0)).to.equal(acc3.address);
        });
    });

    describe("Grant Minter role to acc2", () => {
        before("grant role func", async () => {
            const setMinterTxn = await nft.connect(acc1).grantRole(MINTER_ROLE, acc2.address); //assigned minter role to acc1
            await setMinterTxn.wait();
        });

        it("Check that acc2 has a minter role", async () => {
            expect(await nft.hasRole(MINTER_ROLE, acc2.address)).to.equal(true);
        });

        it("Error:Contract should give error for unauthorized txn by acc3", async () => {
            await expect(nft.connect(acc3).grantRole(MINTER_ROLE, acc2.address)).to.be.revertedWith(`AccessControl: account ${acc3.address.toLowerCase()} is missing role ${zeroHex}`);
        });
    });

    describe("Revoke Minter Role from acc2", () => {
        before("revoke role func", async () => {
            const RevokeMinterRoleTxn = await nft.connect(acc1).revokeRole(MINTER_ROLE, acc2.address);
            await RevokeMinterRoleTxn.wait();
        });

        it("Check that acc2 has not a minter role", async () => {
            expect(await nft.hasRole(MINTER_ROLE, acc2.address)).to.equal(false);
        });

        it("Error:Contract should give error for unauthorized txn by acc3", async () => {
            await expect(nft.connect(acc3).revokeRole(MINTER_ROLE, acc2.address)).to.be.revertedWith(`AccessControl: account ${acc3.address.toLowerCase()} is missing role ${zeroHex}`);
        });
    });

    describe("Grant Minter role to acc2", () => {
        before("grant role func", async () => {
            const setMinterTxn = await nft.connect(acc1).grantRole(MINTER_ROLE, acc2.address); //assigned minter role to acc1
            await setMinterTxn.wait();
        });

        it("Check that acc2 has a minter role", async () => {
            expect(await nft.hasRole(MINTER_ROLE, acc2.address)).to.equal(true);
        });

        it("Error:Contract should give error for unauthorized txn by acc3", async () => {
            await expect(nft.connect(acc3).grantRole(MINTER_ROLE, acc2.address)).to.be.revertedWith(`AccessControl: account ${acc3.address.toLowerCase()} is missing role ${zeroHex}`);
        });
    });

    describe("Renounce Minter Role of acc2", () => {
        before("revoke role func", async () => {
            const RenounceMinterRoleTxn = await nft.connect(acc2).renounceRole(MINTER_ROLE, acc2.address);
            await RenounceMinterRoleTxn.wait();
        });

        it("Check that acc2 has not a minter role", async () => {
            expect(await nft.hasRole(MINTER_ROLE, acc2.address)).to.equal(false);
        });

        it("Error:Contract should give error for unauthorized txn by acc3", async () => {
            await expect(nft.connect(acc3).renounceRole(MINTER_ROLE, acc2.address)).to.be.revertedWith(`AccessControl: can only renounce roles for self`);
        });
    });

    describe("Withdraw Accidentally added token", () => {
        before("Withdraw func", async () => {
            const WithDrawTokenTxn = await nft.connect(acc1).withdrawAccidentalToken(token.address);
            await WithDrawTokenTxn.wait();
        });

        it("Test that accidentally token should be transfered to treasuryAddress", async () => {
            expect(await token.balanceOf(acc5.address)).to.equal(ethers.BigNumber.from(10).pow(18).mul(1000));
        });

        it("Error:Contract should give error for token balance is zero", async () => {
            await expect(nft.connect(acc1).withdrawAccidentalToken(token.address)).to.be.revertedWith("!BALANCE");
        });

        it("Error:Contract should give error for unauthorized txn by acc3", async () => {
            await expect(nft.connect(acc3).withdrawAccidentalToken(token.address)).to.be.revertedWith(`AccessControl: account ${acc3.address.toLowerCase()} is missing role ${zeroHex}`);
        });
    })
})