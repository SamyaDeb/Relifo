const hre = require("hardhat");
const { formatEther } = require("viem");

async function main() {
  const campaignAddress = process.argv[2] || "0x4371048766c46aba1c26c40e3ab89155fcf18e88";
  
  console.log("\n🔍 Checking Campaign State...");
  console.log("Campaign Address:", campaignAddress);
  console.log("─".repeat(60));

  const Campaign = await hre.ethers.getContractAt("Campaign", campaignAddress);
  const ReliefToken = await hre.ethers.getContractAt(
    "ReliefToken",
    "0x178C7cC74955a6051Af2411ee38e5061b05382D1"
  );

  // Get campaign info
  const campaignInfo = await Campaign.campaignInfo();
  console.log("\n📋 Campaign Info:");
  console.log("  Title:", campaignInfo.title);
  console.log("  Goal:", formatEther(campaignInfo.goalAmount), "RELIEF");
  console.log("  Raised (on-chain):", formatEther(campaignInfo.raisedAmount), "RELIEF");
  console.log("  Organizer:", campaignInfo.organizer);
  console.log("  Status:", ["Active", "Paused", "Completed", "Cancelled"][campaignInfo.status]);

  // Get total allocated
  const totalAllocated = await Campaign.totalAllocated();
  console.log("\n💸 Allocation Info:");
  console.log("  Total Allocated:", formatEther(totalAllocated), "RELIEF");
  console.log("  Available:", formatEther(campaignInfo.raisedAmount - totalAllocated), "RELIEF");

  // Check actual token balance
  const tokenBalance = await ReliefToken.balanceOf(campaignAddress);
  console.log("\n💰 Token Balance:");
  console.log("  Campaign holds:", formatEther(tokenBalance), "RELIEF tokens");
  
  // Get donations count
  let donationCount = 0;
  try {
    while (true) {
      await Campaign.donations(donationCount);
      donationCount++;
    }
  } catch {
    // Loop exits when index is out of bounds
  }
  
  console.log("\n📊 Donations:");
  console.log("  Total donations:", donationCount);

  console.log("\n" + "─".repeat(60));
  
  // Check if there's a mismatch
  if (tokenBalance < campaignInfo.raisedAmount) {
    console.log("⚠️  WARNING: Token balance is LESS than raised amount!");
    console.log("   This means donations didn't transfer tokens properly.");
  } else if (tokenBalance > campaignInfo.raisedAmount) {
    console.log("⚠️  WARNING: Token balance is MORE than raised amount!");
    console.log("   This is unusual but not necessarily a problem.");
  } else {
    console.log("✅ Token balance matches raised amount - Looking good!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
