const hre = require("hardhat");

async function main() {
  const campaignAddress = process.argv[2];
  
  if (!campaignAddress) {
    console.log("Usage: node scripts/checkCampaignBeneficiaries.js <campaign-address>");
    process.exit(1);
  }

  console.log("🔍 Checking campaign:", campaignAddress);
  
  const Campaign = await hre.ethers.getContractAt("Campaign", campaignAddress);
  
  try {
    // Check if contract has the new functions
    const applied = await Campaign.getAppliedBeneficiaries();
    console.log("\n✅ Applied Beneficiaries:", applied.length);
    
    for (let i = 0; i < applied.length; i++) {
      const addr = applied[i];
      const hasApplied = await Campaign.hasBeneficiaryApplied(addr);
      const isApproved = await Campaign.isBeneficiaryApproved(addr);
      
      console.log(`\n  ${i + 1}. ${addr}`);
      console.log(`     Applied: ${hasApplied}`);
      console.log(`     Approved: ${isApproved}`);
    }
    
    if (applied.length === 0) {
      console.log("\n⚠️ No beneficiaries have applied to this campaign yet.");
    }
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.log("\n⚠️ This campaign may not have the beneficiary approval functions.");
  }
}

main().catch(console.error);
