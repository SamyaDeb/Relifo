/**
 * Approve an organizer on the blockchain
 * Usage: node scripts/approveOrganizer.js <organizer-address>
 */

const hre = require("hardhat");

async function main() {
  const organizerAddress = process.env.ORGANIZER_ADDRESS || process.argv[2];
  
  if (!organizerAddress) {
    console.error("❌ Please provide an organizer address");
    console.log("Usage: ORGANIZER_ADDRESS=<address> npx hardhat run scripts/approveOrganizer.js --network amoy");
    console.log("   OR: node scripts/approveOrganizer.js <organizer-address>");
    process.exit(1);
  }

  console.log("\n🔐 Approving Organizer on USDC CampaignFactory");
  console.log("==============================================");
  console.log(`Organizer Address: ${organizerAddress}`);

  // Get deployed CampaignFactory address (NEW USDC-based one)
  const deployments = require("../deployments/amoy.json");
  const factoryAddress = deployments.contracts.CampaignFactory; // This is the USDC factory now
  
  console.log(`CampaignFactory (USDC): ${factoryAddress}`);

  // Get signer (admin)
  const [admin] = await hre.ethers.getSigners();
  console.log(`Admin Address: ${admin.address}\n`);

  // Get CampaignFactory contract
  const CampaignFactory = await hre.ethers.getContractAt(
    "CampaignFactory",
    factoryAddress
  );

  // Check current approval status
  const isAlreadyApproved = await CampaignFactory.isApprovedOrganizer(organizerAddress);
  
  if (isAlreadyApproved) {
    console.log("ℹ️  This organizer is already approved!");
    return;
  }

  console.log("📤 Sending approval transaction...");
  
  // Approve organizer
  const tx = await CampaignFactory.approveOrganizer(organizerAddress);
  console.log(`Transaction Hash: ${tx.hash}`);
  
  console.log("⏳ Waiting for confirmation...");
  await tx.wait();
  
  console.log("\n✅ Organizer Approved Successfully!");
  console.log("==================================");
  console.log(`Address: ${organizerAddress}`);
  console.log(`Transaction: https://amoy.polygonscan.com/tx/${tx.hash}`);
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
