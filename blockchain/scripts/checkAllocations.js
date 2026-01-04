const hre = require("hardhat");
const { formatEther } = require("viem");

async function main() {
  const campaignAddress = process.argv[2] || "0x4371048766c46aba1c26c40e3ab89155fcf18e88";
  
  console.log("\n🔍 Checking Campaign Allocations...");
  console.log("Campaign Address:", campaignAddress);
  console.log("─".repeat(60));

  const Campaign = await hre.ethers.getContractAt("Campaign", campaignAddress);

  // Get total allocated
  const totalAllocated = await Campaign.totalAllocated();
  console.log("\n💸 Total Allocated:", formatEther(totalAllocated), "RELIEF");

  // Get beneficiaries count
  let beneficiaryCount = 0;
  try {
    while (true) {
      await Campaign.beneficiaries(beneficiaryCount);
      beneficiaryCount++;
    }
  } catch {
    // Loop exits when index is out of bounds
  }

  console.log("\n👥 Beneficiaries (" + beneficiaryCount + "):");
  console.log("─".repeat(60));

  for (let i = 0; i < beneficiaryCount; i++) {
    const benefAddress = await Campaign.beneficiaries(i);
    const allocation = await Campaign.beneficiaryAllocations(benefAddress);
    const walletAddress = await Campaign.beneficiaryWallets(benefAddress);
    
    console.log(`\n${i + 1}. Beneficiary: ${benefAddress}`);
    console.log(`   Allocated: ${formatEther(allocation)} RELIEF`);
    console.log(`   Wallet: ${walletAddress}`);
    
    if (walletAddress !== "0x0000000000000000000000000000000000000000") {
      // Check wallet balance
      const ReliefToken = await hre.ethers.getContractAt(
        "ReliefToken",
        "0x178C7cC74955a6051Af2411ee38e5061b05382D1"
      );
      const walletBalance = await ReliefToken.balanceOf(walletAddress);
      console.log(`   Wallet Balance: ${formatEther(walletBalance)} RELIEF`);
    }
  }

  // Get allocations records
  let allocationCount = 0;
  try {
    while (true) {
      await Campaign.allocations(allocationCount);
      allocationCount++;
    }
  } catch {
    // Loop exits when index is out of bounds
  }

  console.log("\n\n📋 Allocation Records (" + allocationCount + "):");
  console.log("─".repeat(60));

  for (let i = 0; i < allocationCount; i++) {
    const allocation = await Campaign.allocations(i);
    console.log(`\n${i + 1}. Beneficiary: ${allocation.beneficiary}`);
    console.log(`   Amount: ${formatEther(allocation.amount)} RELIEF`);
    console.log(`   Timestamp: ${new Date(Number(allocation.timestamp) * 1000).toLocaleString()}`);
    console.log(`   Executed: ${allocation.executed}`);
  }

  console.log("\n" + "─".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
