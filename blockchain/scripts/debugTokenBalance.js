const hre = require("hardhat");
const { formatEther } = require("viem");

async function main() {
  const campaignAddress = "0x4371048766c46aba1c26c40e3ab89155fcf18e88";
  const reliefTokenAddress = "0x178C7cC74955a6051Af2411ee38e5061b05382D1";
  
  console.log("\n🔍 Debugging Campaign Token Balance Issue...");
  console.log("─".repeat(60));

  const Campaign = await hre.ethers.getContractAt("Campaign", campaignAddress);
  const ReliefToken = await hre.ethers.getContractAt("ReliefToken", reliefTokenAddress);

  // Get campaign info
  const campaignInfo = await Campaign.campaignInfo();
  console.log("\n📊 Campaign State:");
  console.log("  Raised Amount (counter): ", formatEther(campaignInfo.raisedAmount), "RELIEF");
  
  const totalAllocated = await Campaign.totalAllocated();
  console.log("  Total Allocated:", formatEther(totalAllocated), "RELIEF");
  console.log("  Should Have:", formatEther(campaignInfo.raisedAmount - totalAllocated), "RELIEF");

  // Check actual balance
  const actualBalance = await ReliefToken.balanceOf(campaignAddress);
  console.log("\n💰 Actual Token Balance:");
  console.log("  Campaign holds:", formatEther(actualBalance), "RELIEF");
  
  const discrepancy = campaignInfo.raisedAmount - totalAllocated - actualBalance;
  console.log("\n🚨 Discrepancy:");
  console.log("  Missing:", formatEther(discrepancy), "RELIEF");

  // Get donation record
  const donation = await Campaign.donations(0);
  console.log("\n📝 Donation Record:");
  console.log("  Donor:", donation.donor);
  console.log("  Amount (recorded):", formatEther(donation.amount), "RELIEF");
  console.log("  Timestamp:", new Date(Number(donation.timestamp) * 1000).toLocaleString());

  // Check if donor had approved enough
  console.log("\n🔐 Checking what went wrong...");
  console.log("  The campaign contract incremented raisedAmount by:", formatEther(donation.amount));
  console.log("  But only received:", formatEther(actualBalance + totalAllocated), "RELIEF");
  console.log("\n  This means the transferFrom in donate() function partially failed or");
  console.log("  the donor didn't approve the full amount before donating.");

  // Solution
  console.log("\n✅ Solution:");
  console.log("  You need to donate", formatEther(discrepancy), "more RELIEF to fix this.");
  console.log("  Or allocate only", formatEther(actualBalance), "RELIEF total (you've already allocated", formatEther(totalAllocated) + ").");
  console.log("\n  Available to allocate now:", formatEther(actualBalance), "RELIEF");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
