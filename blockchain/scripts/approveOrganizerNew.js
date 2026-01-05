const hre = require("hardhat");

async function main() {
  const FACTORY = "0xD6A5180E93C5838E62c9C0E5aBcE9040f3aad71D"; // New factory
  const ORGANIZER = "0xe4E6f890f04A077d39A8C4a1CB7D59Ac6825e76A";

  console.log("Approving organizer on NEW CampaignFactory...");
  
  const factory = await hre.ethers.getContractAt("CampaignFactory", FACTORY);
  
  // Check if already approved
  const isApproved = await factory.approvedOrganizers(ORGANIZER);
  if (isApproved) {
    console.log("✅ Organizer already approved!");
    return;
  }

  const tx = await factory.approveOrganizer(ORGANIZER);
  await tx.wait();
  
  console.log("✅ Organizer approved!");
  console.log("TX:", tx.hash);
}

main().catch(console.error);
