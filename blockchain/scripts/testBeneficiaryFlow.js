const hre = require("hardhat");
const { formatEther, parseEther } = require("viem");

async function main() {
  // Use the campaign created by organizer
  // You need to replace this with the actual campaign address from Firebase
  const CAMPAIGN = process.env.CAMPAIGN_ADDRESS;
  
  if (!CAMPAIGN) {
    console.log("Usage: CAMPAIGN_ADDRESS=0x... npx hardhat run scripts/testBeneficiaryFlow.js --network amoy");
    return;
  }

  console.log("Testing Campaign:", CAMPAIGN);
  
  const Campaign = await hre.ethers.getContractAt("Campaign", CAMPAIGN);
  
  // Check if getAppliedBeneficiaries exists
  try {
    const applied = await Campaign.getAppliedBeneficiaries();
    console.log("Applied Beneficiaries:", applied);
    console.log("Count:", applied.length);
    
    for (const addr of applied) {
      const isApproved = await Campaign.isBeneficiaryApproved(addr);
      const hasApplied = await Campaign.hasBeneficiaryApplied(addr);
      console.log(`  ${addr}: applied=${hasApplied}, approved=${isApproved}`);
    }
  } catch (e) {
    console.error("Error:", e.message);
    console.log("\n⚠️ This campaign may be using OLD contract without beneficiary approval functions");
  }
}

main().catch(console.error);
