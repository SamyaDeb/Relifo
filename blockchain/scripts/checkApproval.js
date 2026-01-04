/**
 * Check if an organizer is approved on the blockchain
 * Usage: node scripts/checkApproval.js <organizer-address>
 */

const hre = require("hardhat");

async function main() {
  const organizerAddress = process.env.ORGANIZER_ADDRESS || process.argv[2];
  
  if (!organizerAddress) {
    console.error("❌ Please provide an organizer address");
    console.log("Usage: ORGANIZER_ADDRESS=<address> npx hardhat run scripts/checkApproval.js --network amoy");
    console.log("   OR: node scripts/checkApproval.js <organizer-address>");
    process.exit(1);
  }

  console.log("\n🔍 Checking Organizer Approval Status");
  console.log("=====================================");
  console.log(`Organizer Address: ${organizerAddress}`);

  // Get deployed CampaignFactory address
  const deployments = require("../deployments/amoy.json");
  const factoryAddress = deployments.contracts.CampaignFactory;
  
  console.log(`CampaignFactory: ${factoryAddress}\n`);

  // Get CampaignFactory contract
  const CampaignFactory = await hre.ethers.getContractAt(
    "CampaignFactory",
    factoryAddress
  );

  // Check if organizer is approved
  const isApproved = await CampaignFactory.isApprovedOrganizer(organizerAddress);
  
  console.log("📊 Approval Status:");
  console.log("==================");
  if (isApproved) {
    console.log("✅ APPROVED - This address can create campaigns");
  } else {
    console.log("❌ NOT APPROVED - This address cannot create campaigns");
    console.log("\n💡 To approve this organizer, run:");
    console.log(`   node scripts/approveOrganizer.js ${organizerAddress}`);
  }
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
