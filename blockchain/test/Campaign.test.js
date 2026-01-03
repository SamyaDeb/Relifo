const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Relifo Smart Contracts - Test Suite", function () {
  let reliefToken, campaignFactory, campaign, beneficiaryWallet;
  let owner, organizer, donor, beneficiary, merchant;

  // Deploy contracts before each test
  beforeEach(async function () {
    [owner, organizer, donor, beneficiary, merchant] = await ethers.getSigners();

    // Deploy ReliefToken
    const ReliefToken = await ethers.getContractFactory("ReliefToken");
    reliefToken = await ReliefToken.deploy(owner.address);
    await reliefToken.waitForDeployment();

    // Deploy CampaignFactory
    const CampaignFactory = await ethers.getContractFactory("CampaignFactory");
    campaignFactory = await CampaignFactory.deploy(
      await reliefToken.getAddress(),
      owner.address
    );
    await campaignFactory.waitForDeployment();

    // Approve organizer
    await campaignFactory.approveOrganizer(organizer.address);

    // Transfer tokens to donor
    await reliefToken.transfer(donor.address, ethers.parseEther("1000"));
  });

  describe("✅ ReliefToken Tests", function () {
    it("Should deploy with 10M tokens", async function () {
      const supply = await reliefToken.totalSupply();
      expect(supply).to.equal(ethers.parseEther("10000000"));
    });

    it("Should have correct name and symbol", async function () {
      expect(await reliefToken.name()).to.equal("Relief Token");
      expect(await reliefToken.symbol()).to.equal("RELIEF");
    });

    it("Should transfer tokens", async function () {
      await reliefToken.transfer(donor.address, ethers.parseEther("100"));
      const balance = await reliefToken.balanceOf(donor.address);
      expect(balance).to.equal(ethers.parseEther("1100"));
    });
  });

  describe("✅ CampaignFactory Tests", function () {
    it("Should approve organizer", async function () {
      const isApproved = await campaignFactory.approvedOrganizers(organizer.address);
      expect(isApproved).to.be.true;
    });

    it("Should create campaign", async function () {
      const tx = await campaignFactory.connect(organizer).createCampaign(
        "Flood Relief",
        "Help victims",
        ethers.parseEther("50000"),
        "Kerala",
        "Flood"
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          const parsed = campaignFactory.interface.parseLog(log);
          return parsed && parsed.name === "CampaignCreated";
        } catch {
          return false;
        }
      });
      expect(event).to.not.be.undefined;
    });

    it("Should reject unapproved organizer", async function () {
      await expect(
        campaignFactory.connect(beneficiary).createCampaign(
          "Test",
          "Test",
          ethers.parseEther("1000"),
          "Test",
          "Test"
        )
      ).to.be.revertedWith("CampaignFactory: Not an approved organizer");
    });
  });

  describe("✅ Campaign Tests", function () {
    beforeEach(async function () {
      const tx = await campaignFactory.connect(organizer).createCampaign(
        "Flood Relief",
        "Help victims",
        ethers.parseEther("50000"),
        "Kerala",
        "Flood"
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          const parsed = campaignFactory.interface.parseLog(log);
          return parsed && parsed.name === "CampaignCreated";
        } catch {
          return false;
        }
      });
      campaign = await ethers.getContractAt("Campaign", event.args[0]);
    });

    it("Should have correct initial values", async function () {
      const info = await campaign.campaignInfo();
      expect(info.title).to.equal("Flood Relief");
      expect(info.goalAmount).to.equal(ethers.parseEther("50000"));
      expect(info.raisedAmount).to.equal(0);
    });

    it("Should accept donations", async function () {
      const amount = ethers.parseEther("100");
      await reliefToken.connect(donor).approve(await campaign.getAddress(), amount);
      await campaign.connect(donor).donate(amount);
      
      const info = await campaign.campaignInfo();
      expect(info.raisedAmount).to.equal(amount);
    });

    it("Should reject zero donations", async function () {
      await expect(
        campaign.connect(donor).donate(0)
      ).to.be.revertedWith("Campaign: Amount must be greater than 0");
    });

    it("Should allocate funds to beneficiary", async function () {
      // Donate first
      const donation = ethers.parseEther("100");
      await reliefToken.connect(donor).approve(await campaign.getAddress(), donation);
      await campaign.connect(donor).donate(donation);

      // Allocate
      await campaign.connect(organizer).allocateFunds(
        beneficiary.address,
        ethers.parseEther("50")
      );

      const allocation = await campaign.beneficiaryAllocations(beneficiary.address);
      expect(allocation).to.equal(ethers.parseEther("50"));
    });

    it("Should reject unauthorized allocation", async function () {
      const donation = ethers.parseEther("100");
      await reliefToken.connect(donor).approve(await campaign.getAddress(), donation);
      await campaign.connect(donor).donate(donation);

      await expect(
        campaign.connect(beneficiary).allocateFunds(
          beneficiary.address,
          ethers.parseEther("50")
        )
      ).to.be.revertedWith("Campaign: Only organizer or admin");
    });
  });

  describe("✅ BeneficiaryWallet Tests", function () {
    beforeEach(async function () {
      // Create campaign
      const tx = await campaignFactory.connect(organizer).createCampaign(
        "Test Campaign",
        "Test",
        ethers.parseEther("50000"),
        "Test",
        "Test"
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          const parsed = campaignFactory.interface.parseLog(log);
          return parsed && parsed.name === "CampaignCreated";
        } catch {
          return false;
        }
      });
      campaign = await ethers.getContractAt("Campaign", event.args[0]);

      // Donate and allocate
      const donation = ethers.parseEther("1000");
      await reliefToken.connect(donor).approve(await campaign.getAddress(), donation);
      await campaign.connect(donor).donate(donation);

      // Allocate funds - function returns wallet address
      const walletAddress = await campaign.connect(organizer).allocateFunds.staticCall(
        beneficiary.address,
        ethers.parseEther("500")
      );
      
      // Execute the transaction
      await campaign.connect(organizer).allocateFunds(
        beneficiary.address,
        ethers.parseEther("500")
      );
      
      beneficiaryWallet = await ethers.getContractAt("BeneficiaryWallet", walletAddress);
    });

    it("Should have correct balance", async function () {
      const balance = await beneficiaryWallet.getBalance();
      expect(balance).to.equal(ethers.parseEther("500"));
    });

    it("Should allow approved merchant spending", async function () {
      await beneficiaryWallet.connect(organizer).approveMerchant(merchant.address, 0);
      
      await beneficiaryWallet.connect(beneficiary).spend(
        merchant.address,
        ethers.parseEther("50"),
        0,
        "Food"
      );

      const balance = await beneficiaryWallet.getBalance();
      expect(balance).to.equal(ethers.parseEther("450"));
    });

    it("Should reject unapproved merchant", async function () {
      await expect(
        beneficiaryWallet.connect(beneficiary).spend(
          merchant.address,
          ethers.parseEther("50"),
          0,
          "Food"
        )
      ).to.be.revertedWith("BeneficiaryWallet: Merchant not approved for this category");
    });
  });

  describe("🎯 Complete Integration Test", function () {
    it("Should complete full disaster relief cycle", async function () {
      console.log("\n🔄 Testing complete flow...\n");

      // 1. Create campaign
      const tx = await campaignFactory.connect(organizer).createCampaign(
        "Kerala Flood Relief",
        "Help victims",
        ethers.parseEther("100000"),
        "Kerala",
        "Flood"
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          const parsed = campaignFactory.interface.parseLog(log);
          return parsed && parsed.name === "CampaignCreated";
        } catch {
          return false;
        }
      });
      campaign = await ethers.getContractAt("Campaign", event.args[0]);
      console.log("1️⃣ Campaign created ✅");

      // 2. Donate
      const donationAmount = ethers.parseEther("500");
      await reliefToken.connect(donor).approve(await campaign.getAddress(), donationAmount);
      await campaign.connect(donor).donate(donationAmount);
      console.log("2️⃣ Donation received ✅");

      // 3. Allocate to beneficiary - get wallet address from return value
      const walletAddress = await campaign.connect(organizer).allocateFunds.staticCall(
        beneficiary.address,
        ethers.parseEther("200")
      );
      
      // Execute the actual transaction
      await campaign.connect(organizer).allocateFunds(
        beneficiary.address,
        ethers.parseEther("200")
      );
      
      beneficiaryWallet = await ethers.getContractAt("BeneficiaryWallet", walletAddress);
      console.log("3️⃣ Funds allocated ✅");

      // 4. Approve merchant and spend
      await beneficiaryWallet.connect(organizer).approveMerchant(merchant.address, 0);
      await beneficiaryWallet.connect(beneficiary).spend(
        merchant.address,
        ethers.parseEther("50"),
        0,
        "Food"
      );
      console.log("4️⃣ Beneficiary spent funds ✅");

      // Verify results
      const campaignInfo = await campaign.campaignInfo();
      const walletBalance = await beneficiaryWallet.getBalance();
      const merchantBalance = await reliefToken.balanceOf(merchant.address);

      expect(campaignInfo.raisedAmount).to.equal(donationAmount);
      expect(walletBalance).to.equal(ethers.parseEther("150"));
      expect(merchantBalance).to.equal(ethers.parseEther("50"));

      console.log("\n✅ COMPLETE FLOW SUCCESSFUL!\n");
      console.log("Campaign raised:", ethers.formatEther(campaignInfo.raisedAmount), "RELIEF");
      console.log("Wallet balance:", ethers.formatEther(walletBalance), "RELIEF");
      console.log("Merchant received:", ethers.formatEther(merchantBalance), "RELIEF\n");
    });
  });
});
