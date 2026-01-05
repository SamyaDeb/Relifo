const { ethers } = require("hardhat");

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Admin account:", signer.address);
  
  // OLD campaign and its token
  const CAMPAIGN_ADDRESS = "0xcda4ec0bfd410539467617b3f943d57be5ea3dbb";
  const OLD_TOKEN = "0xc5740EF327ffaDAe587D463DC310023d7feAf119";
  const BENEFICIARY = "0xC69c2F20D27d9dd12473c27D0691243d4Deed087";
  
  const Campaign = await ethers.getContractFactory("Campaign");
  const ReliefToken = await ethers.getContractFactory("ReliefToken");
  
  const campaign = Campaign.attach(CAMPAIGN_ADDRESS);
  const token = ReliefToken.attach(OLD_TOKEN);
  
  // Check campaign state
  let info = await campaign.campaignInfo();
  let totalAllocated = await campaign.totalAllocated();
  let available = info.raisedAmount - totalAllocated;
  
  console.log("\n========== CAMPAIGN INFO ==========");
  console.log("Campaign:", CAMPAIGN_ADDRESS);
  console.log("Title:", info.title);
  console.log("Token:", OLD_TOKEN);
  console.log("Raised:", ethers.formatEther(info.raisedAmount), "RELIEF");
  console.log("Allocated:", ethers.formatEther(totalAllocated), "RELIEF");
  console.log("Available:", ethers.formatEther(available), "RELIEF");
  console.log("Organizer:", info.organizer);
  console.log("Admin:", info.admin);
  
  // Check beneficiary wallet
  let wallet = await campaign.getBeneficiaryWallet(BENEFICIARY);
  console.log("\n========== BENEFICIARY ==========");
  console.log("Beneficiary:", BENEFICIARY);
  console.log("Current Wallet:", wallet);
  
  // Check admin token balance
  const adminBalance = await token.balanceOf(signer.address);
  console.log("\n========== ADMIN TOKEN BALANCE ==========");
  console.log("Admin OLD token balance:", ethers.formatEther(adminBalance), "RELIEF");
  
  // Step 1: Donate 500 RELIEF to the campaign using OLD token
  console.log("\n💰 Step 1: Donating 500 RELIEF (OLD token) to campaign...");
  const donateAmount = ethers.parseEther("500");
  
  if (adminBalance < donateAmount) {
    console.error("❌ CRITICAL: Admin doesn't have enough tokens!");
    console.error("Required:", ethers.formatEther(donateAmount), "RELIEF");
    console.error("Available:", ethers.formatEther(adminBalance), "RELIEF");
    process.exit(1);
  }
  
  // Check current allowance
  const currentAllowance = await token.allowance(signer.address, CAMPAIGN_ADDRESS);
  console.log("Current allowance:", ethers.formatEther(currentAllowance), "RELIEF");
  
  // Approve first
  console.log("Approving OLD tokens...");
  const approveTx = await token.approve(CAMPAIGN_ADDRESS, donateAmount);
  console.log("Approval tx sent:", approveTx.hash);
  
  // Wait for 2 confirmations
  const approveReceipt = await approveTx.wait(2);
  console.log("✅ Approval confirmed at block:", approveReceipt.blockNumber);
  
  // Verify allowance was updated
  const newAllowance = await token.allowance(signer.address, CAMPAIGN_ADDRESS);
  console.log("✅ New allowance verified:", ethers.formatEther(newAllowance), "RELIEF");
  
  if (newAllowance < donateAmount) {
    console.error("❌ CRITICAL: Allowance not updated on-chain!");
    console.error("Expected:", ethers.formatEther(donateAmount), "RELIEF");
    console.error("Actual:", ethers.formatEther(newAllowance), "RELIEF");
    process.exit(1);
  }
  
  // Wait for network to sync
  console.log("Waiting for network to sync...");
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Donate
  console.log("Donating...");
  try {
    const donateTx = await campaign.donate(donateAmount);
    console.log("Donation tx sent:", donateTx.hash);
    
    const donateReceipt = await donateTx.wait(2);
    console.log("✅ Donation confirmed at block:", donateReceipt.blockNumber);
  } catch (error) {
    console.error("❌ DONATION FAILED:");
    console.error("Error:", error.message);
    if (error.reason) console.error("Reason:", error.reason);
    if (error.data) console.error("Data:", error.data);
    process.exit(1);
  }
  
  // Refresh campaign info
  info = await campaign.campaignInfo();
  totalAllocated = await campaign.totalAllocated();
  available = info.raisedAmount - totalAllocated;
  console.log("\nUpdated Campaign State:");
  console.log("Raised:", ethers.formatEther(info.raisedAmount), "RELIEF");
  console.log("Available:", ethers.formatEther(available), "RELIEF");
  
  // Step 2: Allocate funds to beneficiary
  const allocateAmount = ethers.parseEther("200");
  
  console.log("\n📤 Step 2: Allocating", ethers.formatEther(allocateAmount), "RELIEF to beneficiary...");
  
  try {
    const tx = await campaign.allocateFunds(BENEFICIARY, allocateAmount);
    console.log("Transaction hash:", tx.hash);
    await tx.wait();
    console.log("✅ Allocation successful!");
    
    // Get the wallet
    wallet = await campaign.getBeneficiaryWallet(BENEFICIARY);
    console.log("\n🎉 Beneficiary Wallet:", wallet);
    
    // Check balance
    const balance = await token.balanceOf(wallet);
    console.log("Wallet Balance:", ethers.formatEther(balance), "RELIEF");
    
    console.log("\n========== SUCCESS ==========");
    console.log("✅ Beneficiary:", BENEFICIARY);
    console.log("✅ Wallet:", wallet);
    console.log("✅ Balance:", ethers.formatEther(balance), "RELIEF");
    console.log("✅ Campaign:", CAMPAIGN_ADDRESS);
    console.log("✅ Token (OLD):", OLD_TOKEN);
    console.log("===============================");
    
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
