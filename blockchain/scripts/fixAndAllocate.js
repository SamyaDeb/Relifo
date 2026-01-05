const { ethers } = require("hardhat");

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Admin account:", signer.address);
  
  // The campaign from the error
  const CAMPAIGN_ADDRESS = "0xcda4ec0bfd410539467617b3f943d57be5ea3dbb";
  const BENEFICIARY = "0xC69c2F20D27d9dd12473c27D0691243d4Deed087";
  const ORGANIZER = "0xe4E6f890f04A077d39A8C4a1CB7D59Ac6825e76A";
  const RELIEF_TOKEN = "0x2e3f557A6De6dFb63aB583991Ec77E3270d1D20e";
  
  const Campaign = await ethers.getContractFactory("Campaign");
  const ReliefToken = await ethers.getContractFactory("ReliefToken");
  
  const campaign = Campaign.attach(CAMPAIGN_ADDRESS);
  const token = ReliefToken.attach(RELIEF_TOKEN);
  
  // Check campaign state
  let info = await campaign.campaignInfo();
  let totalAllocated = await campaign.totalAllocated();
  let available = info.raisedAmount - totalAllocated;
  
  console.log("\nCampaign:", info.title);
  console.log("Raised:", ethers.formatEther(info.raisedAmount), "RELIEF");
  console.log("Allocated:", ethers.formatEther(totalAllocated), "RELIEF");
  console.log("Available:", ethers.formatEther(available), "RELIEF");
  console.log("Organizer:", info.organizer);
  console.log("Admin:", info.admin);
  
  // Check current beneficiary wallet
  let wallet = await campaign.getBeneficiaryWallet(BENEFICIARY);
  console.log("\nBeneficiary:", BENEFICIARY);
  console.log("Current Wallet:", wallet);
  
  // Step 1: Donate 500 RELIEF to the campaign
  console.log("\n💰 Step 1: Donating 500 RELIEF to campaign...");
  const donateAmount = ethers.parseEther("500");
  
  // Approve first
  console.log("Approving tokens...");
  const approveTx = await token.approve(CAMPAIGN_ADDRESS, donateAmount);
  await approveTx.wait();
  console.log("✅ Approved");
  
  // Donate
  console.log("Donating...");
  const donateTx = await campaign.donate(donateAmount);
  await donateTx.wait();
  console.log("✅ Donated 500 RELIEF");
  
  // Refresh campaign info
  info = await campaign.campaignInfo();
  totalAllocated = await campaign.totalAllocated();
  available = info.raisedAmount - totalAllocated;
  console.log("\nUpdated Campaign State:");
  console.log("Raised:", ethers.formatEther(info.raisedAmount), "RELIEF");
  console.log("Available:", ethers.formatEther(available), "RELIEF");
  
  // Step 2: Allocate funds to beneficiary
  const allocateAmount = ethers.parseEther("200"); // Allocate 200 RELIEF
  
  console.log("\n📤 Step 2: Allocating", ethers.formatEther(allocateAmount), "RELIEF to beneficiary...");
  
  try {
    const tx = await campaign.allocateFunds(BENEFICIARY, allocateAmount);
    console.log("Transaction hash:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Allocation successful!");
    
    // Get the new wallet
    wallet = await campaign.getBeneficiaryWallet(BENEFICIARY);
    console.log("\n🎉 Beneficiary Wallet Created:", wallet);
    
    // Check balance
    const balance = await token.balanceOf(wallet);
    console.log("Wallet Balance:", ethers.formatEther(balance), "RELIEF");
    
    console.log("\n========== SUCCESS ==========");
    console.log("Beneficiary:", BENEFICIARY);
    console.log("Wallet:", wallet);
    console.log("Balance:", ethers.formatEther(balance), "RELIEF");
    console.log("Campaign:", CAMPAIGN_ADDRESS);
    console.log("==============================");
    
  } catch (error) {
    console.error("❌ Allocation failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
