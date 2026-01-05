const hre = require("hardhat");
const { formatEther } = require("viem");

async function main() {
  const OLD_TOKEN = "0xc5740EF327ffaDAe587D463DC310023d7feAf119";
  const CAMPAIGN = "0xcda4ec0bfd410539467617b3f943d57be5ea3dbb";
  const BENEFICIARY = "0xC69c2F20D27d9dd12473c27D0691243d4Deed087";
  const NEW_TOKEN = "0x2e3f557A6De6dFb63aB583991Ec77E3270d1D20e";

  console.log("=".repeat(60));
  console.log("BENEFICIARY VERIFICATION");
  console.log("=".repeat(60));

  const Campaign = await hre.ethers.getContractAt("Campaign", CAMPAIGN);
  const OldToken = await hre.ethers.getContractAt("ReliefToken", OLD_TOKEN);
  const NewToken = await hre.ethers.getContractAt("ReliefToken", NEW_TOKEN);

  // Get beneficiary wallet
  const walletAddress = await Campaign.getBeneficiaryWallet(BENEFICIARY);
  console.log("\n💼 Beneficiary Wallet:", walletAddress);

  if (walletAddress !== "0x0000000000000000000000000000000000000000") {
    // Check wallet balance with OLD token
    const oldBalance = await OldToken.balanceOf(walletAddress);
    console.log("💰 OLD Token Balance:", formatEther(oldBalance), "RELIEF");

    // Check wallet balance with NEW token
    const newBalance = await NewToken.balanceOf(walletAddress);
    console.log("💰 NEW Token Balance:", formatEther(newBalance), "RELIEF");

    // Get campaign info
    const info = await Campaign.campaignInfo();
    console.log("\n📊 Campaign Info:");
    console.log("  - Title:", info[0]);
    console.log("  - Raised:", formatEther(info[3]), "RELIEF");
    console.log("  - Status:", info[4].toString());
    
    const totalAllocated = await Campaign.totalAllocated();
    console.log("  - Total Allocated:", formatEther(totalAllocated), "RELIEF");
    
    const available = BigInt(info[3]) - BigInt(totalAllocated);
    console.log("  - Available:", formatEther(available), "RELIEF");

    console.log("\n✅ BENEFICIARY STATUS:");
    console.log("  Address:", BENEFICIARY);
    console.log("  Wallet:", walletAddress);
    console.log("  Balance:", formatEther(oldBalance), "RELIEF");
    console.log("=".repeat(60));
  } else {
    console.log("❌ No beneficiary wallet created yet!");
  }
}

main().catch(console.error);
